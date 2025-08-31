import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { BarChart3, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: any[];
  onViewComparison: (comparisonData: ComparisonData) => void;
}

interface ComparisonData {
  compareAcross: 'time' | 'accounts' | 'strategies';
  fromDate?: Date;
  toDate?: Date;
  fromAccount?: string;
  toAccount?: string;
  fromStrategy?: string;
  toStrategy?: string;
}

export const ComparisonDialog = ({ open, onOpenChange, accounts, onViewComparison }: ComparisonDialogProps) => {
  const [compareAcross, setCompareAcross] = useState<'time' | 'accounts' | 'strategies'>('time');
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();
  const [fromAccount, setFromAccount] = useState<string>('');
  const [toAccount, setToAccount] = useState<string>('');

  const handleViewComparison = () => {
    const comparisonData: ComparisonData = {
      compareAcross,
      ...(compareAcross === 'time' && { 
        fromDate,
        toDate
      }),
      ...(compareAcross === 'accounts' && { fromAccount, toAccount })
    };
    
    onViewComparison(comparisonData);
    onOpenChange(false);
  };

  const renderTimeRangeSection = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">From Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !fromDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {fromDate ? format(fromDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fromDate}
              onSelect={setFromDate}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">To Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !toDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {toDate ? format(toDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={toDate}
              onSelect={setToDate}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  const renderAccountsSection = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Comparison from</label>
          <Select value={fromAccount} onValueChange={setFromAccount}>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Comparison to</label>
          <Select value={toAccount} onValueChange={setToAccount}>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderStrategiesSection = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Comparison from</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="strategy1">Scalping Strategy</SelectItem>
              <SelectItem value="strategy2">Swing Trading</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Comparison to</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="strategy1">Scalping Strategy</SelectItem>
              <SelectItem value="strategy2">Swing Trading</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Add Comparison
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Compare across</label>
            <Select value={compareAcross} onValueChange={(value: 'time' | 'accounts' | 'strategies') => setCompareAcross(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">Date Range</SelectItem>
                <SelectItem value="accounts">Accounts</SelectItem>
                <SelectItem value="strategies">Strategies</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {compareAcross === 'time' && renderTimeRangeSection()}
          {compareAcross === 'accounts' && renderAccountsSection()}
          {compareAcross === 'strategies' && renderStrategiesSection()}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleViewComparison}
              disabled={
                (compareAcross === 'time' && (!fromDate || !toDate)) ||
                (compareAcross === 'accounts' && (!fromAccount || !toAccount)) ||
                (compareAcross === 'strategies' && false) // Add strategy validation when implemented
              }
            >
              View Comparison
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};