import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Download, Upload, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { PremiumFeature } from '@/components/PremiumFeature';

interface TradeCsvManagerProps {
  accountId: string;
  accountName: string;
}

interface Trade {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  exit_price?: number;
  quantity: number;
  entry_date: string;
  exit_date?: string;
  stop_loss?: number;
  take_profit?: number;
  pnl?: number;
  notes?: string;
  status: string;
  commission?: number;
  swap?: number;
  risk_amount?: number;
  risk_reward_ratio?: number;
}

export function TradeCsvManager({ accountId, accountName }: TradeCsvManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportCsv = async () => {
    if (!user) return;
    
    setIsExporting(true);
    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('trading_account_id', accountId)
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      if (error) throw error;

      if (!trades || trades.length === 0) {
        toast({
          title: "No trades found",
          description: "No trades available for export in this account.",
          variant: "destructive"
        });
        return;
      }

      // Convert trades to CSV
      const csvHeaders = [
        'Symbol',
        'Trade Type',
        'Entry Price',
        'Exit Price',
        'Quantity',
        'Entry Date',
        'Exit Date',
        'Stop Loss',
        'Take Profit',
        'PnL',
        'Status',
        'Commission',
        'Swap',
        'Risk Amount',
        'Risk Reward Ratio',
        'Notes'
      ];

      const csvRows = trades.map((trade: Trade) => [
        trade.symbol,
        trade.trade_type,
        trade.entry_price,
        trade.exit_price || '',
        trade.quantity,
        new Date(trade.entry_date).toISOString().split('T')[0],
        trade.exit_date ? new Date(trade.exit_date).toISOString().split('T')[0] : '',
        trade.stop_loss || '',
        trade.take_profit || '',
        trade.pnl || '',
        trade.status,
        trade.commission || 0,
        trade.swap || 0,
        trade.risk_amount || '',
        trade.risk_reward_ratio || '',
        (trade.notes || '').replace(/"/g, '""') // Escape quotes in notes
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => 
          typeof field === 'string' && field.includes(',') 
            ? `"${field}"` 
            : field
        ).join(','))
      ].join('\n');

      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${accountName.replace(/[^a-z0-9]/gi, '_')}_trades_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `Exported ${trades.length} trades to CSV file.`
      });
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

  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV file must have headers and at least one trade row');
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1);

      // Validate required headers
      const requiredHeaders = ['Symbol', 'Trade Type', 'Entry Price', 'Quantity', 'Entry Date'];
      const missingHeaders = requiredHeaders.filter(req => 
        !headers.some(h => h.toLowerCase().includes(req.toLowerCase()))
      );

      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
      }

      const trades = [];
      for (const row of rows) {
        const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
        const trade: any = { 
          user_id: user.id,
          trading_account_id: accountId,
          status: 'open'
        };

        headers.forEach((header, index) => {
          const value = values[index] || '';
          
          switch (header.toLowerCase()) {
            case 'symbol':
              trade.symbol = value;
              break;
            case 'trade type':
              // Map trade type values to database constraints
              const lowerValue = value.toLowerCase();
              if (lowerValue === 'buy' || lowerValue === 'long') {
                trade.trade_type = 'long';
              } else if (lowerValue === 'sell' || lowerValue === 'short') {
                trade.trade_type = 'short';
              } else {
                trade.trade_type = lowerValue; // Let database validation handle invalid values
              }
              break;
            case 'entry price':
              trade.entry_price = parseFloat(value);
              break;
            case 'exit price':
              if (value) trade.exit_price = parseFloat(value);
              break;
            case 'quantity':
              trade.quantity = parseFloat(value);
              break;
            case 'entry date':
              trade.entry_date = new Date(value).toISOString();
              break;
            case 'exit date':
              if (value) trade.exit_date = new Date(value).toISOString();
              break;
            case 'stop loss':
              if (value) trade.stop_loss = parseFloat(value);
              break;
            case 'take profit':
              if (value) trade.take_profit = parseFloat(value);
              break;
            case 'pnl':
              if (value) trade.pnl = parseFloat(value);
              break;
            case 'status':
              if (value) trade.status = value.toLowerCase();
              break;
            case 'commission':
              if (value) trade.commission = parseFloat(value);
              break;
            case 'swap':
              if (value) trade.swap = parseFloat(value);
              break;
            case 'risk amount':
              if (value) trade.risk_amount = parseFloat(value);
              break;
            case 'risk reward ratio':
              if (value) trade.risk_reward_ratio = parseFloat(value);
              break;
            case 'notes':
              if (value) trade.notes = value;
              break;
          }
        });

        // Validate required fields
        if (!trade.symbol || !trade.trade_type || !trade.entry_price || !trade.quantity || !trade.entry_date) {
          throw new Error(`Invalid trade data in row: ${row}`);
        }

        trades.push(trade);
      }

      // Import trades to database
      const { error } = await supabase
        .from('trades')
        .insert(trades);

      if (error) throw error;

      toast({
        title: "Import successful",
        description: `Successfully imported ${trades.length} trades.`
      });

      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import CSV file.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <PremiumFeature
      feature="CSV Import/Export"
      description="Import and export your trades as CSV files for advanced analysis and record keeping."
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            CSV Import/Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="csv-import" className="text-sm font-medium">
                Import Trades
              </Label>
              <div className="mt-2">
                <Input
                  id="csv-import"
                  type="file"
                  accept=".csv"
                  onChange={handleImportCsv}
                  disabled={isImporting}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload a CSV file with your trade data
                </p>
              </div>
            </div>
            
            <div className="flex-1">
              <Label className="text-sm font-medium">
                Export Trades
              </Label>
              <div className="mt-2">
                <Button
                  onClick={handleExportCsv}
                  disabled={isExporting}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Exporting...' : 'Download CSV'}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Export all trades from this account
                </p>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">CSV Format Requirements:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Required columns: Symbol, Trade Type, Entry Price, Quantity, Entry Date</li>
              <li>• Optional columns: Exit Price, Exit Date, Stop Loss, Take Profit, PnL, Notes</li>
              <li>• Date format: YYYY-MM-DD</li>
              <li>• Trade Type: 'buy' or 'sell'</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </PremiumFeature>
  );
}