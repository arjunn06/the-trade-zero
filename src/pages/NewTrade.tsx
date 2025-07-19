import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar } from '@/components/ui/calendar';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useSubscription } from '@/hooks/useSubscription';
import { PremiumFeature } from '@/components/PremiumFeature';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, X, ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

interface TradingAccount {
  id: string;
  name: string;
  currency: string;
}

interface Strategy {
  id: string;
  name: string;
}

const NewTrade = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPremium } = useSubscription();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [entryDate, setEntryDate] = useState<Date | undefined>(new Date());
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [uploadingScreenshots, setUploadingScreenshots] = useState(false);
  const [formData, setFormData] = useState({
    symbol: '',
    trade_type: '',
    entry_price: '',
    quantity: '',
    stop_loss: '',
    take_profit: '',
    trading_account_id: '',
    strategy_id: '',
    notes: '',
    risk_amount: '',
    risk_reward_ratio: '',
    // Advanced cTrader fields
    order_type: '',
    execution_price: '',
    slippage_points: '',
    spread: '',
    commission: '',
    swap: '',
    margin_rate: '',
    filled_volume: ''
  });
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchStrategies();
      if (isEditing && id) {
        fetchTrade();
      }
    }
  }, [user, isEditing, id]);

  const fetchTrade = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Populate form with existing trade data
      setFormData({
        symbol: data.symbol || '',
        trade_type: data.trade_type || '',
        entry_price: data.entry_price?.toString() || '',
        quantity: data.quantity?.toString() || '',
        stop_loss: data.stop_loss?.toString() || '',
        take_profit: data.take_profit?.toString() || '',
        trading_account_id: data.trading_account_id || '',
        strategy_id: data.strategy_id || '',
        notes: data.notes || '',
        risk_amount: data.risk_amount?.toString() || '',
        risk_reward_ratio: data.risk_reward_ratio?.toString() || '',
        order_type: data.order_type || '',
        execution_price: data.execution_price?.toString() || '',
        slippage_points: data.slippage_points?.toString() || '',
        spread: data.spread?.toString() || '',
        commission: data.commission?.toString() || '',
        swap: data.swap?.toString() || '',
        margin_rate: data.margin_rate?.toString() || '',
        filled_volume: data.filled_volume?.toString() || ''
      });

      if (data.entry_date) {
        setEntryDate(new Date(data.entry_date));
      }
    } catch (error) {
      console.error('Error fetching trade:', error);
      toast({
        title: "Error",
        description: "Failed to load trade data",
        variant: "destructive"
      });
      navigate('/trades');
    }
  };

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
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchStrategies = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('strategies')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      setStrategies(data || []);
    } catch (error) {
      console.error('Error fetching strategies:', error);
    }
  };

  const calculateRiskReward = () => {
    const entry = parseFloat(formData.entry_price);
    const stopLoss = parseFloat(formData.stop_loss);
    const takeProfit = parseFloat(formData.take_profit);

    if (entry && stopLoss && takeProfit) {
      const risk = Math.abs(entry - stopLoss);
      const reward = Math.abs(takeProfit - entry);
      return reward / risk;
    }
    return 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length + screenshots.length > 5) {
      toast({
        title: "Too many files",
        description: "You can upload a maximum of 5 screenshots",
        variant: "destructive"
      });
      return;
    }
    
    setScreenshots(prev => [...prev, ...imageFiles]);
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
  };

  const uploadScreenshots = async (): Promise<string[]> => {
    if (screenshots.length === 0) return [];
    
    setUploadingScreenshots(true);
    const uploadedUrls: string[] = [];
    
    try {
      for (const file of screenshots) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user!.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error } = await supabase.storage
          .from('trade-screenshots')
          .upload(fileName, file);
          
        if (error) throw error;
        
        const { data } = supabase.storage
          .from('trade-screenshots')
          .getPublicUrl(fileName);
          
        uploadedUrls.push(data.publicUrl);
      }
    } catch (error) {
      console.error('Error uploading screenshots:', error);
      throw error;
    } finally {
      setUploadingScreenshots(false);
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !entryDate) return;

    setLoading(true);

    try {
      // Upload screenshots first
      const screenshotUrls = await uploadScreenshots();
      
      const tradeData = {
        symbol: formData.symbol.toUpperCase(),
        trade_type: formData.trade_type,
        entry_price: parseFloat(formData.entry_price),
        quantity: parseFloat(formData.quantity),
        stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
        take_profit: formData.take_profit ? parseFloat(formData.take_profit) : null,
        entry_date: entryDate.toISOString(),
        trading_account_id: formData.trading_account_id,
        strategy_id: formData.strategy_id || null,
        notes: formData.notes,
        risk_amount: formData.risk_amount ? parseFloat(formData.risk_amount) : null,
        risk_reward_ratio: calculateRiskReward() || null,
        status: 'open',
        user_id: user.id,
        screenshots: screenshotUrls.length > 0 ? screenshotUrls : null,
        // Advanced fields
        order_type: formData.order_type || null,
        execution_price: formData.execution_price ? parseFloat(formData.execution_price) : null,
        slippage_points: formData.slippage_points ? parseFloat(formData.slippage_points) : null,
        spread: formData.spread ? parseFloat(formData.spread) : null,
        commission: formData.commission ? parseFloat(formData.commission) : null,
        swap: formData.swap ? parseFloat(formData.swap) : null,
        margin_rate: formData.margin_rate ? parseFloat(formData.margin_rate) : null,
        filled_volume: formData.filled_volume ? parseFloat(formData.filled_volume) : null,
        source: 'manual'
      };

      if (isEditing && id) {
        // Update existing trade
        const { error } = await supabase
          .from('trades')
          .update(tradeData)
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Trade updated successfully"
        });
      } else {
        // Create new trade
        const { error } = await supabase
          .from('trades')
          .insert([tradeData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Trade created successfully"
        });
      }

      navigate('/trades');
    } catch (error) {
      console.error('Error creating trade:', error);
      toast({
        title: "Error",
        description: "Failed to create trade",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (accounts.length === 0) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
        <h1 className="text-3xl font-bold">New Trade</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium mb-2">No Trading Accounts Found</h3>
              <p className="text-muted-foreground mb-4">You need to create a trading account before adding trades</p>
              <Button onClick={() => navigate('/accounts')}>
                Create Trading Account
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{isEditing ? 'Edit Trade' : 'New Trade'}</h1>
        <p className="text-muted-foreground">{isEditing ? 'Update trading position details' : 'Record a new trading position'}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trade Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="e.g., EURUSD, AAPL"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="trade_type">Trade Type</Label>
                <Select value={formData.trade_type} onValueChange={(value) => setFormData({ ...formData, trade_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trade type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long">Long (Buy)</SelectItem>
                    <SelectItem value="short">Short (Sell)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="entry_price">Entry Price</Label>
                <Input
                  id="entry_price"
                  type="number"
                  step="any"
                  value={formData.entry_price}
                  onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="quantity">Quantity/Lot Size</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="stop_loss">Stop Loss</Label>
                <Input
                  id="stop_loss"
                  type="number"
                  step="any"
                  value={formData.stop_loss}
                  onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="take_profit">Take Profit</Label>
                <Input
                  id="take_profit"
                  type="number"
                  step="any"
                  value={formData.take_profit}
                  onChange={(e) => setFormData({ ...formData, take_profit: e.target.value })}
                />
              </div>

              <div>
                <Label>Entry Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {entryDate ? format(entryDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={entryDate}
                      onSelect={setEntryDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="trading_account">Trading Account</Label>
                <Select value={formData.trading_account_id} onValueChange={(value) => setFormData({ ...formData, trading_account_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="strategy">Strategy (Optional)</Label>
                <Select value={formData.strategy_id} onValueChange={(value) => setFormData({ ...formData, strategy_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies.map((strategy) => (
                      <SelectItem key={strategy.id} value={strategy.id}>
                        {strategy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="risk_amount">Risk Amount</Label>
                <Input
                  id="risk_amount"
                  type="number"
                  step="0.01"
                  placeholder="Amount at risk"
                  value={formData.risk_amount}
                  onChange={(e) => setFormData({ ...formData, risk_amount: e.target.value })}
                />
              </div>
            </div>

            {calculateRiskReward() > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Risk/Reward Ratio: <span className="font-medium">{calculateRiskReward().toFixed(2)}:1</span>
                </p>
              </div>
            )}

            {/* Advanced Fields Toggle */}
            <div className="border-t pt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                className="flex items-center gap-2"
              >
                {showAdvancedFields ? 'Hide' : 'Show'} Advanced Fields
                <span className="text-xs text-muted-foreground">
                  (Order type, execution details, spreads, etc.)
                </span>
              </Button>
            </div>

            {/* Advanced Fields Section */}
            {showAdvancedFields && (
              <div className="border rounded-lg p-6 bg-muted/30">
                <h3 className="text-lg font-medium mb-4">Advanced Trade Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="order_type">Order Type</Label>
                    <Select value={formData.order_type} onValueChange={(value) => setFormData({ ...formData, order_type: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select order type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MARKET">Market Order</SelectItem>
                        <SelectItem value="LIMIT">Limit Order</SelectItem>
                        <SelectItem value="STOP">Stop Order</SelectItem>
                        <SelectItem value="STOP_LIMIT">Stop Limit</SelectItem>
                        <SelectItem value="MARKET_RANGE">Market Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="execution_price">Execution Price</Label>
                    <Input
                      id="execution_price"
                      type="number"
                      step="any"
                      placeholder="Actual execution price"
                      value={formData.execution_price}
                      onChange={(e) => setFormData({ ...formData, execution_price: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      If different from entry price (for market orders with slippage)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="slippage_points">Slippage (Points)</Label>
                    <Input
                      id="slippage_points"
                      type="number"
                      step="0.1"
                      placeholder="Price slippage in points"
                      value={formData.slippage_points}
                      onChange={(e) => setFormData({ ...formData, slippage_points: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="spread">Spread (Points)</Label>
                    <Input
                      id="spread"
                      type="number"
                      step="0.1"
                      placeholder="Bid-ask spread"
                      value={formData.spread}
                      onChange={(e) => setFormData({ ...formData, spread: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="commission">Commission</Label>
                    <Input
                      id="commission"
                      type="number"
                      step="0.01"
                      placeholder="Commission paid"
                      value={formData.commission}
                      onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="swap">Swap/Rollover</Label>
                    <Input
                      id="swap"
                      type="number"
                      step="0.01"
                      placeholder="Overnight swap fees"
                      value={formData.swap}
                      onChange={(e) => setFormData({ ...formData, swap: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="margin_rate">Margin Rate (%)</Label>
                    <Input
                      id="margin_rate"
                      type="number"
                      step="0.01"
                      placeholder="Required margin percentage"
                      value={formData.margin_rate}
                      onChange={(e) => setFormData({ ...formData, margin_rate: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="filled_volume">Filled Volume</Label>
                    <Input
                      id="filled_volume"
                      type="number"
                      step="any"
                      placeholder="Actually filled amount"
                      value={formData.filled_volume}
                      onChange={(e) => setFormData({ ...formData, filled_volume: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      For partial fills, enter the actual filled amount
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> These advanced fields are automatically populated when importing from cTrader. 
                    Manual entry is optional but provides more detailed trade analysis.
                  </p>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Trade rationale, setup details, etc."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="screenshots">Chart Screenshots (Optional)</Label>
              <PremiumFeature
                feature="Chart Screenshots"
                description="Upload and save chart screenshots with your trades. Available in premium plan only."
                fallback={
                  <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-lg bg-muted/30">
                    <div className="flex flex-col items-center justify-center text-center">
                      <ImageIcon className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-3">
                        Chart screenshots available in <span className="font-semibold">Premium</span>
                      </p>
                      <Button size="sm" variant="outline" onClick={() => navigate('/')}>
                        Upgrade to Premium
                      </Button>
                    </div>
                  </div>
                }
              >
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="screenshot-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">Click to upload</span> chart screenshots
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 5 files</p>
                    </div>
                    <input
                      id="screenshot-upload"
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                
                {screenshots.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {screenshots.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeScreenshot(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                          {file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </PremiumFeature>
            </div>

            <div className="flex space-x-4">
              <Button type="submit" disabled={loading || uploadingScreenshots}>
                {loading ? (uploadingScreenshots ? 'Uploading Screenshots...' : (isEditing ? 'Updating...' : 'Creating...')) : (isEditing ? 'Update Trade' : 'Create Trade')}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/trades')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
};

export default NewTrade;