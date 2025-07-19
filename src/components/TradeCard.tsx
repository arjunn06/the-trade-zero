import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, ImageIcon, Edit, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Trade {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  exit_price?: number;
  quantity: number;
  status: string;
  pnl?: number;
  entry_date: string;
  exit_date?: string;
  notes?: string;
  screenshots?: string[];
  trading_accounts: {
    name: string;
    currency: string;
  };
  strategies?: {
    name: string;
  };
}

interface TradeCardProps {
  trade: Trade;
  onClose?: (trade: Trade) => void;
  onDelete?: (tradeId: string) => void;
  onViewScreenshots?: (screenshots: string[]) => void;
}

export function TradeCard({ trade, onClose, onDelete, onViewScreenshots }: TradeCardProps) {
  const navigate = useNavigate();

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleCardClick = () => {
    navigate(`/trades/${trade.id}`);
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow duration-200"
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{trade.symbol}</h3>
            <Badge variant={trade.trade_type === 'long' ? 'default' : 'secondary'}>
              {trade.trade_type === 'long' ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {trade.trade_type.toUpperCase()}
            </Badge>
          </div>
          <Badge 
            variant={trade.status === 'open' ? 'outline' : 'default'}
            className={trade.status === 'closed' && trade.pnl && trade.pnl > 0 ? 'bg-profit text-profit-foreground' : 
                      trade.status === 'closed' && trade.pnl && trade.pnl < 0 ? 'bg-loss text-destructive-foreground' : ''}
          >
            {trade.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Entry Price</p>
            <p className="font-medium">{trade.entry_price}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Exit Price</p>
            <p className="font-medium">{trade.exit_price || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Quantity</p>
            <p className="font-medium">{trade.quantity}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">P&L</p>
            {trade.pnl ? (
              <p className={`font-medium ${trade.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatCurrency(trade.pnl, trade.trading_accounts.currency)}
              </p>
            ) : (
              <p className="font-medium">-</p>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="text-sm text-muted-foreground">Entry Date</p>
            <p className="text-sm">{formatDate(trade.entry_date)}</p>
          </div>
          {trade.exit_date && (
            <div>
              <p className="text-sm text-muted-foreground">Exit Date</p>
              <p className="text-sm">{formatDate(trade.exit_date)}</p>
            </div>
          )}
        </div>

        {trade.screenshots && trade.screenshots.length > 0 && (
          <div className="mb-3">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => handleActionClick(e, () => onViewScreenshots?.(trade.screenshots!))}
              className="w-full"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              View Screenshots ({trade.screenshots.length})
            </Button>
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t">
          {trade.status === 'open' && onClose && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => handleActionClick(e, () => onClose(trade))}
              className="flex-1"
            >
              Close Trade
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => handleActionClick(e, () => navigate(`/trades/${trade.id}`))}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => handleActionClick(e, () => onDelete(trade.id))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}