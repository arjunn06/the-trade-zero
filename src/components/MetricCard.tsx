
import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    percentage: string;
    isPositive: boolean;
  };
  icon?: ReactNode;
  className?: string;
}

export function MetricCard({ title, value, change, icon, className }: MetricCardProps) {
  return (
    <Card className={cn("metric-card", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="metric-label">{title}</p>
            <div className="space-y-1">
              <p className="metric-value">{value}</p>
              {change && (
                <div className={cn(
                  "metric-change",
                  change.isPositive ? "profit-text" : "loss-text"
                )}>
                  {change.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{change.percentage}</span>
                </div>
              )}
            </div>
          </div>
          {icon && (
            <div className="text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
