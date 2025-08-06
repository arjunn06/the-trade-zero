import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { MetricCard } from '@/components/MetricCard';

interface TradingAccount {
  id: string;
  name: string;
  account_type: string;
  broker: string;
  initial_balance: number;
  current_balance: number;
  current_equity: number;
  currency: string;
  is_active: boolean;
  equity_goal?: number;
}

interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnL: number;
  averagePnL: number;
  bestTrade: number;
  worstTrade: number;
  winRate: number;
}

const AccountPerformance = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [account, setAccount] = useState<TradingAccount | null>(null);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);

  useEffect(() => {
    if (user && id) {
      fetchAccountData();
    }
  }, [user, id]);

  const fetchAccountData = async () => {
    if (!user || !id) return;

    try {
      // Fetch account details
      const { data: accountData, error: accountError } = await supabase
        .from('trading_accounts')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (accountError) throw accountError;
      setAccount(accountData);

      // Fetch trades for this account
      const { data: tradesData, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('trading_account_id', id)
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      if (tradesError) throw tradesError;

      // Calculate statistics
      if (tradesData) {
        const closedTrades = tradesData.filter(trade => trade.status === 'closed');
        const totalPnL = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
        const winningTrades = closedTrades.filter(trade => (trade.pnl || 0) > 0);
        const losingTrades = closedTrades.filter(trade => (trade.pnl || 0) < 0);
        const pnlValues = closedTrades.map(trade => trade.pnl || 0);

        setStats({
          totalTrades: tradesData.length,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length,
          totalPnL,
          averagePnL: closedTrades.length > 0 ? totalPnL / closedTrades.length : 0,
          bestTrade: pnlValues.length > 0 ? Math.max(...pnlValues) : 0,
          worstTrade: pnlValues.length > 0 ? Math.min(...pnlValues) : 0,
          winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0
        });

        setRecentTrades(tradesData.slice(0, 10));
      }

    } catch (error) {
      console.error('Error fetching account data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">Loading account performance...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!account) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">Account not found</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/trading-accounts')}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to Accounts
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{account.name}</h1>
              <p className="text-muted-foreground">
                {account.account_type} • {account.broker}
              </p>
            </div>
          </div>
          <Badge variant={account.is_active ? "default" : "secondary"}>
            {account.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>

        {/* Account Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard
            title="Current Balance"
            value={formatCurrency(account.current_balance, account.currency)}
            icon={<DollarSign />}
            change={{
              value: account.current_balance - account.initial_balance,
              percentage: `${((account.current_balance - account.initial_balance) / account.initial_balance * 100).toFixed(1)}%`,
              isPositive: account.current_balance > account.initial_balance
            }}
          />
          <MetricCard
            title="Current Equity"
            value={formatCurrency(account.current_equity, account.currency)}
            icon={<TrendingUp />}
          />
          <MetricCard
            title="Initial Balance"
            value={formatCurrency(account.initial_balance, account.currency)}
            icon={<DollarSign />}
          />
          {account.equity_goal && (
            <MetricCard
              title="Equity Goal"
              value={formatCurrency(account.equity_goal, account.currency)}
              icon={<TrendingUp />}
              change={{
                value: account.current_equity - account.equity_goal,
                percentage: `${((account.current_equity / account.equity_goal) * 100).toFixed(1)}%`,
                isPositive: account.current_equity >= account.equity_goal
              }}
            />
          )}
        </div>

        {/* Trading Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Total Trades"
              value={stats.totalTrades.toString()}
              icon={<Calendar />}
            />
            <MetricCard
              title="Win Rate"
              value={`${stats.winRate.toFixed(1)}%`}
              icon={<TrendingUp />}
            />
            <MetricCard
              title="Total P&L"
              value={formatCurrency(stats.totalPnL, account.currency)}
              icon={<DollarSign />}
            />
            <MetricCard
              title="Average P&L"
              value={formatCurrency(stats.averagePnL, account.currency)}
              icon={<DollarSign />}
            />
          </div>
        )}

        {/* Best/Worst Trades */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="text-green-500" size={20} />
                  Best Trade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {formatCurrency(stats.bestTrade, account.currency)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="text-red-500" size={20} />
                  Worst Trade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {formatCurrency(stats.worstTrade, account.currency)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Trades */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTrades.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No trades found for this account
              </p>
            ) : (
              <div className="space-y-4">
                {recentTrades.slice(0, 5).map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{trade.symbol}</Badge>
                      <Badge variant={trade.trade_type === 'buy' ? 'default' : 'secondary'}>
                        {trade.trade_type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(trade.entry_date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        variant={trade.status === 'closed' ? 'default' : 'secondary'}
                      >
                        {trade.status}
                      </Badge>
                      {trade.pnl !== null && (
                        <span
                          className={`font-medium ${
                            trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {formatCurrency(trade.pnl, account.currency)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {recentTrades.length > 5 && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/trades?account=${account.id}`)}
                    >
                      View All Trades
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AccountPerformance;