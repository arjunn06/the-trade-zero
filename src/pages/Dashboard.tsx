import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrendingUp, TrendingDown, DollarSign, Target, Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  activeTrades: number;
  bestTrade: number;
  worstTrade: number;
  avgWin: number;
  avgLoss: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalPnl: 0,
    winRate: 0,
    totalTrades: 0,
    activeTrades: 0,
    bestTrade: 0,
    worstTrade: 0,
    avgWin: 0,
    avgLoss: 0
  });
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch trades for statistics
      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate statistics
      const closedTrades = trades?.filter(t => t.status === 'closed') || [];
      const activeTrades = trades?.filter(t => t.status === 'open') || [];
      const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
      const losingTrades = closedTrades.filter(t => (t.pnl || 0) < 0);

      const totalPnl = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
      const bestTrade = closedTrades.length > 0 ? Math.max(...closedTrades.map(t => t.pnl || 0)) : 0;
      const worstTrade = closedTrades.length > 0 ? Math.min(...closedTrades.map(t => t.pnl || 0)) : 0;
      const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length : 0;
      const avgLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length : 0;

      setStats({
        totalPnl,
        winRate,
        totalTrades: trades?.length || 0,
        activeTrades: activeTrades.length,
        bestTrade,
        worstTrade,
        avgWin,
        avgLoss
      });

      setRecentTrades(trades?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Your trading performance overview</p>
        </div>
        <Button onClick={() => navigate('/trades/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Trade
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
              {formatCurrency(stats.totalPnl)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {stats.totalTrades} trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(stats.winRate)}</div>
            <p className="text-xs text-muted-foreground">
              Success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Trades</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTrades}</div>
            <p className="text-xs text-muted-foreground">
              Currently open
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Trade</CardTitle>
            <TrendingUp className="h-4 w-4 text-profit" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-profit">
              {formatCurrency(stats.bestTrade)}
            </div>
            <p className="text-xs text-muted-foreground">
              Biggest winner
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Average Win</span>
              <span className="font-medium text-profit">{formatCurrency(stats.avgWin)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Average Loss</span>
              <span className="font-medium text-loss">{formatCurrency(stats.avgLoss)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Worst Trade</span>
              <span className="font-medium text-loss">{formatCurrency(stats.worstTrade)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Risk/Reward</span>
              <span className="font-medium">
                {stats.avgLoss !== 0 ? (Math.abs(stats.avgWin / stats.avgLoss)).toFixed(2) : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
            <CardDescription>Your last 5 trades</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTrades.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No trades yet</p>
                <Button 
                  onClick={() => navigate('/trades/new')} 
                  className="mt-4"
                  variant="outline"
                >
                  Add Your First Trade
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTrades.map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant={trade.trade_type === 'long' ? 'default' : 'secondary'}>
                        {trade.trade_type.toUpperCase()}
                      </Badge>
                      <div>
                        <p className="font-medium">{trade.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(trade.entry_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={trade.status === 'open' ? 'outline' : 'default'}
                        className={trade.status === 'closed' && trade.pnl > 0 ? 'bg-profit text-profit-foreground' : 
                                 trade.status === 'closed' && trade.pnl < 0 ? 'bg-loss text-destructive-foreground' : ''}
                      >
                        {trade.status}
                      </Badge>
                      {trade.status === 'closed' && trade.pnl && (
                        <p className={`text-sm font-medium ${trade.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {formatCurrency(trade.pnl)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;