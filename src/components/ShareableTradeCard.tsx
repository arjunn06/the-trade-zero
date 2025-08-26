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
        width: 1920,
        height: 1920
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
            className="w-[1920px] h-[1920px] rounded-2xl p-24 relative overflow-hidden mx-auto"
            style={{ 
              backgroundImage: `url('/lovable-uploads/d2ebd9e4-65b8-4650-9df3-b2d4d5ace41a.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {/* Content */}
            <div className="relative z-10 flex flex-col h-full">
              {/* Title */}
              <div className="mb-16">
                <h1 
                  className="text-white mb-6" 
                  style={{ 
                    color: '#FFF',
                    fontFamily: 'Cirka',
                    fontSize: '200px',
                    fontStyle: 'normal',
                    fontWeight: 700,
                    lineHeight: 'normal'
                  }}
                >
                  {trade.symbol}
                </h1>
                <p className="text-white/60 text-6xl" style={{ fontFamily: 'Proxima Nova, sans-serif', fontWeight: '300' }}>
                  {trade.trade_type.toUpperCase()}
                </p>
              </div>

              {/* Price Section */}
              <div className="mb-24">
                <div className="flex items-center gap-12 mb-6">
                  <span 
                    className="text-white" 
                    style={{ 
                      color: '#FFF',
                      fontFamily: 'Proxima Nova',
                      fontSize: '88px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: 'normal'
                    }}
                  >
                    {trade.entry_price}
                  </span>
                  <span className="text-white/70 text-6xl">→</span>
                  <span 
                    className="text-white" 
                    style={{ 
                      color: '#FFF',
                      fontFamily: 'Proxima Nova',
                      fontSize: '88px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: 'normal'
                    }}
                  >
                    {trade.exit_price || 'Open'}
                  </span>
                </div>
              </div>

              {/* Quantity */}
              <div className="mb-8">
                <p className="text-sm text-white/70 mb-1 uppercase tracking-wider" style={{ fontFamily: 'Proxima Nova, sans-serif' }}>
                  Quantity
                </p>
                <p className="text-xl font-semibold text-white" style={{ fontFamily: 'Proxima Nova, sans-serif' }}>
                  {trade.quantity}
                </p>
              </div>

              {/* P&L */}
              {trade.pnl && (
                <div className="mb-8">
                  <p className={`text-3xl font-bold ${trade.pnl >= 0 ? 'text-yellow-400' : 'text-red-400'}`} style={{ fontFamily: 'Proxima Nova, sans-serif' }}>
                    {formatCurrency(trade.pnl, trade.trading_accounts.currency)}
                  </p>
                </div>
              )}

              {/* Footer - Pushed to bottom */}
              <div className="mt-auto pt-6 border-t border-white/20">
                <div className="flex items-left justify-left gap-2">
                  <span className="text-sm text-white/60 uppercase tracking-wider" style={{ fontFamily: 'Proxima Nova, sans-serif' }}>
                    SHARED FROM
                  </span>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-white" />
                    <span className="text-lg font-bold text-white" style={{ fontFamily: 'Cirka, serif' }}>
                      TheTradeZero
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}