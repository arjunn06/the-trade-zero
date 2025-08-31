import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/DashboardLayout';
import { MetricCard } from '@/components/MetricCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Cell } from 'recharts';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Activity, DollarSign, Target, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isWithinInterval } from 'date-fns';

interface ComparisonData {
  compareAcross: 'time' | 'accounts' | 'strategies';
  fromDate?: Date;
  toDate?: Date;
  fromAccount?: string;
  toAccount?: string;
  fromStrategy?: string;
  toStrategy?: string;
}

interface ComparisonMetrics {
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  bestTrade: number;
  worstTrade: number;
}

const Comparison = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [primaryMetrics, setPrimaryMetrics] = useState<ComparisonMetrics | null>(null);
  const [secondaryMetrics, setSecondaryMetrics] = useState<ComparisonMetrics | null>(null);
  const [primaryData, setPrimaryData] = useState<any[]>([]);
  const [secondaryData, setSecondaryData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const data = location.state?.comparisonData as ComparisonData;
    if (!data) {
      navigate('/dashboard');
      return;
    }
    setComparisonData(data);
    fetchComparisonData(data);
  }, [location.state, navigate]);

  const fetchComparisonData = async (data: ComparisonData) => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch all trades and accounts
      const [tradesResult, accountsResult] = await Promise.all([
        supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'closed')
          .order('exit_date', { ascending: true }),
        supabase
          .from('trading_accounts')
          .select('*')
          .eq('user_id', user.id)
      ]);

      const allTrades = tradesResult.data || [];
      const allAccounts = accountsResult.data || [];

      if (data.compareAcross === 'time' && data.fromDate && data.toDate) {
        await handleTimeComparison(allTrades, data.fromDate, data.toDate);
      } else if (data.compareAcross === 'accounts' && data.fromAccount && data.toAccount) {
        await handleAccountComparison(allTrades, allAccounts, data.fromAccount, data.toAccount);
      }

    } catch (error) {
      console.error('Error fetching comparison data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeComparison = async (allTrades: any[], fromDate: Date, toDate: Date) => {
    // Split the date range in half for comparison
    const totalDays = Math.abs(toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    const midDate = new Date(fromDate.getTime() + (totalDays / 2) * 24 * 60 * 60 * 1000);

    const firstPeriodTrades = allTrades.filter(trade => {
      const tradeDate = new Date(trade.exit_date || trade.entry_date);
      return isWithinInterval(tradeDate, { start: fromDate, end: midDate });
    });

    const secondPeriodTrades = allTrades.filter(trade => {
      const tradeDate = new Date(trade.exit_date || trade.entry_date);
      return isWithinInterval(tradeDate, { start: midDate, end: toDate });
    });

    setPrimaryMetrics(calculateMetrics(firstPeriodTrades));
    setSecondaryMetrics(calculateMetrics(secondPeriodTrades));
    setPrimaryData(firstPeriodTrades);
    setSecondaryData(secondPeriodTrades);

    // Create chart data showing daily performance
    const combinedData = createTimeComparisonChart(firstPeriodTrades, secondPeriodTrades, fromDate, midDate, toDate);
    setChartData(combinedData);
  };

  const handleAccountComparison = async (allTrades: any[], allAccounts: any[], fromAccountId: string, toAccountId: string) => {
    const fromAccountTrades = allTrades.filter(trade => trade.trading_account_id === fromAccountId);
    const toAccountTrades = allTrades.filter(trade => trade.trading_account_id === toAccountId);

    setPrimaryMetrics(calculateMetrics(fromAccountTrades));
    setSecondaryMetrics(calculateMetrics(toAccountTrades));
    setPrimaryData(fromAccountTrades);
    setSecondaryData(toAccountTrades);

    // Create chart data showing monthly performance for both accounts
    const combinedData = createAccountComparisonChart(fromAccountTrades, toAccountTrades);
    setChartData(combinedData);
  };

  const calculateMetrics = (trades: any[]): ComparisonMetrics => {
    const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = trades.filter(t => (t.pnl || 0) < 0);
    
    const totalPnl = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length : 0;
    
    const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;
    
    const bestTrade = trades.length > 0 ? Math.max(...trades.map(t => t.pnl || 0)) : 0;
    const worstTrade = trades.length > 0 ? Math.min(...trades.map(t => t.pnl || 0)) : 0;
    
    // Calculate max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnl = 0;
    
    trades.forEach(trade => {
      runningPnl += (trade.pnl || 0);
      if (runningPnl > peak) peak = runningPnl;
      const drawdown = peak - runningPnl;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    return {
      totalPnl,
      winRate,
      totalTrades: trades.length,
      avgWin,
      avgLoss,
      profitFactor,
      maxDrawdown,
      bestTrade,
      worstTrade
    };
  };

  const createTimeComparisonChart = (firstPeriod: any[], secondPeriod: any[], fromDate: Date, midDate: Date, toDate: Date) => {
    const chartData = [];
    
    // First period data
    let runningPnl1 = 0;
    firstPeriod.forEach((trade, index) => {
      runningPnl1 += (trade.pnl || 0);
      chartData.push({
        period: `Day ${index + 1}`,
        firstPeriod: runningPnl1,
        secondPeriod: null,
        date: format(new Date(trade.exit_date || trade.entry_date), 'MMM dd')
      });
    });

    // Second period data
    let runningPnl2 = 0;
    secondPeriod.forEach((trade, index) => {
      runningPnl2 += (trade.pnl || 0);
      const existingEntry = chartData.find(d => d.period === `Day ${index + 1}`);
      if (existingEntry) {
        existingEntry.secondPeriod = runningPnl2;
      } else {
        chartData.push({
          period: `Day ${index + 1}`,
          firstPeriod: null,
          secondPeriod: runningPnl2,
          date: format(new Date(trade.exit_date || trade.entry_date), 'MMM dd')
        });
      }
    });

    return chartData;
  };

  const createAccountComparisonChart = (account1Trades: any[], account2Trades: any[]) => {
    const monthlyData: Record<string, { account1: number; account2: number }> = {};
    
    // Process account 1 trades
    account1Trades.forEach(trade => {
      const month = format(new Date(trade.exit_date || trade.entry_date), 'MMM yyyy');
      if (!monthlyData[month]) monthlyData[month] = { account1: 0, account2: 0 };
      monthlyData[month].account1 += (trade.pnl || 0);
    });

    // Process account 2 trades
    account2Trades.forEach(trade => {
      const month = format(new Date(trade.exit_date || trade.entry_date), 'MMM yyyy');
      if (!monthlyData[month]) monthlyData[month] = { account1: 0, account2: 0 };
      monthlyData[month].account2 += (trade.pnl || 0);
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      account1: data.account1,
      account2: data.account2
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getComparisonTitle = () => {
    if (!comparisonData) return 'Comparison';
    
    if (comparisonData.compareAcross === 'time') {
      return `Date Range Comparison: ${comparisonData.fromDate ? format(comparisonData.fromDate, 'MMM dd, yyyy') : ''} - ${comparisonData.toDate ? format(comparisonData.toDate, 'MMM dd, yyyy') : ''}`;
    } else if (comparisonData.compareAcross === 'accounts') {
      return 'Account Performance Comparison';
    }
    return 'Strategy Comparison';
  };

  const getComparisonLabels = () => {
    if (!comparisonData) return { primary: 'Primary', secondary: 'Secondary' };
    
    if (comparisonData.compareAcross === 'time') {
      return { primary: 'First Half', secondary: 'Second Half' };
    } else if (comparisonData.compareAcross === 'accounts') {
      return { primary: 'Account 1', secondary: 'Account 2' };
    }
    return { primary: 'Strategy 1', secondary: 'Strategy 2' };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading comparison data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const labels = getComparisonLabels();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="mb-4 hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold">{getComparisonTitle()}</h1>
            <p className="text-muted-foreground">
              Compare performance metrics across different periods or accounts
            </p>
          </div>
        </div>

        {/* Comparison Overview */}
        {primaryMetrics && secondaryMetrics && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {labels.primary}
                </CardTitle>
                <CardDescription>
                  {primaryData.length} trades • {comparisonData?.compareAcross === 'time' ? 'First period' : 'Primary comparison'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total P&L</p>
                    <p className={`text-2xl font-bold ${primaryMetrics.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(primaryMetrics.totalPnl)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-2xl font-bold">{primaryMetrics.winRate.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Profit Factor:</span>
                    <span className="font-medium">{primaryMetrics.profitFactor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Win:</span>
                    <span className="font-medium text-green-600">{formatCurrency(primaryMetrics.avgWin)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Loss:</span>
                    <span className="font-medium text-red-600">{formatCurrency(primaryMetrics.avgLoss)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  {labels.secondary}
                </CardTitle>
                <CardDescription>
                  {secondaryData.length} trades • {comparisonData?.compareAcross === 'time' ? 'Second period' : 'Secondary comparison'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total P&L</p>
                    <p className={`text-2xl font-bold ${secondaryMetrics.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(secondaryMetrics.totalPnl)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-2xl font-bold">{secondaryMetrics.winRate.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Profit Factor:</span>
                    <span className="font-medium">{secondaryMetrics.profitFactor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Win:</span>
                    <span className="font-medium text-green-600">{formatCurrency(secondaryMetrics.avgWin)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Loss:</span>
                    <span className="font-medium text-red-600">{formatCurrency(secondaryMetrics.avgLoss)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Performance Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Performance Comparison Chart</CardTitle>
              <CardDescription>
                {comparisonData?.compareAcross === 'time' ? 'Cumulative P&L over time periods' : 'Monthly performance comparison'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                {comparisonData?.compareAcross === 'time' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), '']}
                      labelFormatter={(label) => `Period: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="firstPeriod" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name={labels.primary}
                      connectNulls={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="secondPeriod" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name={labels.secondary}
                      connectNulls={false}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                    <Bar dataKey="account1" fill="#8884d8" name={labels.primary} />
                    <Bar dataKey="account2" fill="#82ca9d" name={labels.secondary} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Detailed Metrics Comparison */}
        {primaryMetrics && secondaryMetrics && (
          <Card>
            <CardHeader>
              <CardTitle>Detailed Metrics Comparison</CardTitle>
              <CardDescription>Side-by-side comparison of key performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-4">
                  <h4 className="font-medium">Risk Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Max Drawdown</span>
                      <div className="text-right">
                        <div className="text-sm text-red-600">{formatCurrency(primaryMetrics.maxDrawdown)}</div>
                        <div className="text-xs text-muted-foreground">vs {formatCurrency(secondaryMetrics.maxDrawdown)}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Worst Trade</span>
                      <div className="text-right">
                        <div className="text-sm text-red-600">{formatCurrency(primaryMetrics.worstTrade)}</div>
                        <div className="text-xs text-muted-foreground">vs {formatCurrency(secondaryMetrics.worstTrade)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Performance Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Best Trade</span>
                      <div className="text-right">
                        <div className="text-sm text-green-600">{formatCurrency(primaryMetrics.bestTrade)}</div>
                        <div className="text-xs text-muted-foreground">vs {formatCurrency(secondaryMetrics.bestTrade)}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Total Trades</span>
                      <div className="text-right">
                        <div className="text-sm">{primaryMetrics.totalTrades}</div>
                        <div className="text-xs text-muted-foreground">vs {secondaryMetrics.totalTrades}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Win/Loss Analysis</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Win Rate</span>
                      <div className="text-right">
                        <div className="text-sm">{primaryMetrics.winRate.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">vs {secondaryMetrics.winRate.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Profit Factor</span>
                      <div className="text-right">
                        <div className="text-sm">{primaryMetrics.profitFactor.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">vs {secondaryMetrics.profitFactor.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Comparison;