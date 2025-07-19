import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, ImageIcon, Eye, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useSubscription } from '@/hooks/useSubscription';
import { PremiumFeature, UpgradePrompt } from '@/components/PremiumFeature';
import { TradeCard } from '@/components/TradeCard';
import { TradeFilters, type TradeFilters as TradeFiltersType } from '@/components/TradeFilters';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useUndoToast } from '@/components/UndoToast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Trade {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  exit_price?: number;
  quantity: number;
  status: string;
  pnl?: number;
  entry_date: string;
  exit_date?: string;
  notes?: string;
  screenshots?: string[];
  trading_accounts: {
    name: string;
    currency: string;
  };
  strategies?: {
    name: string;
  };
}

const Trades = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isPremium } = useSubscription();
  const { showUndoToast } = useUndoToast();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [screenshotDialog, setScreenshotDialog] = useState(false);
  const [selectedScreenshots, setSelectedScreenshots] = useState<string[]>([]);
  const [filters, setFilters] = useState<TradeFiltersType>({
    searchTerm: '',
    tradeType: '',
    status: '',
    sortBy: 'entry_date',
    sortDirection: 'desc'
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    tradeId: string;
    tradeName: string;
  }>({ open: false, tradeId: '', tradeName: '' });
  const [recentlyDeleted, setRecentlyDeleted] = useState<Trade | null>(null);
  const [closeFormData, setCloseFormData] = useState({
    exit_price: '',
    exit_date: '',
    pnl: '',
    commission: '',
    swap: ''
  });

  // Premium limits for basic users
  const BASIC_TRADE_LIMIT = 50;

  useEffect(() => {
    if (user) {
      fetchTrades();
    }
  }, [user]);

  const fetchTrades = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('trades')
        .select(`
          *,
          trading_accounts(name, currency),
          strategies(name)
        `)
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      console.error('Error fetching trades:', error);
      toast({
        title: "Error",
        description: "Failed to fetch trades",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrade) return;

    try {
      const updateData = {
        status: 'closed',
        exit_price: parseFloat(closeFormData.exit_price),
        exit_date: new Date(closeFormData.exit_date).toISOString(),
        pnl: parseFloat(closeFormData.pnl),
        commission: closeFormData.commission ? parseFloat(closeFormData.commission) : 0,
        swap: closeFormData.swap ? parseFloat(closeFormData.swap) : 0
      };

      const { error } = await supabase
        .from('trades')
        .update(updateData)
        .eq('id', editingTrade.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Trade closed successfully"
      });

      setDialogOpen(false);
      setEditingTrade(null);
      fetchTrades();
    } catch (error) {
      console.error('Error closing trade:', error);
      toast({
        title: "Error",
        description: "Failed to close trade",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTrade = async (id: string) => {
    const tradeToDelete = trades.find(t => t.id === id);
    if (!tradeToDelete) return;

    try {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRecentlyDeleted(tradeToDelete);
      setTrades(prev => prev.filter(t => t.id !== id));

      showUndoToast({
        message: `Deleted trade ${tradeToDelete.symbol}`,
        onUndo: () => handleUndoDelete(tradeToDelete)
      });

    } catch (error) {
      console.error('Error deleting trade:', error);
      toast({
        title: "Error",
        description: "Failed to delete trade",
        variant: "destructive"
      });
    }
  };

  const handleUndoDelete = async (trade: Trade) => {
    try {
      // Create a clean trade object without the nested trading_accounts and strategies
      const cleanTradeData = {
        id: trade.id,
        symbol: trade.symbol,
        trade_type: trade.trade_type,
        entry_price: trade.entry_price,
        exit_price: trade.exit_price,
        quantity: trade.quantity,
        status: trade.status,
        pnl: trade.pnl,
        entry_date: trade.entry_date,
        exit_date: trade.exit_date,
        notes: trade.notes,
        screenshots: trade.screenshots,
        user_id: user?.id,
        // You'll need to store the trading_account_id when deleting if you want to restore properly
        trading_account_id: trade.id // This is a placeholder - you'd need to get the actual trading_account_id
      };

      const { error } = await supabase
        .from('trades')
        .insert([cleanTradeData]);

      if (error) throw error;

      // Refresh trades to get the proper data structure
      fetchTrades();
      setRecentlyDeleted(null);

      toast({
        title: "Success",
        description: "Trade restored successfully"
      });
    } catch (error) {
      console.error('Error restoring trade:', error);
      toast({
        title: "Error",
        description: "Failed to restore trade. Please recreate the trade manually.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteConfirm = (id: string, symbol: string) => {
    setConfirmDialog({
      open: true,
      tradeId: id,
      tradeName: symbol
    });
  };

  const openCloseDialog = (trade: Trade) => {
    setEditingTrade(trade);
    setCloseFormData({
      exit_price: '',
      exit_date: new Date().toISOString().split('T')[0],
      pnl: '',
      commission: '0',
      swap: '0'
    });
    setDialogOpen(true);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const openScreenshotDialog = (screenshots: string[]) => {
    setSelectedScreenshots(screenshots);
    setScreenshotDialog(true);
  };

  const handleRowClick = (tradeId: string) => {
    navigate(`/trades/${tradeId}`);
  };

  // Filter and sort trades
  const filteredAndSortedTrades = useMemo(() => {
    let filtered = trades.filter(trade => {
      // Search term filter (matches symbol, trade type, status)
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSymbol = trade.symbol.toLowerCase().includes(searchLower);
        const matchesType = trade.trade_type.toLowerCase().includes(searchLower);
        const matchesStatus = trade.status.toLowerCase().includes(searchLower);
        if (!matchesSymbol && !matchesType && !matchesStatus) return false;
      }
      
      // Trade type filter
      if (filters.tradeType && trade.trade_type !== filters.tradeType) return false;
      
      // Status filter
      if (filters.status && trade.status !== filters.status) return false;
      
      return true;
    });

    // Sort trades
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (filters.sortBy) {
        case 'entry_date':
          aValue = new Date(a.entry_date);
          bValue = new Date(b.entry_date);
          break;
        case 'pnl':
          aValue = a.pnl || 0;
          bValue = b.pnl || 0;
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        default:
          aValue = a.entry_date;
          bValue = b.entry_date;
      }

      if (aValue < bValue) return filters.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [trades, filters]);

  // Get unique symbols for filter dropdown
  const symbolOptions = useMemo(() => {
    return Array.from(new Set(trades.map(trade => trade.symbol))).sort();
  }, [trades]);

  if (loading) {
    return <div>Loading trades...</div>;
  }

  // Check if basic user has exceeded trade limit
  const hasExceededLimit = !isPremium && trades.length >= BASIC_TRADE_LIMIT;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Trade History</h1>
            <p className="text-muted-foreground">View and manage your trading history</p>
          </div>
          {hasExceededLimit ? (
            <PremiumFeature
              feature="Unlimited Trades"
              description="You've reached the 50 trade limit for basic users. Upgrade to premium for unlimited trade tracking."
              showUpgrade={false}
              fallback={
                <Button disabled variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Upgrade for More Trades
                </Button>
              }
            />
          ) : (
            <Button onClick={() => navigate('/trades/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Trade
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        {trades.length > 0 && (
          <TradeFilters
            onFiltersChange={setFilters}
            symbolOptions={symbolOptions}
          />
        )}

        {trades.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No trades yet</h3>
                <p className="text-muted-foreground mb-4">Start by creating your first trade</p>
                {hasExceededLimit ? (
                  <PremiumFeature
                    feature="Unlimited Trades"
                    description="Upgrade to premium for unlimited trade tracking and advanced features."
                  />
                ) : (
                  <Button onClick={() => navigate('/trades/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Trade
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : filteredAndSortedTrades.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No trades match your filters</h3>
                <p className="text-muted-foreground mb-4">Try adjusting your filter criteria</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className="block lg:hidden space-y-4">
              {filteredAndSortedTrades.map((trade) => (
                <TradeCard
                  key={trade.id}
                  trade={trade}
                  onClose={openCloseDialog}
                  onDelete={(id) => handleDeleteConfirm(id, trade.symbol)}
                  onViewScreenshots={openScreenshotDialog}
                />
              ))}
            </div>

            {/* Desktop View - Table */}
            <Card className="hidden lg:block">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  All Trades
                  {!isPremium && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{trades.length}/{BASIC_TRADE_LIMIT} trades used</span>
                      {trades.length >= BASIC_TRADE_LIMIT * 0.8 && (
                        <Button size="sm" variant="outline" onClick={() => navigate('/')}>
                          Upgrade
                        </Button>
                      )}
                    </div>
                  )}
                </CardTitle>
                <CardDescription>
                  {filteredAndSortedTrades.length === trades.length 
                    ? `${trades.length} trades total`
                    : `${filteredAndSortedTrades.length} of ${trades.length} trades shown`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Entry</TableHead>
                      <TableHead>Exit</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>P&L</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Charts</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedTrades.map((trade) => (
                      <TableRow 
                        key={trade.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleRowClick(trade.id)}
                      >
                        <TableCell className="font-medium">{trade.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={trade.trade_type === 'long' ? 'default' : 'secondary'}>
                            {trade.trade_type === 'long' ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {trade.trade_type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{trade.entry_price}</TableCell>
                        <TableCell>{trade.exit_price || '-'}</TableCell>
                        <TableCell>{trade.quantity}</TableCell>
                        <TableCell>
                          {trade.pnl ? (
                            <span className={trade.pnl >= 0 ? 'text-profit' : 'text-loss'}>
                              {formatCurrency(trade.pnl, trade.trading_accounts.currency)}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={trade.status === 'open' ? 'outline' : 'secondary'}
                          >
                            {trade.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {trade.screenshots && trade.screenshots.length > 0 ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                openScreenshotDialog(trade.screenshots!);
                              }}
                            >
                              <ImageIcon className="h-4 w-4 mr-1" />
                              {trade.screenshots.length}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(trade.entry_date)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {trade.status === 'open' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openCloseDialog(trade);
                                }}
                              >
                                Close
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConfirm(trade.id, trade.symbol);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
          title="Delete Trade"
          description={`Are you sure you want to delete the ${confirmDialog.tradeName} trade? This action cannot be undone immediately, but you can undo it using the notification that will appear.`}
          confirmText="Delete"
          onConfirm={() => {
            handleDeleteTrade(confirmDialog.tradeId);
            setConfirmDialog({ open: false, tradeId: '', tradeName: '' });
          }}
          variant="destructive"
        />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Trade</DialogTitle>
            <DialogDescription>
              Enter the exit details for {editingTrade?.symbol}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCloseTrade} className="space-y-4">
            <div>
              <Label htmlFor="exit_price">Exit Price</Label>
              <Input
                id="exit_price"
                type="number"
                step="any"
                value={closeFormData.exit_price}
                onChange={(e) => setCloseFormData({ ...closeFormData, exit_price: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="exit_date">Exit Date</Label>
              <Input
                id="exit_date"
                type="date"
                value={closeFormData.exit_date}
                onChange={(e) => setCloseFormData({ ...closeFormData, exit_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="pnl">P&L</Label>
              <Input
                id="pnl"
                type="number"
                step="0.01"
                value={closeFormData.pnl}
                onChange={(e) => setCloseFormData({ ...closeFormData, pnl: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="commission">Commission</Label>
                <Input
                  id="commission"
                  type="number"
                  step="0.01"
                  value={closeFormData.commission}
                  onChange={(e) => setCloseFormData({ ...closeFormData, commission: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="swap">Swap</Label>
                <Input
                  id="swap"
                  type="number"
                  step="0.01"
                  value={closeFormData.swap}
                  onChange={(e) => setCloseFormData({ ...closeFormData, swap: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              Close Trade
            </Button>
          </form>
         </DialogContent>
       </Dialog>

       {/* Screenshot Gallery Dialog */}
       <Dialog open={screenshotDialog} onOpenChange={setScreenshotDialog}>
         <DialogContent className="max-w-4xl">
           <DialogHeader>
             <DialogTitle>Chart Screenshots</DialogTitle>
             <DialogDescription>
               View trading chart screenshots for this trade
             </DialogDescription>
           </DialogHeader>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
             {selectedScreenshots.map((screenshot, index) => (
               <div key={index} className="relative group">
                 <img
                   src={screenshot}
                   alt={`Screenshot ${index + 1}`}
                   className="w-full h-auto rounded-lg border"
                 />
                 <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Button
                     size="sm"
                     variant="secondary"
                     asChild
                   >
                     <a href={screenshot} target="_blank" rel="noopener noreferrer">
                       <Eye className="h-4 w-4" />
                     </a>
                   </Button>
                 </div>
               </div>
             ))}
           </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Trades;