import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, TrendingDown, ImageIcon, Edit, Trash2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  stop_loss?: number;
  take_profit?: number;
  commission?: number;
  swap?: number;
  risk_amount?: number;
  risk_reward_ratio?: number;
  trading_accounts: {
    name: string;
    currency: string;
  };
  strategies?: {
    name: string;
  };
}

const TradeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [screenshotDialog, setScreenshotDialog] = useState(false);

  useEffect(() => {
    if (user && id) {
      fetchTrade();
    }
  }, [user, id]);

  const fetchTrade = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('trades')
        .select(`
          *,
          trading_accounts(name, currency),
          strategies(name)
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setTrade(data);
    } catch (error) {
      console.error('Error fetching trade:', error);
      toast({
        title: "Error",
        description: "Failed to fetch trade details",
        variant: "destructive"
      });
      navigate('/trades');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async () => {
    if (!trade) return;

    try {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', trade.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Trade deleted successfully"
      });

      navigate('/trades');
    } catch (error) {
      console.error('Error deleting trade:', error);
      toast({
        title: "Error",
        description: "Failed to delete trade",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!trade) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Trade not found</h2>
          <Button onClick={() => navigate('/trades')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trades
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/trades')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trades
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              {trade.symbol}
              <Badge variant={trade.trade_type === 'long' ? 'default' : 'secondary'}>
                {trade.trade_type === 'long' ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {trade.trade_type.toUpperCase()}
              </Badge>
              <Badge 
                variant={trade.status === 'open' ? 'outline' : 'default'}
                className={trade.status === 'closed' && trade.pnl && trade.pnl > 0 ? 'bg-profit text-profit-foreground' : 
                          trade.status === 'closed' && trade.pnl && trade.pnl < 0 ? 'bg-loss text-destructive-foreground' : ''}
              >
                {trade.status}
              </Badge>
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/trades/edit/${trade.id}`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Price Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Price Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Entry Price</p>
                <p className="text-2xl font-bold">{trade.entry_price}</p>
              </div>
              {trade.exit_price && (
                <div>
                  <p className="text-sm text-muted-foreground">Exit Price</p>
                  <p className="text-2xl font-bold">{trade.exit_price}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Quantity</p>
                <p className="text-xl font-semibold">{trade.quantity}</p>
              </div>
            </CardContent>
          </Card>

          {/* P&L Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {trade.pnl && (
                <div>
                  <p className="text-sm text-muted-foreground">P&L</p>
                  <p className={`text-2xl font-bold ${trade.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatCurrency(trade.pnl, trade.trading_accounts.currency)}
                  </p>
                </div>
              )}
              {trade.commission && (
                <div>
                  <p className="text-sm text-muted-foreground">Commission</p>
                  <p className="text-lg">{formatCurrency(trade.commission, trade.trading_accounts.currency)}</p>
                </div>
              )}
              {trade.swap && (
                <div>
                  <p className="text-sm text-muted-foreground">Swap</p>
                  <p className="text-lg">{formatCurrency(trade.swap, trade.trading_accounts.currency)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Risk Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {trade.stop_loss && (
                <div>
                  <p className="text-sm text-muted-foreground">Stop Loss</p>
                  <p className="text-lg font-semibold">{trade.stop_loss}</p>
                </div>
              )}
              {trade.take_profit && (
                <div>
                  <p className="text-sm text-muted-foreground">Take Profit</p>
                  <p className="text-lg font-semibold">{trade.take_profit}</p>
                </div>
              )}
              {trade.risk_reward_ratio && (
                <div>
                  <p className="text-sm text-muted-foreground">Risk:Reward Ratio</p>
                  <p className="text-lg font-semibold">1:{trade.risk_reward_ratio}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Entry Date</p>
                <p className="font-medium">{formatDate(trade.entry_date)}</p>
              </div>
              {trade.exit_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Exit Date</p>
                  <p className="font-medium">{formatDate(trade.exit_date)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account & Strategy */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trade Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Trading Account</p>
                <p className="font-medium">{trade.trading_accounts.name}</p>
              </div>
              {trade.strategies && (
                <div>
                  <p className="text-sm text-muted-foreground">Strategy</p>
                  <p className="font-medium">{trade.strategies.name}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Currency</p>
                <p className="font-medium">{trade.trading_accounts.currency}</p>
              </div>
            </CardContent>
          </Card>

          {/* Screenshots */}
          {trade.screenshots && trade.screenshots.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Screenshots
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setScreenshotDialog(true)}
                  className="w-full"
                >
                  View Charts ({trade.screenshots.length})
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Notes Section */}
        {trade.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{trade.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Screenshot Gallery Dialog */}
        <Dialog open={screenshotDialog} onOpenChange={setScreenshotDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Chart Screenshots</DialogTitle>
              <DialogDescription>
                Trading chart screenshots for {trade.symbol}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {trade.screenshots?.map((screenshot, index) => (
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
                        <ImageIcon className="h-4 w-4" />
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

export default TradeDetail;