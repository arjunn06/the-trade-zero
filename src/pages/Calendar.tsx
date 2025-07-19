import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, isWithinInterval } from 'date-fns';
import { TrendingUp, TrendingDown, Calendar as CalendarIcon, Target, DollarSign, BarChart3 } from 'lucide-react';

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

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedDateTrades, setSelectedDateTrades] = useState<any[]>([]);
  const [dayPnLData, setDayPnLData] = useState<DayPnL[]>([]);
  const [periodMetrics, setPeriodMetrics] = useState<PeriodMetrics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchPnLData();
    }
  }, [user]);

  useEffect(() => {
    if (date && user) {
      fetchTradesForDate(date);
      calculatePeriodMetrics();
    }
  }, [date, user, selectedPeriod, dayPnLData]);

  const fetchPnLData = async () => {
    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select('exit_date, entry_date, pnl, symbol, trade_type')
        .eq('user_id', user?.id)
        .eq('status', 'closed')
        .not('pnl', 'is', null);

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

  const fetchTradesForDate = async (selectedDate: Date) => {
    try {
      const { data: trades, error } = await supabase
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
    
    if (!pnlData) {
      return (
        <div className={`w-full h-full flex flex-col items-center justify-center p-1 rounded-md transition-colors hover:bg-accent ${isSelected ? 'bg-primary text-primary-foreground' : ''}`}>
          <div className="text-sm font-medium">{day.getDate()}</div>
        </div>
      );
    }

    const isProfit = pnlData.pnl > 0;
    const isLoss = pnlData.pnl < 0;

    return (
      <div className={`w-full h-full flex flex-col items-center justify-center p-1 rounded-md transition-colors hover:bg-accent ${
        isSelected ? 'bg-primary text-primary-foreground' : 
        isProfit ? 'bg-profit/10 hover:bg-profit/20' : 
        isLoss ? 'bg-loss/10 hover:bg-loss/20' : ''
      }`}>
        <div className="text-sm font-medium">{day.getDate()}</div>
        <div className={`text-xs font-bold ${
          isSelected ? 'text-primary-foreground' :
          isProfit ? 'text-profit' : 
          isLoss ? 'text-loss' : 'text-muted-foreground'
        }`}>
          ${Math.abs(pnlData.pnl) >= 1000 ? 
            `${(pnlData.pnl / 1000).toFixed(1)}k` : 
            pnlData.pnl.toFixed(0)
          }
        </div>
        <div className="text-xs text-muted-foreground">{pnlData.trades}T</div>
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">P&L Calendar</h1>
          <p className="text-muted-foreground">Track your daily trading performance</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Enhanced Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Trading Calendar
              </CardTitle>
              <CardDescription>
                Click on any date to view detailed trading metrics. Green indicates profit, red indicates loss.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[320px]">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border w-full"
                components={{
                  Day: ({ date: dayDate, ...props }) => (
                    <div 
                      {...props}
                      className="relative w-full h-16 cursor-pointer"
                      onClick={() => setDate(dayDate)}
                    >
                      {getDayComponent(dayDate)}
                    </div>
                  )
                }}
              />
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Day Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {date ? format(date, 'MMM dd, yyyy') : 'Select a Date'}
              </CardTitle>
              <CardDescription>
                Detailed metrics for the selected day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedDayData ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm text-muted-foreground">Total P&L</div>
                        <div className={`text-lg font-bold ${selectedDayData.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {formatCurrency(selectedDayData.pnl)}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm text-muted-foreground">Win Rate</div>
                        <div className="text-lg font-bold">
                          {selectedDayData.winRate.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm text-muted-foreground">Best Trade</div>
                        <div className="text-lg font-bold text-profit">
                          {formatCurrency(selectedDayData.bestTrade)}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm text-muted-foreground">Worst Trade</div>
                        <div className="text-lg font-bold text-loss">
                          {formatCurrency(selectedDayData.worstTrade)}
                        </div>
                      </div>
                    </div>

                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground">Total Trades</div>
                      <div className="text-lg font-bold">{selectedDayData.trades}</div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No trading data for this day</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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