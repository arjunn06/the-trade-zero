import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Receipt, DollarSign, CreditCard, Award } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface FinancialTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
  currency: string;
  onTransactionAdded: () => void;
}

export const FinancialTransactionDialog = ({
  open,
  onOpenChange,
  accountId,
  accountName,
  currency,
  onTransactionAdded
}: FinancialTransactionDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    transaction_type: '',
    amount: '',
    description: '',
    transaction_date: new Date()
  });

  const transactionTypes = [
    { value: 'challenge_fee', label: 'Challenge Fee', icon: CreditCard, color: 'text-orange-600' },
    { value: 'evaluation_fee', label: 'Evaluation Fee', icon: Award, color: 'text-blue-600' },
    { value: 'funded_account_fee', label: 'Funded Account Fee', icon: Receipt, color: 'text-green-600' },
    { value: 'deposit', label: 'Deposit', icon: DollarSign, color: 'text-green-600' },
    { value: 'withdrawal', label: 'Withdrawal', icon: DollarSign, color: 'text-red-600' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .insert([{
          user_id: user.id,
          trading_account_id: accountId,
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

      onTransactionAdded();
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
      transaction_date: new Date()
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
            Record financial expenses for {accountName}
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