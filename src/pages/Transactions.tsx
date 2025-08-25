import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, TrendingUp, TrendingDown, Building2, Trash2 } from 'lucide-react';
import { FinancialTransactionDialog } from '@/components/FinancialTransactionDialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { format } from 'date-fns';

interface FinancialTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string | null;
  transaction_date: string;
  created_at: string;
  trading_account_id: string | null;
  trading_accounts?: {
    name: string;
    currency: string;
  } | null;
}

interface TransactionMetrics {
  totalDeposits: number;
  totalWithdrawals: number;
  totalPropFirmSpend: number;
  totalPayouts: number;
  netFlow: number;
}

const transactionTypes = [
  { value: 'deposit', label: 'Deposit', icon: TrendingUp, color: 'text-green-600' },
  { value: 'withdrawal', label: 'Withdrawal', icon: TrendingDown, color: 'text-red-600' },
  { value: 'evaluation_fee', label: 'Evaluation Fee', icon: Building2, color: 'text-purple-600' },
  { value: 'payout', label: 'Payout', icon: DollarSign, color: 'text-emerald-600' },
  { value: 'commission', label: 'Commission', icon: DollarSign, color: 'text-yellow-600' },
  { value: 'other', label: 'Other', icon: DollarSign, color: 'text-gray-600' },
];

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<TransactionMetrics>({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalPropFirmSpend: 0,
    totalPayouts: 0,
    netFlow: 0,
  });

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          trading_accounts (
            name,
            currency
          )
        `)
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
      calculateMetrics(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (transactions: FinancialTransaction[]) => {
    const metrics = {
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalPropFirmSpend: 0,
      totalPayouts: 0,
      netFlow: 0,
    };

    transactions.forEach(transaction => {
      const amount = Number(transaction.amount);
      
      switch (transaction.transaction_type) {
        case 'deposit':
          metrics.totalDeposits += amount;
          break;
        case 'withdrawal':
          metrics.totalWithdrawals += amount;
          break;
        case 'evaluation_fee':
          metrics.totalPropFirmSpend += amount;
          break;
        case 'payout':
          metrics.totalPayouts += amount;
          break;
      }
    });

    metrics.netFlow = metrics.totalDeposits + metrics.totalPayouts - metrics.totalWithdrawals - metrics.totalPropFirmSpend;
    setMetrics(metrics);
  };

  const handleDelete = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;

      setTransactions(transactions.filter(t => t.id !== transactionId));
      calculateMetrics(transactions.filter(t => t.id !== transactionId));
      
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getTransactionTitle = (transaction: FinancialTransaction) => {
    const typeInfo = getTransactionTypeInfo(transaction.transaction_type);
    const accountName = transaction.trading_accounts?.name || 'No Account';
    
    // Create transaction title with proper preposition
    const preposition = ['deposit', 'payout'].includes(transaction.transaction_type) ? 'to' : 'from';
    
    return `${typeInfo.label} ${preposition} ${accountName}`;
  };

  const getTransactionTypeInfo = (type: string) => {
    return transactionTypes.find(t => t.value === type) || transactionTypes[transactionTypes.length - 1];
  };

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Transactions</h1>
            <p className="text-muted-foreground">
              Manage your financial transactions and track your trading expenses
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Transaction
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics.totalDeposits)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(metrics.totalWithdrawals)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prop Firm Spend</CardTitle>
              <Building2 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(metrics.totalPropFirmSpend)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(metrics.totalPayouts)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Flow</CardTitle>
              <TrendingUp className={`h-4 w-4 ${metrics.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metrics.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(metrics.netFlow)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              Your complete financial transaction history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading transactions...
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found. Click "New Transaction" to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => {
                  const typeInfo = getTransactionTypeInfo(transaction.transaction_type);
                  const IconComponent = typeInfo.icon;
                  const currency = transaction.trading_accounts?.currency || 'USD';

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full bg-muted ${typeInfo.color}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                         <div>
                           <div className="flex items-center space-x-2">
                             <p className="font-medium">{getTransactionTitle(transaction)}</p>
                             <Badge variant="outline">
                               {formatCurrency(Number(transaction.amount), currency)}
                             </Badge>
                           </div>
                           <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                             <span>{format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}</span>
                           </div>
                          {transaction.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {transaction.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTransactionToDelete(transaction.id);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <FinancialTransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onTransactionAdded={fetchTransactions}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => {
          if (transactionToDelete) {
            handleDelete(transactionToDelete);
            setTransactionToDelete(null);
          }
        }}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </DashboardLayout>
  );
}