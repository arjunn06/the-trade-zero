import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardLayout } from '@/components/DashboardLayout';
import { LoadingCard } from '@/components/ui/loading-spinner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, isWithinInterval, getWeek, getMonth, getYear } from 'date-fns';
import { TrendingUp, TrendingDown, Calendar as CalendarIcon, Target, DollarSign, BarChart3 } from 'lucide-react';
import { AccountFilter } from '@/components/AccountFilter';

interface DayPnL {
  date: string;
  pnl: number;
  trades: number;
  winRate: number;
  bestTrade: number;
  worstTrade: number;
}

interface PeriodMetrics {
  totalPnl: number;
  totalTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  bestDay: number;
  worstDay: number;
  profitableDays: number;
  tradingDays: number;
}

interface WeeklySummary {
  weekNumber: number;
  year: number;
  startDate: Date;
  endDate: Date;
  totalPnl: number;
  totalTrades: number;
  isCurrentWeek: boolean;
}

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedDateTrades, setSelectedDateTrades] = useState<any[]>([]);
  const [dayPnLData, setDayPnLData] = useState<DayPnL[]>([]);
  const [periodMetrics, setPeriodMetrics] = useState<PeriodMetrics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [tradingAccounts, setTradingAccounts] = useState<{ id: string; name: string; }[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchPnLData();
      fetchTradingAccounts();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPnLData();
    }
  }, [user, selectedAccount]);

  useEffect(() => {
    if (date && user) {
      fetchTradesForDate(date);
      calculatePeriodMetrics();
      calculateWeeklySummaries();
    }
  }, [date, user, selectedPeriod, dayPnLData, selectedAccount]);

  const fetchTradingAccounts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('trading_accounts')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setTradingAccounts(data || []);
    } catch (error) {
      console.error('Error fetching trading accounts:', error);
    }
  };

  const fetchPnLData = async () => {
    try {
      let query = supabase
        .from('trades')
        .select('exit_date, entry_date, pnl, symbol, trade_type, trading_account_id')
        .eq('user_id', user?.id)
        .eq('status', 'closed')
        .not('pnl', 'is', null);

      if (selectedAccount) {
        query = query.eq('trading_account_id', selectedAccount);
      }

      const { data: trades, error } = await query;

      if (error) throw error;

      const pnlByDate = trades.reduce((acc: Record<string, { pnl: number; trades: any[]; }>, trade) => {
        if (trade.exit_date && trade.pnl !== null) {
          const dateKey = format(new Date(trade.exit_date), 'yyyy-MM-dd');
          if (!acc[dateKey]) {
            acc[dateKey] = { pnl: 0, trades: [] };
          }
          acc[dateKey].pnl += Number(trade.pnl);
          acc[dateKey].trades.push(trade);
        }
        return acc;
      }, {});

      const dayPnLArray = Object.entries(pnlByDate).map(([date, data]) => {
        const winningTrades = data.trades.filter(t => Number(t.pnl) > 0);
        const losingTrades = data.trades.filter(t => Number(t.pnl) < 0);
        const winRate = data.trades.length > 0 ? (winningTrades.length / data.trades.length) * 100 : 0;
        const bestTrade = data.trades.length > 0 ? Math.max(...data.trades.map(t => Number(t.pnl))) : 0;
        const worstTrade = data.trades.length > 0 ? Math.min(...data.trades.map(t => Number(t.pnl))) : 0;

        return {
          date,
          pnl: data.pnl,
          trades: data.trades.length,
          winRate,
          bestTrade,
          worstTrade,
        };
      });

      setDayPnLData(dayPnLArray);
    } catch (error) {
      console.error('Error fetching P&L data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklySummaries = () => {
    if (!date || dayPnLData.length === 0) {
      setWeeklySummaries([]);
      return;
    }

    const currentMonth = getMonth(date);
    const currentYear = getYear(date);
    const weeksMap = new Map<string, WeeklySummary>();

    // Get all weeks that have data in the current month
    dayPnLData.forEach(dayData => {
      const dayDate = new Date(dayData.date);
      const dayMonth = getMonth(dayDate);
      const dayYear = getYear(dayDate);
      
      // Only include days from the current month/year
      if (dayMonth === currentMonth && dayYear === currentYear) {
        const weekStart = startOfWeek(dayDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(dayDate, { weekStartsOn: 1 });
        const weekNumber = getWeek(dayDate, { weekStartsOn: 1 });
        const weekKey = `${dayYear}-${weekNumber}`;

        if (!weeksMap.has(weekKey)) {
          weeksMap.set(weekKey, {
            weekNumber,
            year: dayYear,
            startDate: weekStart,
            endDate: weekEnd,
            totalPnl: 0,
            totalTrades: 0,
            isCurrentWeek: isWithinInterval(date, { start: weekStart, end: weekEnd })
          });
        }

        const weekSummary = weeksMap.get(weekKey)!;
        weekSummary.totalPnl += dayData.pnl;
        weekSummary.totalTrades += dayData.trades;
      }
    });

    const summaries = Array.from(weeksMap.values()).sort((a, b) => a.weekNumber - b.weekNumber);
    setWeeklySummaries(summaries);
  };

  const fetchTradesForDate = async (selectedDate: Date) => {
    try {
      let query = supabase
        .from('trades')
        .select(`
          *,
          trading_accounts!inner(name, currency),
          strategies(name)
        `)
        .eq('user_id', user?.id)
        .gte('exit_date', startOfDay(selectedDate).toISOString())
        .lte('exit_date', endOfDay(selectedDate).toISOString())
        .eq('status', 'closed');

      if (selectedAccount) {
        query = query.eq('trading_account_id', selectedAccount);
      }

      const { data: trades, error } = await query;

      if (error) throw error;
      setSelectedDateTrades(trades || []);
    } catch (error) {
      console.error('Error fetching trades for date:', error);
    }
  };

  const calculatePeriodMetrics = () => {
    if (!date || dayPnLData.length === 0) return;

    let startDate: Date;
    let endDate: Date;

    if (selectedPeriod === 'week') {
      startDate = startOfWeek(date, { weekStartsOn: 1 });
      endDate = endOfWeek(date, { weekStartsOn: 1 });
    } else {
      startDate = startOfMonth(date);
      endDate = endOfMonth(date);
    }

    const periodData = dayPnLData.filter(day => {
      const dayDate = new Date(day.date);
      return isWithinInterval(dayDate, { start: startDate, end: endDate });
    });

    if (periodData.length === 0) {
      setPeriodMetrics(null);
      return;
    }

    const totalPnl = periodData.reduce((sum, day) => sum + day.pnl, 0);
    const totalTrades = periodData.reduce((sum, day) => sum + day.trades, 0);
    const profitableDays = periodData.filter(day => day.pnl > 0).length;
    const allPnLs = periodData.map(day => day.pnl);
    const bestDay = Math.max(...allPnLs);
    const worstDay = Math.min(...allPnLs);

    // Calculate win rate across all trades in period
    const allWins = periodData.reduce((sum, day) => sum + (day.winRate / 100 * day.trades), 0);
    const winRate = totalTrades > 0 ? (allWins / totalTrades) * 100 : 0;

    const profitableDayPnLs = periodData.filter(day => day.pnl > 0).map(day => day.pnl);
    const losingDayPnLs = periodData.filter(day => day.pnl < 0).map(day => day.pnl);
    
    const avgWin = profitableDayPnLs.length > 0 ? profitableDayPnLs.reduce((sum, pnl) => sum + pnl, 0) / profitableDayPnLs.length : 0;
    const avgLoss = losingDayPnLs.length > 0 ? losingDayPnLs.reduce((sum, pnl) => sum + pnl, 0) / losingDayPnLs.length : 0;

    setPeriodMetrics({
      totalPnl,
      totalTrades,
      winRate,
      avgWin,
      avgLoss,
      bestDay,
      worstDay,
      profitableDays,
      tradingDays: periodData.length
    });
  };

  const getDayPnL = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return dayPnLData.find(data => data.date === dateKey);
  };

  const getDayComponent = (day: Date) => {
    const pnlData = getDayPnL(day);
    const isSelected = date && format(day, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    
    if (!pnlData) {
      return (
        <div className={`w-full h-full flex flex-col items-center justify-center p-2 rounded-md transition-all hover:bg-muted/50 ${
          isSelected ? 'bg-primary text-primary-foreground ring-2 ring-primary' : 
          isToday ? 'ring-2 ring-blue-500 bg-blue-500/10' : ''
        }`}>
          <div className="text-sm font-medium">{day.getDate()}</div>
        </div>
      );
    }

    const isProfit = pnlData.pnl > 0;
    const isLoss = pnlData.pnl < 0;

    return (
      <div className={`w-full h-full flex flex-col items-center justify-center p-2 rounded-md transition-all hover:opacity-80 ${
        isSelected ? 'ring-2 ring-primary' : 
        isToday ? 'ring-2 ring-blue-500' : ''
      } ${
        isProfit ? 'bg-green-500/20 text-green-400' : 
        isLoss ? 'bg-red-500/20 text-red-400' : 'bg-muted/50'
      }`}>
        <div className="text-sm font-medium text-foreground">{day.getDate()}</div>
        <div className={`text-xs font-bold ${
          isProfit ? 'text-green-400' : 
          isLoss ? 'text-red-400' : 'text-muted-foreground'
        }`}>
          {isProfit ? '+' : ''}${Math.abs(pnlData.pnl) >= 1000 ? 
            `${(pnlData.pnl / 1000).toFixed(1)}k` : 
            pnlData.pnl.toFixed(0)
          }
        </div>
        <div className="text-xs text-muted-foreground">{pnlData.trades} trades</div>
      </div>
    );
  };

  const selectedDayData = date ? getDayPnL(date) : null;
  const totalPnL = selectedDateTrades.reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0);
  const winningTrades = selectedDateTrades.filter(trade => Number(trade.pnl) > 0).length;
  const losingTrades = selectedDateTrades.filter(trade => Number(trade.pnl) < 0).length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded w-40 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-64 animate-pulse"></div>
            </div>
            <div className="h-10 bg-muted rounded w-48 animate-pulse"></div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Calendar Skeleton */}
            <div className="lg:col-span-2">
              <LoadingCard className="h-96" />
            </div>
            
            {/* Day Details Skeleton */}
            <LoadingCard className="h-96" />
          </div>
          
          {/* Period Metrics Skeleton */}
          <LoadingCard className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">P&L Calendar</h1>
            <p className="text-muted-foreground">Track your daily trading performance</p>
          </div>
          <div className="min-w-[200px]">
            <AccountFilter
              value={selectedAccount || 'all'}
              onValueChange={(value) => setSelectedAccount(value === 'all' ? '' : value)}
              placeholder="All accounts"
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Enhanced Calendar */}
          <Card className="lg:col-span-3 bg-background border-border">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarIcon className="h-5 w-5" />
                {date ? format(date, 'MMMM yyyy') : 'Trading Calendar'}
              </CardTitle>
              <CardDescription>
                Click on any date to view detailed trading metrics. Green indicates profit, red indicates loss.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="w-full [&_.rdp-table]:w-full [&_.rdp-cell]:h-20 [&_.rdp-day]:h-full [&_.rdp-day]:w-full"
                components={{
                  Day: ({ date: dayDate, ...props }) => (
                    <div 
                      {...props}
                      className="relative w-full h-full cursor-pointer"
                      onClick={() => setDate(dayDate)}
                    >
                      {getDayComponent(dayDate)}
                    </div>
                  )
                }}
              />
            </CardContent>
          </Card>

          {/* Weekly Summaries */}
          <Card className="bg-background border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Weekly Summary</CardTitle>
              <CardDescription>
                {date ? format(date, 'MMMM yyyy') : 'Monthly overview'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {weeklySummaries.length > 0 ? (
                weeklySummaries.map((week, index) => (
                  <div 
                    key={`${week.year}-${week.weekNumber}`}
                    className={`p-4 rounded-lg border transition-all ${
                      week.isCurrentWeek ? 'bg-primary/10 border-primary' : 'bg-muted/50 border-border'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-sm">Week {index + 1}</h4>
                      {week.isCurrentWeek && (
                        <Badge variant="outline" className="text-xs">Current</Badge>
                      )}
                    </div>
                    <div className={`text-xl font-bold mb-1 ${
                      week.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {week.totalPnl >= 0 ? '+' : ''}{formatCurrency(week.totalPnl)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {week.totalTrades} trades
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No trading data this month</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Day Details Section - Only show when date is selected */}
        {date && selectedDayData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {format(date, 'EEEE, MMMM dd, yyyy')}
              </CardTitle>
              <CardDescription>
                Detailed metrics for the selected day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Total P&L</div>
                  <div className={`text-2xl font-bold ${selectedDayData.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedDayData.pnl >= 0 ? '+' : ''}{formatCurrency(selectedDayData.pnl)}
                  </div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Total Trades</div>
                  <div className="text-2xl font-bold">{selectedDayData.trades}</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Win Rate</div>
                  <div className="text-2xl font-bold">{selectedDayData.winRate.toFixed(0)}%</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Best Trade</div>
                  <div className="text-2xl font-bold text-green-400">
                    +{formatCurrency(selectedDayData.bestTrade)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Period Metrics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Period Performance
                </CardTitle>
                <CardDescription>
                  {selectedPeriod === 'week' ? 'Weekly' : 'Monthly'} trading metrics for the selected period
                </CardDescription>
              </div>
              <Select value={selectedPeriod} onValueChange={(value: 'week' | 'month') => setSelectedPeriod(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {periodMetrics ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">Total P&L</div>
                  </div>
                  <div className={`text-xl font-bold ${periodMetrics.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatCurrency(periodMetrics.totalPnl)}
                  </div>
                </div>

                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">Win Rate</div>
                  </div>
                  <div className="text-xl font-bold">
                    {periodMetrics.winRate.toFixed(1)}%
                  </div>
                </div>

                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">Best Day</div>
                  </div>
                  <div className="text-xl font-bold text-profit">
                    {formatCurrency(periodMetrics.bestDay)}
                  </div>
                </div>

                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">Worst Day</div>
                  </div>
                  <div className="text-xl font-bold text-loss">
                    {formatCurrency(periodMetrics.worstDay)}
                  </div>
                </div>

                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Total Trades</div>
                  <div className="text-xl font-bold">{periodMetrics.totalTrades}</div>
                </div>

                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Trading Days</div>
                  <div className="text-xl font-bold">{periodMetrics.tradingDays}</div>
                </div>

                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Profitable Days</div>
                  <div className="text-xl font-bold text-profit">{periodMetrics.profitableDays}</div>
                </div>

                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Avg Win</div>
                  <div className="text-xl font-bold text-profit">
                    {formatCurrency(periodMetrics.avgWin)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No trading data for this {selectedPeriod}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trades for Selected Date */}
        {selectedDateTrades.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Trades on {date ? format(date, 'MMMM dd, yyyy') : ''}</CardTitle>
              <CardDescription>
                Detailed breakdown of all trades executed on the selected day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedDateTrades.map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="font-mono">
                        {trade.symbol}
                      </Badge>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={trade.trade_type === 'long' ? 'default' : 'secondary'}>
                            {trade.trade_type.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Qty: {Number(trade.quantity)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {trade.trading_accounts?.name} • {trade.strategies?.name || 'No Strategy'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${Number(trade.pnl) > 0 ? 'text-profit' : Number(trade.pnl) < 0 ? 'text-loss' : 'text-muted-foreground'}`}>
                        {formatCurrency(Number(trade.pnl))}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Entry: {Number(trade.entry_price).toFixed(5)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}