import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfDay, endOfDay } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DayPnL {
  date: string;
  pnl: number;
  trades: number;
}

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedDateTrades, setSelectedDateTrades] = useState<any[]>([]);
  const [dayPnLData, setDayPnLData] = useState<DayPnL[]>([]);
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
    }
  }, [date, user]);

  const fetchPnLData = async () => {
    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select('exit_date, pnl')
        .eq('user_id', user?.id)
        .eq('status', 'closed')
        .not('pnl', 'is', null);

      if (error) throw error;

      const pnlByDate = trades.reduce((acc: Record<string, { pnl: number; trades: number }>, trade) => {
        if (trade.exit_date && trade.pnl !== null) {
          const dateKey = format(new Date(trade.exit_date), 'yyyy-MM-dd');
          if (!acc[dateKey]) {
            acc[dateKey] = { pnl: 0, trades: 0 };
          }
          acc[dateKey].pnl += Number(trade.pnl);
          acc[dateKey].trades += 1;
        }
        return acc;
      }, {});

      const dayPnLArray = Object.entries(pnlByDate).map(([date, data]) => ({
        date,
        pnl: data.pnl,
        trades: data.trades,
      }));

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
          trading_accounts!inner(name),
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

  const getDayPnL = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return dayPnLData.find(data => data.date === dateKey);
  };

  const getDayComponent = (day: Date) => {
    const pnlData = getDayPnL(day);
    if (!pnlData) return null;

    const isProfit = pnlData.pnl > 0;
    const isLoss = pnlData.pnl < 0;

    return (
      <div className="w-full">
        <div className="text-xs font-medium">
          {day.getDate()}
        </div>
        <div className={`text-xs ${isProfit ? 'text-profit' : isLoss ? 'text-loss' : 'text-muted-foreground'}`}>
          ${pnlData.pnl.toFixed(0)}
        </div>
      </div>
    );
  };

  const totalPnL = selectedDateTrades.reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0);
  const winningTrades = selectedDateTrades.filter(trade => Number(trade.pnl) > 0).length;
  const losingTrades = selectedDateTrades.filter(trade => Number(trade.pnl) < 0).length;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-lg font-semibold">P&L Calendar</h1>
          </header>

          <div className="flex-1 space-y-4 p-4 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Trading Calendar</CardTitle>
                  <CardDescription>
                    View your daily trading performance. Click on a date to see detailed trades.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md border"
                    components={{
                      Day: ({ date: dayDate, ...props }) => {
                        const pnlData = getDayPnL(dayDate);
                        return (
                          <div 
                            {...props}
                            className={`
                              relative p-2 text-center hover:bg-accent rounded-md cursor-pointer
                              ${pnlData ? (pnlData.pnl > 0 ? 'bg-profit/10' : pnlData.pnl < 0 ? 'bg-loss/10' : 'bg-muted/10') : ''}
                              ${date && format(dayDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd') ? 'bg-primary text-primary-foreground' : ''}
                            `}
                          >
                            {getDayComponent(dayDate) || <div className="text-sm">{dayDate.getDate()}</div>}
                          </div>
                        );
                      }
                    }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    {date ? format(date, 'MMMM dd, yyyy') : 'Select a Date'}
                  </CardTitle>
                  <CardDescription>
                    Trading summary for the selected day
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total P&L</span>
                      <div className="flex items-center gap-2">
                        {totalPnL > 0 ? (
                          <TrendingUp className="h-4 w-4 text-profit" />
                        ) : totalPnL < 0 ? (
                          <TrendingDown className="h-4 w-4 text-loss" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={`font-medium ${totalPnL > 0 ? 'text-profit' : totalPnL < 0 ? 'text-loss' : 'text-muted-foreground'}`}>
                          ${totalPnL.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Winning Trades</div>
                        <div className="text-lg font-medium text-profit">{winningTrades}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Losing Trades</div>
                        <div className="text-lg font-medium text-loss">{losingTrades}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Total Trades</div>
                      <div className="text-lg font-medium">{selectedDateTrades.length}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {selectedDateTrades.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Trades on {date ? format(date, 'MMMM dd, yyyy') : ''}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedDateTrades.map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{trade.symbol}</Badge>
                          <div>
                            <div className="font-medium">{trade.trade_type.toUpperCase()}</div>
                            <div className="text-sm text-muted-foreground">
                              {trade.trading_accounts?.name} • {trade.strategies?.name || 'No Strategy'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${Number(trade.pnl) > 0 ? 'text-profit' : Number(trade.pnl) < 0 ? 'text-loss' : 'text-muted-foreground'}`}>
                            ${Number(trade.pnl).toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Qty: {Number(trade.quantity)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}