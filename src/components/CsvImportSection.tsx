import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CsvImportSectionProps {
  accountId: string;
  onImportComplete?: () => void;
  compact?: boolean;
}

export function CsvImportSection({ accountId, onImportComplete, compact = false }: CsvImportSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImportCsv = async () => {
    if (!selectedFile || !user) return;

    setIsImporting(true);
    try {
      const text = await selectedFile.text();
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
              const lowerValue = value.toLowerCase();
              if (lowerValue === 'buy' || lowerValue === 'long') {
                trade.trade_type = 'long';
              } else if (lowerValue === 'sell' || lowerValue === 'short') {
                trade.trade_type = 'short';
              } else {
                trade.trade_type = lowerValue;
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

        // Auto-determine status based on exit data
        if (!trade.status || trade.status === 'open') {
          if (trade.exit_price || trade.exit_date || trade.pnl !== undefined) {
            trade.status = 'closed';
          } else {
            trade.status = 'open';
          }
        }

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

      // Reset file selection
      setSelectedFile(null);
      onImportComplete?.();
    } catch (error) {
      logger.apiError('CsvImportSection - importing CSV', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import CSV file.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div>
          <Label htmlFor="csv-import-compact" className="text-sm font-medium">
            Import Trades from CSV
          </Label>
          <div className="mt-2 space-y-2">
            <Input
              id="csv-import-compact"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={isImporting}
              className="cursor-pointer"
            />
            {selectedFile && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name}
                </span>
                <Button
                  onClick={handleImportCsv}
                  disabled={isImporting}
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isImporting ? 'Importing...' : 'Upload'}
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Required columns: Symbol, Trade Type, Entry Price, Quantity, Entry Date
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Import Trades from CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="csv-import" className="text-sm font-medium">
            Select CSV File
          </Label>
          <div className="mt-2 space-y-2">
            <Input
              id="csv-import"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={isImporting}
              className="cursor-pointer"
            />
            {selectedFile && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name}
                </span>
                <Button
                  onClick={handleImportCsv}
                  disabled={isImporting}
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isImporting ? 'Importing...' : 'Upload'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="text-sm font-medium mb-2">CSV Format Requirements:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Required columns: Symbol, Trade Type, Entry Price, Quantity, Entry Date</li>
            <li>• Optional columns: Exit Price, Exit Date, Stop Loss, Take Profit, PnL, Notes</li>
            <li>• Date format: YYYY-MM-DD</li>
            <li>• Trade Type: 'buy', 'sell', 'long', or 'short'</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}