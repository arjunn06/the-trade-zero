
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrendingUp, TrendingDown, DollarSign, Target, Calendar, Plus, Activity, BarChart3, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { MetricCard } from '@/components/MetricCard';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SmartSuggestions } from '@/components/SmartSuggestions';

interface AccountGoalsSectionProps {
  accounts: any[];
  user: any;
  formatCurrency: (amount: number, currency?: string) => string;
}

const AccountGoalsSection = ({ accounts, user, formatCurrency }: AccountGoalsSectionProps) => {
  const [accountEquities, setAccountEquities] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchAccountEquities = async () => {
      if (!user || accounts.length === 0) return;

      try {
        const { data: allTradesData } = await supabase
          .from('trades')
          .select('pnl, trading_account_id')
          .eq('user_id', user.id);

        const equities: Record<string, number> = {};
        accounts.forEach(account => {
          const accountTrades = (allTradesData || []).filter(trade => trade.trading_account_id === account.id);
          const accountPnl = accountTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
          equities[account.id] = account.initial_balance + accountPnl;
        });
        setAccountEquities(equities);
      } catch (error) {
        console.error('Error fetching account equities:', error);
      }
    };

    fetchAccountEquities();
  }, [accounts, user]);

  const accountsWithGoals = accounts.filter(acc => {
    if (!acc.equity_goal || acc.equity_goal <= 0) return false;
    const equity = accountEquities[acc.id] || acc.initial_balance;
    const progress = (equity / acc.equity_goal) * 100;
    return progress < 100; // Only show goals not yet achieved
  });

  if (accountsWithGoals.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="h-5 w-5 mr-2" />
          Equity Goals Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {accountsWithGoals.map((account) => {
          const equity = accountEquities[account.id] || account.initial_balance;
          const progress = (equity / account.equity_goal!) * 100;
          const progressClamped = Math.min(Math.max(progress, 0), 100);
          const isGoalAchieved = progress >= 100;
          
          return (
            <div key={account.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{account.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(equity, account.currency)} / {formatCurrency(account.equity_goal!, account.currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${isGoalAchieved ? 'text-green-600' : ''}`}>
                    {progressClamped.toFixed(1)}%
                  </p>
                  {isGoalAchieved && (
                    <Badge variant="default" className="text-xs">
                      Goal Achieved! 🎉
                    </Badge>
                  )}
                </div>
              </div>
              <Progress 
                value={progressClamped} 
                className="h-2"
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

interface TradingAccount {
  id: string;
  name: string;
  account_type: string;
  initial_balance: number;
  current_balance: number;
  current_equity: number;
  currency: string;
  equity_goal?: number;
}

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
  mostTradedAsset: string;
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
    initialBalance: 0,
    mostTradedAsset: ''
  });
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [equityData, setEquityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [primaryAccountId, setPrimaryAccountId] = useState<string | null>(null);
  const [allTrades, setAllTrades] = useState<any[]>([]);
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');
  const [timeFilter, setTimeFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, selectedAccountId, sortOrder, timeFilter]); // Add timeFilter dependency

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

      const allTrades = tradesResult.data || [];
      const allAccounts = accountsResult.data || [];
      
      setAccounts(allAccounts);

      // Set primary account on first login if not already set
      if (allAccounts.length > 0 && selectedAccountId === 'all' && !primaryAccountId) {
        const savedPrimaryId = localStorage.getItem('primaryAccountId');
        if (savedPrimaryId && allAccounts.find(acc => acc.id === savedPrimaryId)) {
          setPrimaryAccountId(savedPrimaryId);
          setSelectedAccountId(savedPrimaryId);
        }
      }

      // Filter trades by selected account
      let filteredTrades = selectedAccountId === 'all' 
        ? allTrades 
        : allTrades.filter(trade => trade.trading_account_id === selectedAccountId);

      // Apply time filter
      if (timeFilter !== 'all') {
        const now = new Date();
        const filterDate = new Date();
        
        switch (timeFilter) {
          case '7d':
            filterDate.setDate(now.getDate() - 7);
            break;
          case '30d':
            filterDate.setDate(now.getDate() - 30);
            break;
          case '90d':
            filterDate.setDate(now.getDate() - 90);
            break;
          case '6m':
            filterDate.setMonth(now.getMonth() - 6);
            break;
          case '1y':
            filterDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        filteredTrades = filteredTrades.filter(trade => 
          new Date(trade.entry_date) >= filterDate
        );
      }

      const trades = filteredTrades;

      // Filter accounts by selected account for balance calculations
      const accounts = selectedAccountId === 'all'
        ? allAccounts
        : allAccounts.filter(account => account.id === selectedAccountId);

      // Calculate account totals from trades
      const totalInitialBalance = accounts.reduce((sum, account) => sum + (account.initial_balance || 0), 0);
      
      // Calculate equity from trades
      const accountEquities: Record<string, number> = {};
      let totalCurrentEquity = 0;
      
      accounts.forEach(account => {
        const accountTrades = filteredTrades.filter(trade => trade.trading_account_id === account.id);
        const accountPnl = accountTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
        const equity = account.initial_balance + accountPnl;
        accountEquities[account.id] = equity;
        totalCurrentEquity += equity;
      });

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

      // Calculate most traded asset
      const symbolCounts = trades.reduce((acc, trade) => {
        acc[trade.symbol] = (acc[trade.symbol] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const mostTradedAsset = Object.keys(symbolCounts).length > 0 
        ? Object.entries(symbolCounts).sort(([,a], [,b]) => b - a)[0][0] 
        : '';

      setStats({
        totalPnl,
        winRate,
        totalTrades: trades.length,
        activeTrades: activeTrades.length,
        bestTrade,
        worstTrade,
        avgWin,
        avgLoss,
        currentBalance: totalCurrentEquity,
        initialBalance: totalInitialBalance,
        mostTradedAsset
      });

      // Sort trades based on current sort order
      const sortedTrades = [...trades].sort((a, b) => {
        const dateA = new Date(a.entry_date).getTime();
        const dateB = new Date(b.entry_date).getTime();
        return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
      });

      setRecentTrades(sortedTrades.slice(0, 5));
      setAllTrades(trades);

      // Generate equity curve data showing progression to current balance
      const equitySortedTrades = closedTrades.sort((a, b) => new Date(a.exit_date || a.entry_date).getTime() - new Date(b.exit_date || b.entry_date).getTime());
      let runningBalance = totalInitialBalance || 0;
      const equityCurve = [{ date: 'Start', balance: runningBalance }];
      
      equitySortedTrades.forEach((trade) => {
        runningBalance += (trade.pnl || 0);
        equityCurve.push({
          date: new Date(trade.exit_date || trade.entry_date).toLocaleDateString(),
          balance: runningBalance
        });
      });

      // Add current balance as the final point if different from calculated
      if (equitySortedTrades.length > 0 && Math.abs(runningBalance - totalCurrentEquity) > 0.01) {
        equityCurve.push({
          date: 'Current',
          balance: totalCurrentEquity
        });
      } else if (sortedTrades.length === 0) {
        // If no trades, just show progression from initial to current
        equityCurve.push({
          date: 'Current',
          balance: totalCurrentEquity
        });
      }
      
      setEquityData(equityCurve);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStarAccount = (accountId: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const newPrimaryId = primaryAccountId === accountId ? null : accountId;
    setPrimaryAccountId(newPrimaryId);
    if (newPrimaryId) {
      localStorage.setItem('primaryAccountId', newPrimaryId);
      setSelectedAccountId(newPrimaryId);
    } else {
      localStorage.removeItem('primaryAccountId');
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
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
      <div className="space-y-4 md:space-y-8">
        {/* Header with Account Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Performance Dashboard</h1>
            <p className="text-muted-foreground">Monitor your trading performance and analytics</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Time Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Period:</span>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-[140px] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-lg">
                  <SelectItem value="all" className="hover:bg-muted/50">All Time</SelectItem>
                  <SelectItem value="7d" className="hover:bg-muted/50">Last 7 Days</SelectItem>
                  <SelectItem value="30d" className="hover:bg-muted/50">Last 30 Days</SelectItem>
                  <SelectItem value="90d" className="hover:bg-muted/50">Last 3 Months</SelectItem>
                  <SelectItem value="6m" className="hover:bg-muted/50">Last 6 Months</SelectItem>
                  <SelectItem value="1y" className="hover:bg-muted/50">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Account Selector */}
            {accounts.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Account:</span>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="w-[180px] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border shadow-lg">
                    <SelectItem value="all" className="hover:bg-muted/50">All Accounts</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id} className="hover:bg-muted/50">
                        <div className="flex items-center justify-between w-full">
                          <span>{account.name}</span>
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleStarAccount(account.id, e);
                            }}
                            className="ml-2 p-1 hover:bg-muted rounded cursor-pointer"
                            role="button"
                            tabIndex={0}
                            aria-label={`${primaryAccountId === account.id ? 'Unstar' : 'Star'} ${account.name}`}
                          >
                            <Star 
                              className={`h-3 w-3 ${primaryAccountId === account.id ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'}`} 
                            />
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={() => navigate('/trades/new')} className="gap-2">
              <Plus className="h-4 w-4" />
              New Trade Entry
            </Button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
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

        {/* Account Progress Indicators */}
        <AccountGoalsSection accounts={accounts} user={user} formatCurrency={formatCurrency} />

        {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          {/* Equity Curve */}
          <Card className="metric-card">
            <CardHeader className="pb-2 sm:pb-4 p-3 sm:p-6">
              <CardTitle className="text-lg font-semibold">Equity Metrics</CardTitle>
              <CardDescription>Account balance progression over time</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
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
            <CardHeader className="pb-2 sm:pb-4 p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Recent Trades</CardTitle>
                  <CardDescription>Your latest trading activity</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => setSortOrder(sortOrder === 'latest' ? 'oldest' : 'latest')}
                >
                  {sortOrder === 'latest' ? 'Latest' : 'Oldest'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
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
                    <div 
                      key={trade.id} 
                      className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors cursor-pointer"
                      onClick={() => navigate(`/trades/${trade.id}`)}
                    >
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
                          variant={trade.status === 'open' ? 'outline' : 'secondary'}
                          className="text-xs"
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

        {/* Smart Suggestions Section */}
        <SmartSuggestions trades={allTrades} />

        {/* Additional Performance Metrics */}
        <Card className="metric-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Your Top Assets</CardTitle>
            <CardDescription>Most traded asset performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Most Traded</div>
                <div className="text-lg font-semibold">{stats.mostTradedAsset || 'N/A'}</div>
              </div>
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
