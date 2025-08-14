import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';

interface TradingAccount {
  id: string;
  name: string;
  currency: string;
}

export function QuickTradeWidget() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [formData, setFormData] = useState({
    trading_account_id: '',
    symbol: '',
    trade_type: '',
    entry_price: '',
    quantity: '',
    exit_price: '',
    pnl: ''
  });

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  const fetchAccounts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('trading_accounts')
        .select('id, name, currency')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      setAccounts(data || []);
      
      // Auto-select first account if only one exists
      if (data && data.length === 1) {
        setFormData(prev => ({ ...prev, trading_account_id: data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculatePnL = () => {
    const entry = parseFloat(formData.entry_price);
    const exit = parseFloat(formData.exit_price);
    const quantity = parseFloat(formData.quantity);

    if (entry && exit && quantity && formData.trade_type) {
      let pnl = 0;
      if (formData.trade_type === 'buy') {
        pnl = (exit - entry) * quantity;
      } else {
        pnl = (entry - exit) * quantity;
      }
      setFormData(prev => ({ ...prev, pnl: pnl.toFixed(2) }));
    }
  };

  useEffect(() => {
    if (formData.entry_price && formData.exit_price && formData.quantity && formData.trade_type) {
      calculatePnL();
    }
  }, [formData.entry_price, formData.exit_price, formData.quantity, formData.trade_type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.trading_account_id || !formData.symbol || !formData.trade_type || 
        !formData.entry_price || !formData.quantity) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Use the create-trade edge function
      const { data: authData } = await supabase.auth.getSession();
      
      if (!authData.session) {
        throw new Error('Not authenticated');
      }

      const tradeData = {
        trading_account_id: formData.trading_account_id,
        symbol: formData.symbol.toUpperCase(),
        trade_type: formData.trade_type,
        entry_price: parseFloat(formData.entry_price),
        quantity: parseFloat(formData.quantity),
        ...(formData.exit_price && { exit_price: parseFloat(formData.exit_price) }),
        ...(formData.pnl && { pnl: parseFloat(formData.pnl) }),
        entry_date: new Date().toISOString(),
        status: formData.exit_price ? 'closed' : 'open',
        ...(formData.exit_price && { exit_date: new Date().toISOString() }),
        notes: 'Quick trade entry'
      };

      const response = await fetch(`https://dynibyqrcbxneiwjyahn.supabase.co/functions/v1/create-trade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session.access_token}`,
        },
        body: JSON.stringify(tradeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create trade');
      }

      toast({
        title: "Trade created successfully",
        description: `${formData.trade_type.toUpperCase()} ${formData.symbol} trade has been added`,
      });

      // Reset form
      setFormData({
        trading_account_id: accounts.length === 1 ? accounts[0].id : '',
        symbol: '',
        trade_type: '',
        entry_price: '',
        quantity: '',
        exit_price: '',
        pnl: ''
      });

      // Trigger a page refresh to update dashboard data
      window.location.reload();

    } catch (error) {
      console.error('Error creating trade:', error);
      toast({
        title: "Error creating trade",
        description: error instanceof Error ? error.message : "Failed to create trade",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="quick-trade-widget">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="h-5 w-5" />
          Quick Add Trade
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="account">Account</Label>
              <Select 
                value={formData.trading_account_id} 
                onValueChange={(value) => handleInputChange('trading_account_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                value={formData.symbol}
                onChange={(e) => handleInputChange('symbol', e.target.value)}
                placeholder="e.g. EURUSD"
                className="uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="direction">Direction</Label>
              <Select 
                value={formData.trade_type} 
                onValueChange={(value) => handleInputChange('trade_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Buy/Sell" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-profit" />
                      Buy
                    </div>
                  </SelectItem>
                  <SelectItem value="sell">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-loss" />
                      Sell
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
                placeholder="Lot size"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="entry_price">Entry Price</Label>
              <Input
                id="entry_price"
                type="number"
                step="0.00001"
                value={formData.entry_price}
                onChange={(e) => handleInputChange('entry_price', e.target.value)}
                placeholder="Entry price"
              />
            </div>
            
            <div>
              <Label htmlFor="exit_price">Exit Price (Optional)</Label>
              <Input
                id="exit_price"
                type="number"
                step="0.00001"
                value={formData.exit_price}
                onChange={(e) => handleInputChange('exit_price', e.target.value)}
                placeholder="Exit price"
              />
            </div>
          </div>

          {formData.pnl && (
            <div>
              <Label htmlFor="pnl">P&L</Label>
              <Input
                id="pnl"
                type="number"
                step="0.01"
                value={formData.pnl}
                onChange={(e) => handleInputChange('pnl', e.target.value)}
                className={parseFloat(formData.pnl) >= 0 ? 'text-profit' : 'text-loss'}
                readOnly
              />
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Add Trade'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}