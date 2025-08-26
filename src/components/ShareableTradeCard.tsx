import React, { useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

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
  trading_accounts: {
    name: string;
    currency: string;
  };
  strategies?: {
    name: string;
  };
}

interface ShareableTradeCardProps {
  trade: Trade;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareableTradeCard({ trade, isOpen, onClose }: ShareableTradeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const downloadAsImage = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 600,
        height: 400
      });

      const link = document.createElement('a');
      link.download = `trade-${trade.symbol}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast.success('Trade card downloaded successfully!');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Failed to download image');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Share Trade</span>
            <Button onClick={downloadAsImage} size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 pt-4">
          <div 
            ref={cardRef}
            className="w-[600px] h-[400px] bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-2xl p-8 relative overflow-hidden mx-auto"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12"></div>
              <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white rounded-full"></div>
            </div>
            
            {/* Header */}
            <div className="relative z-10 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-white">{trade.symbol}</h1>
                  <Badge 
                    variant={trade.trade_type === 'long' ? 'default' : 'secondary'}
                    className="text-sm px-3 py-1 bg-white/20 text-white border-white/30"
                  >
                    {trade.trade_type === 'long' ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    {trade.trade_type.toUpperCase()}
                  </Badge>
                </div>
                <Badge 
                  variant={trade.status === 'open' ? 'outline' : 'default'}
                  className="text-sm px-3 py-1 bg-white/20 text-white border-white/30"
                >
                  {trade.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-white/80 text-sm">{trade.trading_accounts.name}</p>
            </div>

            {/* Main Content */}
            <div className="relative z-10 grid grid-cols-2 gap-12 mb-12">
              <div className="space-y-8">
                <div>
                  <p className="text-sm text-white/70 mb-1">Entry Price</p>
                  <p className="text-3xl font-bold text-white">{trade.entry_price}</p>
                </div>
                <div>
                  <p className="text-sm text-white/70 mb-1">Quantity</p>
                  <p className="text-2xl font-semibold text-white">{trade.quantity}</p>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <p className="text-sm text-white/70 mb-1">Exit Price</p>
                  <p className="text-3xl font-bold text-white">{trade.exit_price || 'Open'}</p>
                </div>
                
                {trade.pnl && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                    <p className="text-sm text-white/70 mb-1">P&L</p>
                    <p className={`text-3xl font-bold ${trade.pnl >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {formatCurrency(trade.pnl, trade.trading_accounts.currency)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 left-8 right-8 flex justify-center items-center border-t border-white/20 pt-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">The Trade Zero</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}