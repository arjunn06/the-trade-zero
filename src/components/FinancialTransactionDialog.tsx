import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Receipt, DollarSign, CreditCard, Award, Building2, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface FinancialTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId?: string;
  accountName?: string;
  currency?: string;
  onTransactionAdded?: () => void;
}

export const FinancialTransactionDialog = ({
  open,
  onOpenChange,
  accountId,
  accountName,
  currency = 'USD',
  onTransactionAdded
}: FinancialTransactionDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tradingAccounts, setTradingAccounts] = useState<Array<{ id: string; name: string; currency: string }>>([]);
  const [formData, setFormData] = useState({
    transaction_type: '',
    amount: '',
    description: '',
    transaction_date: new Date(),
    trading_account_id: accountId || '',
  });

  const transactionTypes = [
    { value: 'deposit', label: 'Deposit', icon: DollarSign, color: 'text-green-600' },
    { value: 'withdrawal', label: 'Withdrawal', icon: DollarSign, color: 'text-red-600' },
    { value: 'prop_firm_challenge', label: 'Prop Firm Challenge', icon: CreditCard, color: 'text-blue-600' },
    { value: 'prop_firm_evaluation', label: 'Prop Firm Evaluation', icon: Award, color: 'text-purple-600' },
    { value: 'prop_firm_funded', label: 'Prop Firm Funded Account', icon: Building2, color: 'text-orange-600' },
    { value: 'payout', label: 'Payout', icon: DollarSign, color: 'text-emerald-600' },
    { value: 'commission', label: 'Commission', icon: DollarSign, color: 'text-yellow-600' },
    { value: 'other', label: 'Other', icon: DollarSign, color: 'text-gray-600' },
  ];

  const fetchTradingAccounts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('trading_accounts')
        .select('id, name, currency')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTradingAccounts(data || []);
    } catch (error) {
      console.error('Error fetching trading accounts:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTradingAccounts();
      setFormData({
        transaction_type: '',
        amount: '',
        description: '',
        transaction_date: new Date(),
        trading_account_id: accountId || '',
      });
    }
  }, [open, accountId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .insert([{
          user_id: user.id,
          trading_account_id: formData.trading_account_id || null,
          transaction_type: formData.transaction_type,
          amount: parseFloat(formData.amount),
          description: formData.description || null,
          transaction_date: formData.transaction_date.toISOString()
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${transactionTypes.find(t => t.value === formData.transaction_type)?.label} recorded successfully`
      });

      if (onTransactionAdded) {
        onTransactionAdded();
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error recording financial transaction:', error);
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
      transaction_date: new Date(),
      trading_account_id: accountId || '',
    });
  };

  const selectedType = transactionTypes.find(t => t.value === formData.transaction_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedType ? (
              <selectedType.icon className={`h-5 w-5 ${selectedType.color}`} />
            ) : (
              <Receipt className="h-5 w-5" />
            )}
            Financial Transaction
          </DialogTitle>
          <DialogDescription>
            {accountName ? `Record financial expenses for ${accountName}` : 'Record a financial transaction'}
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
                {transactionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value} className={type.color}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!accountId && (
            <div>
              <Label htmlFor="trading_account">Trading Account (Optional)</Label>
              <Select
                value={formData.trading_account_id}
                onValueChange={(value) => setFormData({ ...formData, trading_account_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Account</SelectItem>
                  {tradingAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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