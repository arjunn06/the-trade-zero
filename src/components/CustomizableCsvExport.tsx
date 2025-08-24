import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileSpreadsheet, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface CustomizableCsvExportProps {
  accountId: string;
  accountName: string;
}

interface FieldOption {
  key: string;
  label: string;
  required?: boolean;
}

const AVAILABLE_FIELDS: FieldOption[] = [
  { key: 'symbol', label: 'Symbol', required: true },
  { key: 'trade_type', label: 'Trade Type', required: true },
  { key: 'entry_price', label: 'Entry Price', required: true },
  { key: 'exit_price', label: 'Exit Price' },
  { key: 'quantity', label: 'Quantity', required: true },
  { key: 'entry_date', label: 'Entry Date', required: true },
  { key: 'exit_date', label: 'Exit Date' },
  { key: 'stop_loss', label: 'Stop Loss' },
  { key: 'take_profit', label: 'Take Profit' },
  { key: 'pnl', label: 'PnL' },
  { key: 'status', label: 'Status' },
  { key: 'commission', label: 'Commission' },
  { key: 'swap', label: 'Swap' },
  { key: 'risk_amount', label: 'Risk Amount' },
  { key: 'risk_reward_ratio', label: 'Risk Reward Ratio' },
  { key: 'notes', label: 'Notes' },
  { key: 'emotions', label: 'Emotions' },
  { key: 'order_type', label: 'Order Type' },
  { key: 'order_id', label: 'Order ID' },
  { key: 'position_id', label: 'Position ID' },
  { key: 'confluence_score', label: 'Confluence Score' },
  { key: 'created_at', label: 'Created At' },
  { key: 'updated_at', label: 'Updated At' }
];

export function CustomizableCsvExport({ accountId, accountName }: CustomizableCsvExportProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>(
    AVAILABLE_FIELDS.filter(field => field.required).map(field => field.key)
  );

  const handleFieldToggle = (fieldKey: string, checked: boolean) => {
    if (checked) {
      setSelectedFields(prev => [...prev, fieldKey]);
    } else {
      const field = AVAILABLE_FIELDS.find(f => f.key === fieldKey);
      if (!field?.required) {
        setSelectedFields(prev => prev.filter(key => key !== fieldKey));
      }
    }
  };

  const selectAllFields = () => {
    setSelectedFields(AVAILABLE_FIELDS.map(field => field.key));
  };

  const selectRequiredOnly = () => {
    setSelectedFields(AVAILABLE_FIELDS.filter(field => field.required).map(field => field.key));
  };

  const formatFieldValue = (trade: any, fieldKey: string): string => {
    const value = trade[fieldKey];
    
    switch (fieldKey) {
      case 'entry_date':
      case 'exit_date':
      case 'created_at':
      case 'updated_at':
        return value ? new Date(value).toISOString().split('T')[0] : '';
      case 'notes':
      case 'emotions':
        return value ? String(value).replace(/"/g, '""') : '';
      case 'pnl':
      case 'entry_price':
      case 'exit_price':
      case 'stop_loss':
      case 'take_profit':
      case 'quantity':
      case 'commission':
      case 'swap':
      case 'risk_amount':
      case 'risk_reward_ratio':
      case 'confluence_score':
        return value !== null && value !== undefined ? String(value) : '';
      default:
        return value ? String(value) : '';
    }
  };

  const handleExportCsv = async () => {
    if (!user || selectedFields.length === 0) return;
    
    setIsExporting(true);
    try {
      // Build query based on account selection
      let query = supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id);

      // Only filter by account if a specific account is selected
      if (accountId !== 'all') {
        query = query.eq('trading_account_id', accountId);
      }

      const { data: trades, error } = await query.order('entry_date', { ascending: false });

      if (error) throw error;

      if (!trades || trades.length === 0) {
        toast({
          title: "No trades found",
          description: "No trades available for export in this account.",
          variant: "destructive"
        });
        return;
      }

      // Create CSV headers based on selected fields
      const csvHeaders = selectedFields.map(fieldKey => 
        AVAILABLE_FIELDS.find(field => field.key === fieldKey)?.label || fieldKey
      );

      // Create CSV rows with only selected fields
      const csvRows = trades.map((trade) => 
        selectedFields.map(fieldKey => formatFieldValue(trade, fieldKey))
      );

      // Format CSV content
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => 
          typeof field === 'string' && (field.includes(',') || field.includes('"')) 
            ? `"${field}"` 
            : field
        ).join(','))
      ].join('\n');

      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${accountName.replace(/[^a-z0-9]/gi, '_')}_trades_custom_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `Exported ${trades.length} trades with ${selectedFields.length} fields to CSV file.`
      });
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Export failed",
        description: "Failed to export trades to CSV.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Custom CSV Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Customize CSV Export
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={selectAllFields}
            >
              Select All
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={selectRequiredOnly}
            >
              Required Only
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {AVAILABLE_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center space-x-2">
                <Checkbox
                  id={field.key}
                  checked={selectedFields.includes(field.key)}
                  onCheckedChange={(checked) => handleFieldToggle(field.key, checked as boolean)}
                  disabled={field.required}
                />
                <Label 
                  htmlFor={field.key} 
                  className={`text-sm ${field.required ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
                >
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
              </div>
            ))}
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Export Summary:</h4>
            <p className="text-sm text-muted-foreground">
              {selectedFields.length} fields selected for export
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              * Required fields cannot be deselected
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleExportCsv}
              disabled={isExporting || selectedFields.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}