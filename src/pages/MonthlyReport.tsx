import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MetricDisplay } from "@/components/ui/metric-display";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar as CalendarIcon, Download, DollarSign, Target, BarChart3, Award } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface MonthlyStats {
  totalPnl: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
  expectancy: number;
  monthStart: Date;
  monthEnd: Date;
}

interface DailyPerformance {
  date: string;
  pnl: number;
  trades: number;
}

export default function MonthlyReport() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(0); // 0=current, 1=last month, etc.
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [dailyData, setDailyData] = useState<DailyPerformance[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchMonthlyReport();
    }
  }, [user, selectedMonth, selectedAccountId]);

  const fetchMonthlyReport = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Accounts
      const { data: accountsData } = await supabase
        .from("trading_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);
      setAccounts(accountsData || []);

      // Month range
      const now = new Date();
      const monthStart = startOfMonth(subMonths(now, selectedMonth));
      const monthEnd = endOfMonth(subMonths(now, selectedMonth));

      // Trades for month — use exit_date to reflect realized P&L
      let tradesQuery = supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .gte("exit_date", monthStart.toISOString())
        .lte("exit_date", monthEnd.toISOString())
        .eq("status", "closed");

      if (selectedAccountId !== "all") {
        tradesQuery = tradesQuery.eq("trading_account_id", selectedAccountId);
      } else if (accountsData && accountsData.length > 0) {
        const activeAccountIds = accountsData.map((a) => a.id);
        tradesQuery = tradesQuery.in("trading_account_id", activeAccountIds);
      }

      const { data: trades } = await tradesQuery;
      const monthTrades = trades || [];

      const totalPnl = monthTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const winningTrades = monthTrades.filter((t) => (t.pnl || 0) > 0);
      const losingTrades = monthTrades.filter((t) => (t.pnl || 0) < 0);
      const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));

      const stats: MonthlyStats = {
        totalPnl,
        totalTrades: monthTrades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate: monthTrades.length > 0 ? (winningTrades.length / monthTrades.length) * 100 : 0,
        avgWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
        avgLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
        bestTrade: monthTrades.length > 0 ? Math.max(...monthTrades.map((t) => t.pnl || 0)) : 0,
        worstTrade: monthTrades.length > 0 ? Math.min(...monthTrades.map((t) => t.pnl || 0)) : 0,
        profitFactor: totalLosses > 0 ? totalWins / totalLosses : 0,
        expectancy: monthTrades.length > 0 ? totalPnl / monthTrades.length : 0,
        monthStart,
        monthEnd,
      };
      setMonthlyStats(stats);

      // Daily breakdown
      const days: Record<string, { pnl: number; trades: number }> = {};
      for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        days[format(d, "yyyy-MM-dd")] = { pnl: 0, trades: 0 };
      }
      monthTrades.forEach((t) => {
        const dateKey = format(new Date(t.exit_date), "yyyy-MM-dd");
        if (days[dateKey]) {
          days[dateKey].pnl += t.pnl || 0;
          days[dateKey].trades += 1;
        }
      });
      const dailyPerformance = Object.entries(days).map(([date, data]) => ({
        date: format(new Date(date), "d"),
        pnl: data.pnl,
        trades: data.trades,
      }));
      setDailyData(dailyPerformance);
    } finally {
      setLoading(false);
    }
  };

  const getMonthDisplayText = (offset: number) => {
    if (offset === 0) return "This Month";
    if (offset === 1) return "Last Month";
    return `${offset} Months Ago`;
  };

  const exportReport = () => {
    if (!monthlyStats) return;
    const report = {
      period: `${format(monthlyStats.monthStart, "MMM dd")} - ${format(monthlyStats.monthEnd, "MMM dd, yyyy")}`,
      totalPnl: monthlyStats.totalPnl,
      totalTrades: monthlyStats.totalTrades,
      winRate: `${monthlyStats.winRate.toFixed(1)}%`,
      profitFactor: monthlyStats.profitFactor.toFixed(2),
      expectancy: monthlyStats.expectancy.toFixed(2),
      bestTrade: monthlyStats.bestTrade,
      worstTrade: monthlyStats.worstTrade,
      dailyBreakdown: dailyData,
    };
    const dataStr = JSON.stringify(report, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `monthly-report-${format(monthlyStats.monthStart, "yyyy-MM")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" text="Generating monthly report..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Monthly Trading Report</h1>
            <p className="text-muted-foreground">
              {monthlyStats && `${format(monthlyStats.monthStart, "MMM dd")} - ${format(monthlyStats.monthEnd, "MMM dd, yyyy")}`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5].map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {getMonthDisplayText(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={exportReport} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {monthlyStats ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricDisplay
                label="Total P&L"
                value={monthlyStats.totalPnl}
                format="currency"
                icon={DollarSign}
                trend={monthlyStats.totalPnl > 0 ? "up" : monthlyStats.totalPnl < 0 ? "down" : "neutral"}
              />

              <MetricDisplay
                label="Win Rate"
                value={monthlyStats.winRate}
                format="percentage"
                icon={Target}
                change={{ value: monthlyStats.winRate - 50, label: "vs 50%" }}
              />

              <MetricDisplay label="Total Trades" value={monthlyStats.totalTrades} icon={BarChart3} />

              <MetricDisplay
                label="Profit Factor"
                value={monthlyStats.profitFactor}
                format="number"
                icon={Award}
                trend={monthlyStats.profitFactor > 1 ? "up" : "down"}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" /> Daily Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "P&L"]} />
                      <Bar dataKey="pnl" fill="#8884d8" name="P&L" className="opacity-80" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Additional Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Key performance indicators for the selected month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">${monthlyStats.expectancy.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Expected Value per Trade</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold">{monthlyStats.profitFactor.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Profit Factor</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold">{monthlyStats.winRate.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">Win Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
              <p className="text-muted-foreground text-center max-w-md">
                No trades found for the selected month. Try selecting a different time period or account.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
