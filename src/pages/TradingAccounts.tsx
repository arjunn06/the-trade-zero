import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, Edit, Trash2, DollarSign, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useSubscription } from '@/hooks/useSubscription';
import { PremiumFeature } from '@/components/PremiumFeature';
import { CsvImportSection } from '@/components/CsvImportSection';
import { CTraderIntegration } from '@/components/CTraderIntegration';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useUndoToast } from '@/components/UndoToast';
import { AccountTransactionDialog } from '@/components/AccountTransactionDialog';
import { AccountTransactionHistory } from '@/components/AccountTransactionHistory';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TradingAccount {
  id: string;
  name: string;
  account_type: string;
  broker: string;
  initial_balance: number;
  current_balance: number;
  current_equity: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  equity_goal?: number;
}

const TradingAccounts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { showUndoToast } = useUndoToast();
  const { isPremium } = useSubscription();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<TradingAccount | null>(null);
  const [accountEquities, setAccountEquities] = useState<Record<string, number>>({});
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    account_type: '',
    broker: '',
    initial_balance: '',
    currency: 'USD',
    equity_goal: '',
    use_ctrader: false
  });

  // Premium limits for basic users
  const BASIC_ACCOUNT_LIMIT = 1;

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  // Listen for account refresh messages from child components
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'refresh-accounts') {
        fetchAccounts();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchAccounts = async () => {
    if (!user) return;

    try {
      const [accountsResult, tradesResult, transactionsResult] = await Promise.all([
        supabase
          .from('trading_accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('trades')
          .select('trading_account_id, pnl')
          .eq('user_id', user.id)
          .not('pnl', 'is', null),
        supabase
          .from('account_transactions')
          .select('trading_account_id, amount, transaction_type')
          .eq('user_id', user.id)
      ]);

      if (accountsResult.error) throw accountsResult.error;
      if (tradesResult.error) throw tradesResult.error;
      if (transactionsResult.error) throw transactionsResult.error;

      const accounts = accountsResult.data || [];
      const trades = tradesResult.data || [];
      const transactions = transactionsResult.data || [];

      // Calculate equity for each account including transactions
      const equities: Record<string, number> = {};
      accounts.forEach(account => {
        const accountTrades = trades.filter(trade => trade.trading_account_id === account.id);
        const totalPnl = accountTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
        
        const accountTransactions = transactions.filter(tx => tx.trading_account_id === account.id);
        const totalTransactions = accountTransactions.reduce((sum, tx) => {
          return sum + (tx.transaction_type === 'deposit' ? tx.amount : -tx.amount);
        }, 0);
        
        equities[account.id] = account.current_balance + totalPnl;
      });

      setAccounts(accounts);
      setAccountEquities(equities);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch trading accounts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const accountData = {
        name: formData.name,
        account_type: formData.account_type,
        broker: formData.use_ctrader ? 'cTrader' : formData.broker,
        initial_balance: formData.use_ctrader ? 0 : parseFloat(formData.initial_balance),
        current_balance: formData.use_ctrader ? 0 : parseFloat(formData.initial_balance),
        current_equity: formData.use_ctrader ? 0 : parseFloat(formData.initial_balance),
        currency: formData.currency,
        equity_goal: formData.equity_goal ? parseFloat(formData.equity_goal) : null,
        user_id: user.id
      };

      if (editingAccount) {
        const updateData = {
          ...accountData,
          is_active: editingAccount.is_active
        };
        const { error } = await supabase
          .from('trading_accounts')
          .update(updateData)
          .eq('id', editingAccount.id);

        if (error) throw error;
        toast({ title: "Success", description: "Account updated successfully" });
      } else {
        // Create the account first
        const { data: newAccount, error } = await supabase
          .from('trading_accounts')
          .insert([accountData])
          .select()
          .single();

        if (error) throw error;

        // If cTrader integration is enabled, initiate OAuth flow immediately
        if (formData.use_ctrader && newAccount) {
          try {
            // Get current session for authentication
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
              throw new Error('No valid authentication session found');
            }

            const { data: authData, error: authError } = await supabase.functions.invoke('ctrader-auth', {
              body: {
                tradingAccountId: newAccount.id,
              },
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });

            if (authError) throw authError;

            if (authData?.authUrl) {
              // Store the new account ID for after OAuth completes
              sessionStorage.setItem('ctrader_pending_account', newAccount.id);
              
              // Open OAuth URL in new window
              const authWindow = window.open(authData.authUrl, 'ctrader-auth', 'width=600,height=700');
              
              toast({
                title: "Account Created - Connecting to cTrader",
                description: "Please complete the authentication to import your trading data",
              });

              // Listen for window close to refresh data
              const checkClosed = setInterval(() => {
                if (authWindow?.closed) {
                  clearInterval(checkClosed);
                  setTimeout(async () => {
                    // Refresh the accounts list - initial sync should already be triggered by callback
                    fetchAccounts();
                    
                    // Show sync completion message
                    toast({
                      title: "Connection Successful",
                      description: "Your cTrader account is connected and data is being imported. This may take a few moments.",
                    });
                  }, 2000);
                }
              }, 1000);
            }
          } catch (ctraderError) {
            console.error('cTrader integration failed:', ctraderError);
            toast({
              title: "Account Created",
              description: "Account created but cTrader integration failed. You can connect later.",
              variant: "default"
            });
          }
        } else {
          toast({ title: "Success", description: "Account created successfully" });
        }
      }

      setDialogOpen(false);
      setEditingAccount(null);
      resetForm();
      if (!formData.use_ctrader) {
        fetchAccounts();
      }
    } catch (error) {
      console.error('Error saving account:', error);
      toast({
        title: "Error",
        description: "Failed to save account",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (account: TradingAccount) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      account_type: account.account_type,
      broker: account.broker || '',
      initial_balance: account.initial_balance.toString(),
      currency: account.currency,
      equity_goal: (account as any).equity_goal?.toString() || '',
      use_ctrader: false
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (account: TradingAccount) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;

    const deletedAccount = { ...accountToDelete };
    
    try {
      const { error } = await supabase
        .from('trading_accounts')
        .delete()
        .eq('id', accountToDelete.id);

      if (error) throw error;
      
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
      fetchAccounts();

      // Show undo toast
      showUndoToast({
        message: `Account "${deletedAccount.name}" deleted`,
        onUndo: () => handleUndoDelete(deletedAccount)
      });
      
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive"
      });
    }
  };

  const handleUndoDelete = async (account: TradingAccount) => {
    if (!user) return;
    
    try {
      const { id, created_at, ...accountData } = account;
      const restoreData = {
        ...accountData,
        user_id: user.id
      };
      
      const { error } = await supabase
        .from('trading_accounts')
        .insert([restoreData]);

      if (error) throw error;
      
      toast({ 
        title: "Restored", 
        description: `Account "${account.name}" has been restored` 
      });
      fetchAccounts();
    } catch (error) {
      console.error('Error restoring account:', error);
      toast({
        title: "Error",
        description: "Failed to restore account",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      account_type: '',
      broker: '',
      initial_balance: '',
      currency: 'USD',
      equity_goal: '',
      use_ctrader: false
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (loading) {
    return <div>Loading accounts...</div>;
  }

  // Check if basic user has exceeded account limit
  const hasExceededLimit = !isPremium && accounts.length >= BASIC_ACCOUNT_LIMIT;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Trading Accounts</h1>
            <p className="text-muted-foreground">Manage your trading accounts and track balances</p>
          </div>
          {hasExceededLimit ? (
            <PremiumFeature
              feature="Multiple Trading Accounts"
              description="Basic users can track 1 account. Upgrade to premium for unlimited accounts."
              showUpgrade={false}
              fallback={
                <Button disabled variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Upgrade for More Accounts
                </Button>
              }
            />
          ) : (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingAccount(null); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Edit' : 'Add'} Trading Account</DialogTitle>
              <DialogDescription>
                {editingAccount ? 'Update' : 'Create'} your trading account details
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[calc(90vh-8rem)] overflow-y-auto pr-2">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Account Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="account_type">Account Type</Label>
                  <Select value={formData.account_type} onValueChange={(value) => setFormData({ ...formData, account_type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="demo">Demo</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="prop firm">Prop Firm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {!editingAccount && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="use_ctrader"
                        checked={formData.use_ctrader}
                        onCheckedChange={(checked) => setFormData({ ...formData, use_ctrader: !!checked })}
                      />
                      <Label htmlFor="use_ctrader" className="flex items-center gap-2">
                        <img 
                          src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/CTrader_logo.svg/120px-CTrader_logo.svg.png" 
                          alt="cTrader" 
                          className="w-5 h-5"
                        />
                        Connect cTrader Account Instead
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Connect directly to your cTrader account to automatically import trades, balances, and positions.
                    </p>
                  </div>
                )}
                
                {!formData.use_ctrader && (
                  <>
                    <div>
                      <Label htmlFor="broker">Broker</Label>
                      <Input
                        id="broker"
                        value={formData.broker}
                        onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                      />
                    </div>
                  </>
                )}
                
                {!formData.use_ctrader && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="initial_balance">Initial Balance</Label>
                      <Input
                        id="initial_balance"
                        type="number"
                        step="0.01"
                        value={formData.initial_balance}
                        onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="JPY">JPY</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {formData.use_ctrader && (
                  <div className="border rounded-lg p-4 bg-primary/5">
                    <h4 className="font-medium mb-2">cTrader Integration</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Account details will be automatically imported</li>
                      <li>• Trading history will be synced in real-time</li>
                      <li>• Balance and equity will be updated automatically</li>
                      <li>• All positions and trades will be tracked</li>
                    </ul>
                  </div>
                )}

                <div>
                  <Label htmlFor="equity_goal">Profit Goal (Optional)</Label>
                  <Input
                    id="equity_goal"
                    type="number"
                    step="0.01"
                    placeholder="Target profit goal"
                    value={formData.equity_goal}
                    onChange={(e) => setFormData({ ...formData, equity_goal: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Set a target profit goal to track your progress
                  </p>
                 </div>

                 {editingAccount && (
                   <div className="flex items-center justify-between p-4 border rounded-lg">
                     <div>
                       <Label htmlFor="is_active">Account Status</Label>
                       <p className="text-sm text-muted-foreground">
                         Inactive accounts are hidden from trade entry but statistics remain viewable
                       </p>
                     </div>
                     <div className="flex items-center space-x-2">
                       <span className="text-sm text-muted-foreground">Inactive</span>
                       <Switch
                         id="is_active"
                         checked={editingAccount.is_active}
                         onCheckedChange={(checked) => setEditingAccount({ ...editingAccount, is_active: checked })}
                       />
                       <span className="text-sm text-muted-foreground">Active</span>
                     </div>
                   </div>
                 )}
                 
                  
                   {/* CSV Import Section - only show for existing accounts */}
                   {editingAccount && (
                    <div className="pt-4 border-t space-y-4">
                      <div>
                        <h3 className="text-sm font-medium mb-3">CSV Import</h3>
                        <CsvImportSection 
                          accountId={editingAccount.id} 
                          compact={true}
                          onImportComplete={() => {
                            toast({
                              title: "Import complete",
                              description: "Trades have been imported to this account"
                            });
                          }}
                        />
                      </div>
                      
                      {/* cTrader Integration for existing account */}
                      <div className="border-t pt-4">
                        <h3 className="text-sm font-medium mb-3">cTrader Integration</h3>
                        <CTraderIntegration
                          accountId={editingAccount.id}
                          accountName={editingAccount.name}
                        />
                      </div>
                    </div>
                  )}
                  
                <div className="sticky bottom-0 bg-background pt-4 border-t mt-6">
                  <Button type="submit" className="w-full">
                    {editingAccount ? 'Update' : 'Create'} Account
                  </Button>
                </div>
              </form>
            </div>
            </DialogContent>
          </Dialog>
          )}
        </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No trading accounts yet</h3>
              <p className="text-muted-foreground mb-6">Choose how you'd like to add your first trading account</p>
              {hasExceededLimit ? (
                <PremiumFeature
                  feature="Multiple Trading Accounts"
                  description="Upgrade to premium to track unlimited trading accounts."
                />
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
                  <Button 
                    onClick={() => setDialogOpen(true)}
                    className="w-full sm:w-auto"
                    size="lg"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Manual Account
                  </Button>
                  <div className="text-muted-foreground text-sm">or</div>
                  <CTraderIntegration
                    accountId=""
                    accountName="First Account"
                    isFirstAccount={true}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {accounts.map((account) => (
             <Card key={account.id} className={!account.is_active ? 'opacity-60' : ''}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">{account.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    {account.is_active && <Badge variant="default">Active</Badge>}
                    {!isPremium && accounts.length >= BASIC_ACCOUNT_LIMIT && (
                      <Badge variant="outline" className="text-xs">
                        Limit Reached
                      </Badge>
                    )}
                  </div>
                </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Badge variant={account.account_type === 'live' ? 'default' : 'secondary'}>
                    {account.account_type.toUpperCase()}
                  </Badge>
                  {account.broker && (
                    <Badge variant="outline">
                      {account.broker}
                    </Badge>
                  )}
                </div>
                 <div className="space-y-2">
                   <div className="flex justify-between">
                     <span className="text-sm text-muted-foreground">Initial Balance</span>
                     <span className="font-medium">{formatCurrency(account.initial_balance, account.currency)}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-sm text-muted-foreground">Current Equity</span>
                     <span className="font-medium">{formatCurrency(accountEquities[account.id] || account.initial_balance, account.currency)}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-sm text-muted-foreground">P&L</span>
                     <span className={`font-medium ${(accountEquities[account.id] || account.initial_balance) - account.initial_balance >= 0 ? 'text-profit' : 'text-loss'}`}>
                       {formatCurrency((accountEquities[account.id] || account.initial_balance) - account.initial_balance, account.currency)}
                     </span>
                   </div>
                 </div>
                  <div className="flex flex-col gap-2 pt-2 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => navigate(`/account-performance/${account.id}`)}
                      size="sm"
                      className="w-full"
                    >
                      Account Performance
                    </Button>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setSelectedAccount(account);
                          setTransactionDialogOpen(true);
                        }}
                        className="flex-1"
                        title="Add Transaction"
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setSelectedAccount(account);
                          setHistoryDialogOpen(true);
                        }}
                        className="flex-1"
                        title="Transaction History"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(account)} className="flex-1">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(account)} className="flex-1">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Trading Account"
        description={`Are you sure you want to delete "${accountToDelete?.name}"? This action will remove the account and all associated data.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />

      {selectedAccount && (
        <>
          <AccountTransactionDialog
            open={transactionDialogOpen}
            onOpenChange={setTransactionDialogOpen}
            accountId={selectedAccount.id}
            accountName={selectedAccount.name}
            currency={selectedAccount.currency}
            onTransactionAdded={fetchAccounts}
          />
          
          <AccountTransactionHistory
            open={historyDialogOpen}
            onOpenChange={setHistoryDialogOpen}
            accountId={selectedAccount.id}
            accountName={selectedAccount.name}
            currency={selectedAccount.currency}
            onTransactionDeleted={fetchAccounts}
          />
        </>
      )}

      </div>
    </DashboardLayout>
  );
};

export default TradingAccounts;