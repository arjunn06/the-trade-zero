import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, TrendingUp, TrendingDown, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  transaction_type: 'deposit' | 'withdrawal';
  amount: number;
  description: string | null;
  transaction_date: string;
  created_at: string;
}

interface AccountTransactionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
  currency: string;
  onTransactionDeleted: () => void;
}

export const AccountTransactionHistory = ({
  open,
  onOpenChange,
  accountId,
  accountName,
  currency,
  onTransactionDeleted
}: AccountTransactionHistoryProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && accountId) {
      fetchTransactions();
    }
  }, [open, accountId]);

  const fetchTransactions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('trading_account_id', accountId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions((data || []) as Transaction[]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transaction history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string, amount: number, transactionType: string) => {
    try {
      const { error } = await supabase
        .from('account_transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;

      // Reverse the balance change
      const amountChange = transactionType === 'deposit' ? -amount : amount;
      
      const { data: currentAccount } = await supabase
        .from('trading_accounts')
        .select('current_balance')
        .eq('id', accountId)
        .single();

      if (currentAccount) {
        const newBalance = currentAccount.current_balance + amountChange;
        await supabase
          .from('trading_accounts')
          .update({ current_balance: newBalance })
          .eq('id', accountId);
      }

      toast({
        title: "Success",
        description: "Transaction deleted successfully"
      });

      fetchTransactions();
      onTransactionDeleted();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </DialogTitle>
          <DialogDescription>
            Deposit and withdrawal history for {accountName}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions recorded yet
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-3">
                    {transaction.transaction_type === 'deposit' ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={transaction.transaction_type === 'deposit' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {transaction.transaction_type}
                        </Badge>
                        <span className="font-medium">
                          {formatCurrency(transaction.amount)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(transaction.transaction_date), 'PPP')}
                      </div>
                      {transaction.description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {transaction.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTransaction(
                      transaction.id,
                      transaction.amount,
                      transaction.transaction_type
                    )}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};