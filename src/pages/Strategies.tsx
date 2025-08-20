import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Target, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/DashboardLayout';
import { LoadingCard } from '@/components/ui/loading-spinner';
import { useSubscription } from '@/hooks/useSubscription';
import { PremiumFeature } from '@/components/PremiumFeature';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Strategy {
  id: string;
  name: string;
  description: string;
  rules: string;
  risk_per_trade: number;
  max_daily_risk: number;
  is_active: boolean;
  created_at: string;
}

const Strategies = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPremium } = useSubscription();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rules: '',
    risk_per_trade: '',
    max_daily_risk: ''
  });

  // Premium limits for basic users  
  const BASIC_STRATEGY_LIMIT = 3;

  useEffect(() => {
    if (user) {
      fetchStrategies();
    }
  }, [user]);

  const fetchStrategies = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStrategies(data || []);
    } catch (error) {
      console.error('Error fetching strategies:', error);
      toast({
        title: "Error",
        description: "Failed to fetch strategies",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const strategyData = {
        name: formData.name,
        description: formData.description,
        rules: formData.rules,
        risk_per_trade: formData.risk_per_trade ? parseFloat(formData.risk_per_trade) : null,
        max_daily_risk: formData.max_daily_risk ? parseFloat(formData.max_daily_risk) : null,
        user_id: user.id
      };

      if (editingStrategy) {
        const { error } = await supabase
          .from('strategies')
          .update(strategyData)
          .eq('id', editingStrategy.id);

        if (error) throw error;
        toast({ title: "Success", description: "Strategy updated successfully" });
      } else {
        const { error } = await supabase
          .from('strategies')
          .insert([strategyData]);

        if (error) throw error;
        toast({ title: "Success", description: "Strategy created successfully" });
      }

      setDialogOpen(false);
      setEditingStrategy(null);
      resetForm();
      fetchStrategies();
    } catch (error) {
      console.error('Error saving strategy:', error);
      toast({
        title: "Error",
        description: "Failed to save strategy",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (strategy: Strategy) => {
    setEditingStrategy(strategy);
    setFormData({
      name: strategy.name,
      description: strategy.description || '',
      rules: strategy.rules || '',
      risk_per_trade: strategy.risk_per_trade ? strategy.risk_per_trade.toString() : '',
      max_daily_risk: strategy.max_daily_risk ? strategy.max_daily_risk.toString() : ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('strategies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Strategy deleted successfully" });
      fetchStrategies();
    } catch (error) {
      console.error('Error deleting strategy:', error);
      toast({
        title: "Error",
        description: "Failed to delete strategy",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (strategy: Strategy) => {
    try {
      const { error } = await supabase
        .from('strategies')
        .update({ is_active: !strategy.is_active })
        .eq('id', strategy.id);

      if (error) throw error;
      toast({ 
        title: "Success", 
        description: `Strategy ${!strategy.is_active ? 'activated' : 'deactivated'} successfully` 
      });
      fetchStrategies();
    } catch (error) {
      console.error('Error toggling strategy:', error);
      toast({
        title: "Error",
        description: "Failed to update strategy",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      rules: '',
      risk_per_trade: '',
      max_daily_risk: ''
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded w-40 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-64 animate-pulse"></div>
            </div>
            <div className="h-10 bg-muted rounded w-40 animate-pulse"></div>
          </div>
          
          {/* Strategies Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <LoadingCard key={i} className="h-40" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Trading Strategies</h1>
            <p className="text-muted-foreground">Create and manage your trading strategies</p>
          </div>
          {!isPremium && strategies.length >= BASIC_STRATEGY_LIMIT ? (
            <PremiumFeature
              feature="Unlimited Strategies"
              description="Basic users can create 3 strategies. Upgrade to premium for unlimited strategies."
              showUpgrade={false}
              fallback={
                <Button disabled variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Upgrade for More Strategies
                </Button>
              }
            />
          ) : (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingStrategy(null); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Strategy
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingStrategy ? 'Edit' : 'Add'} Trading Strategy</DialogTitle>
              <DialogDescription>
                {editingStrategy ? 'Update' : 'Create'} your trading strategy details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Strategy Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="rules">Trading Rules</Label>
                <Textarea
                  id="rules"
                  placeholder="Enter your trading rules and setup criteria..."
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  rows={5}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="risk_per_trade">Risk Per Trade (%)</Label>
                  <Input
                    id="risk_per_trade"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 2.0"
                    value={formData.risk_per_trade}
                    onChange={(e) => setFormData({ ...formData, risk_per_trade: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="max_daily_risk">Max Daily Risk (%)</Label>
                  <Input
                    id="max_daily_risk"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 6.0"
                    value={formData.max_daily_risk}
                    onChange={(e) => setFormData({ ...formData, max_daily_risk: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editingStrategy ? 'Update' : 'Create'} Strategy
              </Button>
            </form>
            </DialogContent>
          </Dialog>
          )}
        </div>

      {strategies.length === 0 ? (
        <div className="text-center py-12">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No strategies yet</h3>
          <p className="text-muted-foreground mb-4">Create your first trading strategy to organize your approach</p>
          {!isPremium && strategies.length >= BASIC_STRATEGY_LIMIT ? (
            <PremiumFeature
              feature="Unlimited Strategies"
              description="Upgrade to premium to create unlimited trading strategies."
            />
          ) : (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Strategy
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {strategies.map((strategy) => (
            <Card key={strategy.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{strategy.name}</CardTitle>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(strategy)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(strategy.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={strategy.is_active ? 'default' : 'secondary'}>
                    {strategy.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(strategy)}
                  >
                    {strategy.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {strategy.description && (
                  <p className="text-sm text-muted-foreground">{strategy.description}</p>
                )}
                {strategy.rules && (
                  <div>
                    <p className="text-sm font-medium mb-1">Rules:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{strategy.rules}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {strategy.risk_per_trade && (
                    <div>
                      <p className="text-xs text-muted-foreground">Risk per trade</p>
                      <p className="font-medium">{strategy.risk_per_trade}%</p>
                    </div>
                  )}
                  {strategy.max_daily_risk && (
                    <div>
                      <p className="text-xs text-muted-foreground">Max daily risk</p>
                      <p className="font-medium">{strategy.max_daily_risk}%</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </DashboardLayout>
  );
};

export default Strategies;