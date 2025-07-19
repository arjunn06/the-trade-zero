import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useSubscription } from '@/hooks/useSubscription';
import { PremiumFeature } from '@/components/PremiumFeature';
import { TradeCsvManager } from '@/components/TradeCsvManager';
import { CTraderIntegration } from '@/components/CTraderIntegration';
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
}

const TradingAccounts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPremium } = useSubscription();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    account_type: '',
    broker: '',
    initial_balance: '',
    current_balance: '',
    current_equity: '',
    currency: 'USD'
  });

  // Premium limits for basic users
  const BASIC_ACCOUNT_LIMIT = 1;

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  const fetchAccounts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('trading_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
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
        broker: formData.broker,
        initial_balance: parseFloat(formData.initial_balance),
        current_balance: parseFloat(formData.current_balance),
        current_equity: parseFloat(formData.current_equity),
        currency: formData.currency,
        user_id: user.id
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('trading_accounts')
          .update(accountData)
          .eq('id', editingAccount.id);

        if (error) throw error;
        toast({ title: "Success", description: "Account updated successfully" });
      } else {
        const { error } = await supabase
          .from('trading_accounts')
          .insert([accountData]);

        if (error) throw error;
        toast({ title: "Success", description: "Account created successfully" });
      }

      setDialogOpen(false);
      setEditingAccount(null);
      resetForm();
      fetchAccounts();
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
      current_balance: account.current_balance.toString(),
      current_equity: account.current_equity.toString(),
      currency: account.currency
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('trading_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Account deleted successfully" });
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account",
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
      current_balance: '',
      current_equity: '',
      currency: 'USD'
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Edit' : 'Add'} Trading Account</DialogTitle>
              <DialogDescription>
                {editingAccount ? 'Update' : 'Create'} your trading account details
              </DialogDescription>
            </DialogHeader>
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
                    <SelectItem value="prop">Prop Firm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="broker">Broker</Label>
                <Input
                  id="broker"
                  value={formData.broker}
                  onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="current_balance">Current Balance</Label>
                  <Input
                    id="current_balance"
                    type="number"
                    step="0.01"
                    value={formData.current_balance}
                    onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="current_equity">Current Equity</Label>
                  <Input
                    id="current_equity"
                    type="number"
                    step="0.01"
                    value={formData.current_equity}
                    onChange={(e) => setFormData({ ...formData, current_equity: e.target.value })}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editingAccount ? 'Update' : 'Create'} Account
              </Button>
            </form>
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
              <p className="text-muted-foreground mb-4">Add your first trading account to start tracking</p>
              {hasExceededLimit ? (
                <PremiumFeature
                  feature="Multiple Trading Accounts"
                  description="Upgrade to premium to track unlimited trading accounts."
                />
              ) : (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Account
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <span className="text-sm text-muted-foreground">Current Balance</span>
                    <span className="font-medium">{formatCurrency(account.current_balance, account.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Current Equity</span>
                    <span className="font-medium">{formatCurrency(account.current_equity, account.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">P&L</span>
                    <span className={`font-medium ${account.current_balance - account.initial_balance >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {formatCurrency(account.current_balance - account.initial_balance, account.currency)}
                    </span>
                  </div>
                </div>
                  <div className="flex justify-between pt-2 border-t">
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(account)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(account.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
          ))}
        </div>
      )}

      {/* CSV Import/Export and cTrader Integration Section - Premium Features */}
      {accounts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Trade Management</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {accounts.map((account) => (
              <div key={account.id} className="space-y-4">
                <TradeCsvManager
                  accountId={account.id}
                  accountName={account.name}
                />
                <CTraderIntegration
                  accountId={account.id}
                  accountName={account.name}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
};

export default TradingAccounts;