import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3 } from 'lucide-react';

interface ComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: any[];
  onExportChart: (comparisonData: ComparisonData) => void;
}

interface ComparisonData {
  compareAcross: 'time' | 'accounts' | 'strategies';
  timeRange?: 'year' | 'month' | 'date' | 'hour';
  fromAccount?: string;
  toAccount?: string;
  fromStrategy?: string;
  toStrategy?: string;
}

export const ComparisonDialog = ({ open, onOpenChange, accounts, onExportChart }: ComparisonDialogProps) => {
  const [compareAcross, setCompareAcross] = useState<'time' | 'accounts' | 'strategies'>('time');
  const [timeRange, setTimeRange] = useState<string>('month');
  const [fromAccount, setFromAccount] = useState<string>('');
  const [toAccount, setToAccount] = useState<string>('');

  const handleExportChart = () => {
    const comparisonData: ComparisonData = {
      compareAcross,
      ...(compareAcross === 'time' && { timeRange: timeRange as 'year' | 'month' | 'date' | 'hour' }),
      ...(compareAcross === 'accounts' && { fromAccount, toAccount })
    };
    
    onExportChart(comparisonData);
    onOpenChange(false);
  };

  const renderTimeRangeSection = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Date & Time Range</label>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="year">Year Range</SelectItem>
            <SelectItem value="month">Month Range</SelectItem>
            <SelectItem value="date">Date Range</SelectItem>
            <SelectItem value="hour">Hour Range</SelectItem>
          </SelectContent>
        </Select>
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
                <SelectItem value="time">Month Range</SelectItem>
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
              onClick={handleExportChart}
              disabled={
                (compareAcross === 'accounts' && (!fromAccount || !toAccount)) ||
                (compareAcross === 'strategies' && false) // Add strategy validation when implemented
              }
            >
              Export chart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};