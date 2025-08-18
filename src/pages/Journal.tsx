import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';

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
  stop_loss?: number;
  take_profit?: number;
  trading_accounts: {
    name: string;
    currency: string;
  };
}

const Journal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
          trading_accounts(name, currency)
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

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTradeOutcome = (trade: Trade) => {
    if (trade.status === 'open') return 'Open';
    if (!trade.pnl) return 'Break Even';
    
    if (trade.pnl > 0) {
      if (trade.exit_price === trade.take_profit) return 'Take Profit';
      return 'Partial Profit';
    } else {
      if (trade.exit_price === trade.stop_loss) return 'Stop Loss';
      return 'Loss';
    }
  };

  const getOutcomeColor = (trade: Trade) => {
    if (trade.status === 'open') return 'text-muted-foreground';
    if (!trade.pnl) return 'text-muted-foreground';
    return trade.pnl > 0 ? 'text-profit' : 'text-loss';
  };

  // Filter trades based on search term
  const filteredTrades = useMemo(() => {
    if (!searchTerm) return trades;
    
    return trades.filter(trade => 
      trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.trade_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getTradeOutcome(trade).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [trades, searchTerm]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading journal...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Journal</h1>
            <p className="text-muted-foreground">Your trading journal overview</p>
          </div>
          <Button onClick={() => navigate('/trades/new')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New trade entry
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="Search trades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4"
            />
          </div>
        </div>

        {filteredTrades.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              {searchTerm ? 'No trades found matching your search.' : 'No trades yet.'}
            </div>
            {!searchTerm && (
              <Button onClick={() => navigate('/trades/new')} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add your first trade
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTrades.map((trade, index) => (
              <Card 
                key={trade.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/trades/${trade.id}`)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="text-sm text-muted-foreground">
                      Trade #{String(index + 1).padStart(2, '0')}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{trade.symbol}</span>
                      <Badge 
                        variant={trade.trade_type === 'long' ? 'default' : 'secondary'}
                        className={`text-xs ${
                          trade.trade_type === 'long' 
                            ? 'bg-profit/10 text-profit border-profit/20' 
                            : 'bg-loss/10 text-loss border-loss/20'
                        }`}
                      >
                        {trade.trade_type === 'long' ? 'Long' : 'Short'}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {getTradeOutcome(trade)}
                    </div>
                    
                    <div className={`text-xl font-bold ${getOutcomeColor(trade)}`}>
                      {trade.status === 'open' 
                        ? 'Open'
                        : trade.pnl 
                          ? formatCurrency(trade.pnl, trade.trading_accounts?.currency)
                          : 'Break Even'
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Journal;