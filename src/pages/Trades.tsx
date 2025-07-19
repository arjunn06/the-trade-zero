import { useState, useEffect } from 'react';
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
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [screenshotDialog, setScreenshotDialog] = useState(false);
  const [selectedScreenshots, setSelectedScreenshots] = useState<string[]>([]);
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
    try {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Trade deleted successfully"
      });

      fetchTrades();
    } catch (error) {
      console.error('Error deleting trade:', error);
      toast({
        title: "Error",
        description: "Failed to delete trade",
        variant: "destructive"
      });
    }
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
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className="block lg:hidden space-y-4">
              {trades.map((trade) => (
                <TradeCard
                  key={trade.id}
                  trade={trade}
                  onClose={openCloseDialog}
                  onDelete={handleDeleteTrade}
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
                <CardDescription>Complete history of your trading activity</CardDescription>
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
                    {trades.map((trade) => (
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
                                handleDeleteTrade(trade.id);
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