import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface PropFirmChartProps {
  account: {
    id: string;
    name: string;
    currency: string;
    initial_balance: number;
    profit_target?: number;
    max_loss_limit?: number;
    current_drawdown: number;
  };
  currentEquity: number;
  className?: string;
}

export const PropFirmChart = ({ account, currentEquity, className }: PropFirmChartProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: account.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Generate chart data points
  const chartData = [
    {
      point: 'Start',
      equity: account.initial_balance,
      profitTarget: account.profit_target,
      maxLoss: account.initial_balance - (account.max_loss_limit || 0),
    },
    {
      point: 'Current',
      equity: currentEquity,
      profitTarget: account.profit_target,
      maxLoss: account.initial_balance - (account.max_loss_limit || 0),
    },
    {
      point: 'Target',
      equity: account.profit_target || currentEquity,
      profitTarget: account.profit_target,
      maxLoss: account.initial_balance - (account.max_loss_limit || 0),
    },
  ];

  const minY = Math.min(
    account.initial_balance - (account.max_loss_limit || 0),
    currentEquity,
    account.initial_balance
  ) * 0.95;

  const maxY = Math.max(
    account.profit_target || currentEquity,
    currentEquity,
    account.initial_balance
  ) * 1.05;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Performance Chart
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="point" 
                axisLine={false}
                tickLine={false}
                className="text-xs"
              />
              <YAxis 
                domain={[minY, maxY]}
                tickFormatter={formatCurrency}
                axisLine={false}
                tickLine={false}
                className="text-xs"
                width={80}
              />
              
              {/* Max Loss Line */}
              {account.max_loss_limit && (
                <ReferenceLine 
                  y={account.initial_balance - account.max_loss_limit} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
              )}
              
              {/* Profit Target Line */}
              {account.profit_target && (
                <ReferenceLine 
                  y={account.profit_target} 
                  stroke="hsl(var(--success))" 
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
              )}
              
              {/* Starting Balance Line */}
              <ReferenceLine 
                y={account.initial_balance} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="2 2"
                strokeWidth={1}
              />
              
              {/* Current Equity Line */}
              <Line 
                type="monotone" 
                dataKey="equity" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-primary"></div>
            <span>Current Equity</span>
          </div>
          {account.profit_target && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-success border-dashed border-t-2 border-success"></div>
              <span>Profit Target</span>
            </div>
          )}
          {account.max_loss_limit && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-destructive border-dashed border-t-2 border-destructive"></div>
              <span>Max Loss</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-muted-foreground border-dashed border-t border-muted-foreground"></div>
            <span>Start Balance</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};