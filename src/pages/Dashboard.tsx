
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrendingUp, TrendingDown, DollarSign, Target, Calendar, Plus, Activity, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { MetricCard } from '@/components/MetricCard';
import { DashboardLayout } from '@/components/DashboardLayout';

interface DashboardStats {
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  activeTrades: number;
  bestTrade: number;
  worstTrade: number;
  avgWin: number;
  avgLoss: number;
  currentBalance: number;
  initialBalance: number;
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
    avgLoss: 0,
    currentBalance: 0,
    initialBalance: 0
  });
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [equityData, setEquityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch trades and trading accounts simultaneously
      const [tradesResult, accountsResult] = await Promise.all([
        supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('trading_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
      ]);

      if (tradesResult.error) throw tradesResult.error;
      if (accountsResult.error) throw accountsResult.error;

      const trades = tradesResult.data || [];
      const accounts = accountsResult.data || [];

      // Calculate account totals
      const totalCurrentBalance = accounts.reduce((sum, account) => sum + (account.current_balance || 0), 0);
      const totalInitialBalance = accounts.reduce((sum, account) => sum + (account.initial_balance || 0), 0);

      // Calculate statistics
      const closedTrades = trades.filter(t => t.status === 'closed');
      const activeTrades = trades.filter(t => t.status === 'open');
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
        totalTrades: trades.length,
        activeTrades: activeTrades.length,
        bestTrade,
        worstTrade,
        avgWin,
        avgLoss,
        currentBalance: totalCurrentBalance,
        initialBalance: totalInitialBalance
      });

      setRecentTrades(trades.slice(0, 5));

      // Generate equity curve data using actual initial balance
      const sortedTrades = closedTrades.sort((a, b) => new Date(a.exit_date || a.entry_date).getTime() - new Date(b.exit_date || b.entry_date).getTime());
      let runningBalance = totalInitialBalance || 0; // Use actual initial balance
      const equityCurve = [{ date: 'Start', balance: runningBalance }];
      
      sortedTrades.forEach((trade) => {
        runningBalance += (trade.pnl || 0);
        equityCurve.push({
          date: new Date(trade.exit_date || trade.entry_date).toLocaleDateString(),
          balance: runningBalance
        });
      });
      
      setEquityData(equityCurve);
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
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading dashboard...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Performance Dashboard</h1>
            <p className="text-muted-foreground">Monitor your trading performance and analytics</p>
          </div>
          <Button onClick={() => navigate('/trades/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            New Trade Entry
          </Button>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Current Balance"
            value={formatCurrency(stats.currentBalance)}
            change={{
              value: stats.currentBalance - stats.initialBalance,
              percentage: stats.initialBalance > 0 ? `${(((stats.currentBalance - stats.initialBalance) / stats.initialBalance) * 100).toFixed(1)}%` : "0.0%",
              isPositive: stats.currentBalance >= stats.initialBalance
            }}
            icon={<DollarSign className="h-5 w-5" />}
          />
          
          <MetricCard
            title="Profit and Loss"
            value={formatCurrency(stats.totalPnl)}
            change={{
              value: stats.totalPnl,
              percentage: stats.initialBalance > 0 ? `${((stats.totalPnl / stats.initialBalance) * 100).toFixed(1)}%` : "0.0%",
              isPositive: stats.totalPnl >= 0
            }}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          
          <MetricCard
            title="Win Rate"
            value={formatPercentage(stats.winRate)}
            change={{
              value: stats.winRate,
              percentage: `${stats.totalTrades} trades`,
              isPositive: stats.winRate >= 50
            }}
            icon={<Target className="h-5 w-5" />}
          />
          
          <MetricCard
            title="Active Trades"
            value={stats.activeTrades}
            change={{
              value: stats.activeTrades,
              percentage: "Currently open",
              isPositive: true
            }}
            icon={<BarChart3 className="h-5 w-5" />}
          />
        </div>

        {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Equity Curve */}
          <Card className="metric-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Equity Metrics</CardTitle>
              <CardDescription>Account balance progression over time</CardDescription>
            </CardHeader>
            <CardContent>
              {equityData.length > 1 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={equityData}>
                    <defs>
                      <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Balance']}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fill="url(#equityGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No data available yet</p>
                  <p className="text-sm">Complete some trades to see your equity curve</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Trades */}
          <Card className="metric-card">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Recent Trades</CardTitle>
                  <CardDescription>Your latest trading activity</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-xs">
                  Latest
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentTrades.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-muted/50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-3">No trades yet</p>
                  <Button 
                    onClick={() => navigate('/trades/new')} 
                    size="sm"
                    variant="outline"
                  >
                    Add Your First Trade
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTrades.map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${trade.trade_type === 'long' ? 'bg-profit' : 'bg-primary'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{trade.symbol}</p>
                            <Badge 
                              variant={trade.trade_type === 'long' ? 'default' : 'secondary'}
                              className="text-xs px-2 py-0"
                            >
                              {trade.trade_type.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(trade.entry_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={trade.status === 'open' ? 'outline' : 'default'}
                          className={`text-xs ${
                            trade.status === 'closed' && trade.pnl > 0 ? 'bg-profit/10 text-profit border-profit/20' : 
                            trade.status === 'closed' && trade.pnl < 0 ? 'bg-loss/10 text-loss border-loss/20' : ''
                          }`}
                        >
                          {trade.status}
                        </Badge>
                        {trade.status === 'closed' && trade.pnl && (
                          <p className={`text-xs font-medium mt-1 ${trade.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
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

        {/* Additional Performance Metrics */}
        <Card className="metric-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Your Top Assets</CardTitle>
            <CardDescription>Most traded asset performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Average Win</div>
                <div className="text-lg font-semibold text-profit">{formatCurrency(stats.avgWin)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Average Loss</div>
                <div className="text-lg font-semibold text-loss">{formatCurrency(Math.abs(stats.avgLoss))}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Best Trade</div>
                <div className="text-lg font-semibold text-profit">{formatCurrency(stats.bestTrade)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Risk/Reward</div>
                <div className="text-lg font-semibold">
                  {stats.avgLoss !== 0 ? (Math.abs(stats.avgWin / stats.avgLoss)).toFixed(2) : 'N/A'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
