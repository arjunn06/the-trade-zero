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
            <h4 className="text-sm font-semibold mb-2 flex items-center justify-between">
              <span>CSV Column Format</span>
              <a 
                href="https://docs.google.com/spreadsheets/d/1example/edit" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline text-xs font-normal"
              >
                View Example Template →
              </a>
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              Your CSV file must have column headers in the first row. Column names are case-insensitive.
            </p>
          </div>
          
          <div className="grid gap-3">
            <div className="p-3 bg-background rounded border">
              <h5 className="text-xs font-semibold text-foreground mb-2">✓ Required Columns (must be present):</h5>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <code className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Symbol</code>
                  <span>- Trading pair/instrument (e.g., EURUSD, AAPL)</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Trade Type</code>
                  <span>- Must be: buy, sell, long, or short</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Entry Price</code>
                  <span>- Opening price (number, e.g., 1.2550)</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Quantity</code>
                  <span>- Position size/lots (number, e.g., 0.5)</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Entry Date</code>
                  <span>- Format: YYYY-MM-DD (e.g., 2024-03-15)</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-background rounded border">
              <h5 className="text-xs font-semibold text-foreground mb-2">Optional Columns (will be imported if present):</h5>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <code className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Exit Price</code>
                  <span className="text-[10px]">- Closing price</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <code className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Exit Date</code>
                  <span className="text-[10px]">- YYYY-MM-DD</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <code className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Stop Loss</code>
                  <span className="text-[10px]">- SL price level</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <code className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Take Profit</code>
                  <span className="text-[10px]">- TP price level</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <code className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">PnL</code>
                  <span className="text-[10px]">- Profit/Loss ($)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <code className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Status</code>
                  <span className="text-[10px]">- open/closed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <code className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Commission</code>
                  <span className="text-[10px]">- Trading fees</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <code className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Swap</code>
                  <span className="text-[10px]">- Overnight fees</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <code className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Risk Amount</code>
                  <span className="text-[10px]">- $ at risk</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <code className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Risk Reward Ratio</code>
                  <span className="text-[10px]">- R:R (e.g., 2.5)</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <code className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Notes</code>
                  <span className="text-[10px]">- Text comments/observations</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border/50 space-y-1">
            <p className="text-xs text-muted-foreground">
              <strong>💡 Auto-Detection:</strong> Trades with Exit Price, Exit Date, or PnL will be marked as 'closed' automatically.
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>📋 Example Header Row:</strong> <code className="text-[10px] bg-muted px-1 py-0.5 rounded">Symbol,Trade Type,Entry Price,Quantity,Entry Date,Exit Price,PnL</code>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}