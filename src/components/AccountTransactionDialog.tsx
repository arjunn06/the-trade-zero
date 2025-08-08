import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface AccountTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
  currency: string;
  onTransactionAdded: () => void;
}

export const AccountTransactionDialog = ({
  open,
  onOpenChange,
  accountId,
  accountName,
  currency,
  onTransactionAdded
}: AccountTransactionDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    transaction_type: '',
    amount: '',
    description: '',
    transaction_date: new Date()
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('account_transactions')
        .insert([{
          user_id: user.id,
          trading_account_id: accountId,
          transaction_type: formData.transaction_type,
          amount: parseFloat(formData.amount),
          description: formData.description || null,
          transaction_date: formData.transaction_date.toISOString()
        }]);

      if (error) throw error;

      // Update the trading account's current balance
      const amountChange = formData.transaction_type === 'deposit' 
        ? parseFloat(formData.amount) 
        : -parseFloat(formData.amount);

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
        description: `${formData.transaction_type === 'deposit' ? 'Deposit' : 'Withdrawal'} recorded successfully`
      });

      onTransactionAdded();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error recording transaction:', error);
      toast({
        title: "Error",
        description: "Failed to record transaction",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      transaction_type: '',
      amount: '',
      description: '',
      transaction_date: new Date()
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {formData.transaction_type === 'deposit' ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : formData.transaction_type === 'withdrawal' ? (
              <TrendingDown className="h-5 w-5 text-red-600" />
            ) : null}
            Record Transaction
          </DialogTitle>
          <DialogDescription>
            Add a deposit or withdrawal for {accountName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="transaction_type">Transaction Type</Label>
            <Select 
              value={formData.transaction_type} 
              onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit" className="text-green-600">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Deposit
                  </div>
                </SelectItem>
                <SelectItem value="withdrawal" className="text-red-600">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Withdrawal
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Amount ({currency})</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Transaction Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.transaction_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.transaction_date ? (
                    format(formData.transaction_date, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.transaction_date}
                  onSelect={(date) => date && setFormData({ ...formData, transaction_date: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add a note about this transaction..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.transaction_type || !formData.amount}
              className="flex-1"
            >
              {loading ? 'Recording...' : 'Record Transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};