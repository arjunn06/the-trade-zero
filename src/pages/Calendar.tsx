import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
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
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchPnLData();
    }
  }, [user]);

  useEffect(() => {
    if (date && user) {
      fetchTradesForDate(date);
      calculatePeriodMetrics();
    }
  }, [date, user, selectedPeriod, dayPnLData, selectedAccount]);

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from('trading_accounts')
      .select('*')
      .eq('user_id', user?.id);

    if (!error) setAccounts(data || []);
  };

  const fetchPnLData = async () => {
  try {
    const { data: trades, error } = await supabase
      .from('trades')
      .select('exit_date, entry_date, pnl, symbol, trade_type')
      .eq('user_id', user?.id)
      .eq('status', 'closed')
      .not('pnl', 'is', null);

    if (error) throw error;

    type Trade = {
      exit_date: string;
      pnl: number;
      symbol: string;
      trade_type: string;
    };

    type PnLAccumulator = Record<string, { pnl: number; trades: Trade[] }>;

    function groupPnLByDate(trades: Trade[]): PnLAccumulator {
      const acc: PnLAccumulator = {};

      for (const trade of trades) {
        const dateKey = format(new Date(trade.exit_date), 'yyyy-MM-dd');
        if (!acc[dateKey]) {
          acc[dateKey] = { pnl: 0, trades: [] };
        }
        acc[dateKey].pnl += Number(trade.pnl);
        acc[dateKey].trades.push(trade);
      }

      return acc;
    }

    const pnlByDate = groupPnLByDate(trades);

    const dayPnLArray: DayPnL[] = Object.entries(pnlByDate).map(([date, data]) => {
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

      const { data: trades, error } = await query;

      if (error) throw error;

      type PnLAccumulator = Record<string, { pnl: number; trades: any[] }>;

       const pnlByDate: PnLAccumulator = trades.reduce((acc, trade) => {
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
        query = query.eq('account_id', selectedAccount);
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

  const totalPnL = selectedDateTrades.reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const selectedDayData = date ? getDayPnL(date) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">P&L Calendar</h1>
            <p className="text-muted-foreground">Track your daily trading performance</p>
          </div>
          <Select value={selectedAccount ?? undefined} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ... rest of your calendar + metrics UI */}
        {/* Leave the rest of the JSX as it was */}
      </div>
    </DashboardLayout>
  );
}