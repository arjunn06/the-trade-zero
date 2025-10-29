import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, FileSpreadsheet, X, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [previewTrades, setPreviewTrades] = useState<any[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewTrades([]); // Clear preview when new file is selected
    }
  };

  const handleCancelPreview = () => {
    setPreviewTrades([]);
    setSelectedFile(null);
  };

  const handleParseAndPreview = async () => {
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

      setPreviewTrades(trades);
      toast({
        title: "Preview ready",
        description: `${trades.length} trades parsed successfully. Review and confirm to import.`
      });
    } catch (error) {
      logger.apiError('CsvImportSection - parsing CSV', error);
      toast({
        title: "Parse failed",
        description: error instanceof Error ? error.message : "Failed to parse CSV file.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (previewTrades.length === 0) return;

    setIsImporting(true);
    try {
      const { error } = await supabase
        .from('trades')
        .insert(previewTrades);

      if (error) throw error;

      toast({
        title: "Import successful",
        description: `Successfully imported ${previewTrades.length} trades.`
      });

      // Reset state
      setSelectedFile(null);
      setPreviewTrades([]);
      onImportComplete?.();
    } catch (error) {
      logger.apiError('CsvImportSection - importing trades', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import trades.",
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
            {previewTrades.length === 0 ? (
              <>
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
                      onClick={handleParseAndPreview}
                      disabled={isImporting}
                      size="sm"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isImporting ? 'Processing...' : 'Preview'}
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Required columns: Symbol, Trade Type, Entry Price, Quantity, Entry Date
                </p>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">
                    {previewTrades.length} trades ready to import
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCancelPreview}
                      disabled={isImporting}
                      size="sm"
                      variant="outline"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirmImport}
                      disabled={isImporting}
                      size="sm"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {isImporting ? 'Importing...' : 'Confirm Import'}
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-64 border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Entry</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewTrades.map((trade, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{trade.symbol}</TableCell>
                          <TableCell className="capitalize">{trade.trade_type}</TableCell>
                          <TableCell>{trade.entry_price}</TableCell>
                          <TableCell>{trade.quantity}</TableCell>
                          <TableCell className="capitalize">{trade.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
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
        {previewTrades.length === 0 ? (
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
                    onClick={handleParseAndPreview}
                    disabled={isImporting}
                    size="sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isImporting ? 'Processing...' : 'Preview Trades'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <h4 className="text-sm font-semibold">Preview: {previewTrades.length} Trades</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Review the trades below and click "Confirm Import" to proceed
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCancelPreview}
                  disabled={isImporting}
                  variant="outline"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isImporting ? 'Importing...' : 'Confirm Import'}
                </Button>
              </div>
            </div>

            <ScrollArea className="h-96 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Entry Price</TableHead>
                    <TableHead>Exit Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Entry Date</TableHead>
                    <TableHead>PnL</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewTrades.map((trade, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{trade.symbol}</TableCell>
                      <TableCell className="capitalize">{trade.trade_type}</TableCell>
                      <TableCell>{trade.entry_price}</TableCell>
                      <TableCell>{trade.exit_price || '-'}</TableCell>
                      <TableCell>{trade.quantity}</TableCell>
                      <TableCell>{new Date(trade.entry_date).toLocaleDateString()}</TableCell>
                      <TableCell className={trade.pnl ? (trade.pnl > 0 ? 'text-green-600' : 'text-red-600') : ''}>
                        {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="capitalize">{trade.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        <div className="bg-muted/50 p-4 rounded-lg space-y-3">
          <div>
            <h4 className="text-sm font-semibold mb-2">Required Columns:</h4>
            <ul className="text-xs text-muted-foreground space-y-1 ml-2">
              <li><strong>Symbol:</strong> Trading pair or instrument (e.g., EURUSD, BTCUSD)</li>
              <li><strong>Trade Type:</strong> 'buy', 'sell', 'long', or 'short'</li>
              <li><strong>Entry Price:</strong> Price at which position was opened (numeric)</li>
              <li><strong>Quantity:</strong> Position size or lot size (numeric)</li>
              <li><strong>Entry Date:</strong> Date when trade was opened (YYYY-MM-DD format)</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold mb-2">Optional Columns:</h4>
            <ul className="text-xs text-muted-foreground space-y-1 ml-2">
              <li><strong>Exit Price:</strong> Price at which position was closed (numeric)</li>
              <li><strong>Exit Date:</strong> Date when trade was closed (YYYY-MM-DD)</li>
              <li><strong>Stop Loss:</strong> Stop loss price level (numeric)</li>
              <li><strong>Take Profit:</strong> Take profit price level (numeric)</li>
              <li><strong>PnL:</strong> Profit and Loss amount (numeric, positive or negative)</li>
              <li><strong>Status:</strong> 'open' or 'closed' (auto-detected if omitted)</li>
              <li><strong>Commission:</strong> Trading commission/fees (numeric)</li>
              <li><strong>Swap:</strong> Overnight swap charges (numeric)</li>
              <li><strong>Risk Amount:</strong> Amount risked on the trade (numeric)</li>
              <li><strong>Risk Reward Ratio:</strong> R:R ratio of the trade (numeric)</li>
              <li><strong>Notes:</strong> Any additional notes or comments (text)</li>
            </ul>
          </div>

          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> If Exit Price, Exit Date, or PnL is provided, the trade will automatically be marked as 'closed'
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}