import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';

interface ConfluenceItem {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  weight: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const categories = [
  'Technical Analysis',
  'Fundamental Analysis',
  'Market Structure',
  'Risk Management',
  'Sentiment Analysis',
  'Time-based',
  'Other'
];

export default function Confluence() {
  const [confluenceItems, setConfluenceItems] = useState<ConfluenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfluenceItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    weight: 1.0,
    is_active: true
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchConfluenceItems();
    }
  }, [user]);

  const fetchConfluenceItems = async () => {
    try {
      const { data, error } = await supabase
        .from('confluence_items')
        .select('*')
        .eq('user_id', user?.id)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setConfluenceItems(data || []);
    } catch (error) {
      console.error('Error fetching confluence items:', error);
      toast({
        title: "Error",
        description: "Failed to fetch confluence items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('confluence_items')
          .update({
            name: formData.name,
            category: formData.category || null,
            description: formData.description || null,
            weight: formData.weight,
            is_active: formData.is_active
          })
          .eq('id', editingItem.id)
          .eq('user_id', user?.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Confluence item updated successfully"
        });
      } else {
        // Create new item
        const { error } = await supabase
          .from('confluence_items')
          .insert({
            user_id: user?.id,
            name: formData.name,
            category: formData.category || null,
            description: formData.description || null,
            weight: formData.weight,
            is_active: formData.is_active
          });

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Confluence item created successfully"
        });
      }

      // Reset form and close dialog
      setFormData({
        name: '',
        category: '',
        description: '',
        weight: 1.0,
        is_active: true
      });
      setEditingItem(null);
      setIsDialogOpen(false);
      fetchConfluenceItems();
    } catch (error) {
      console.error('Error saving confluence item:', error);
      toast({
        title: "Error",
        description: "Failed to save confluence item",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (item: ConfluenceItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category || '',
      description: item.description || '',
      weight: Number(item.weight),
      is_active: item.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this confluence item?')) return;

    try {
      const { error } = await supabase
        .from('confluence_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Confluence item deleted successfully"
      });
      fetchConfluenceItems();
    } catch (error) {
      console.error('Error deleting confluence item:', error);
      toast({
        title: "Error",
        description: "Failed to delete confluence item",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (itemId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('confluence_items')
        .update({ is_active: !isActive })
        .eq('id', itemId)
        .eq('user_id', user?.id);

      if (error) throw error;
      fetchConfluenceItems();
    } catch (error) {
      console.error('Error updating confluence item:', error);
      toast({
        title: "Error",
        description: "Failed to update confluence item",
        variant: "destructive"
      });
    }
  };

  const groupedItems = confluenceItems.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ConfluenceItem[]>);

  const activeItems = confluenceItems.filter(item => item.is_active);
  const totalWeight = activeItems.reduce((sum, item) => sum + Number(item.weight), 0);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-lg font-semibold">Confluence Checklist</h1>
          </header>

          <div className="flex-1 space-y-4 p-4 pt-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Confluence Items</h2>
                <p className="text-muted-foreground">
                  Manage your trading confluence checklist items. Total active weight: {totalWeight.toFixed(1)}
                </p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingItem(null);
                    setFormData({
                      name: '',
                      category: '',
                      description: '',
                      weight: 1.0,
                      is_active: true
                    });
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? 'Edit Confluence Item' : 'Add New Confluence Item'}
                    </DialogTitle>
                    <DialogDescription>
                      Create confluence factors to check before entering trades.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., RSI Oversold"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe this confluence factor..."
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="weight">Weight</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="10"
                          value={formData.weight}
                          onChange={(e) => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 1.0 }))}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                        />
                        <Label htmlFor="is_active">Active</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">
                        {editingItem ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div>Loading...</div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedItems).map(([category, items]) => (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="text-lg">{category}</CardTitle>
                      <CardDescription>
                        {items.filter(item => item.is_active).length} active items
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-3 border rounded-lg ${item.is_active ? '' : 'opacity-50'}`}
                          >
                            <div className="flex items-center gap-3">
                              {item.is_active ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground" />
                              )}
                              <div>
                                <div className="font-medium">{item.name}</div>
                                {item.description && (
                                  <div className="text-sm text-muted-foreground">{item.description}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">Weight: {Number(item.weight).toFixed(1)}</Badge>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleActive(item.id, item.is_active)}
                                >
                                  {item.is_active ? 'Deactivate' : 'Activate'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {confluenceItems.length === 0 && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="text-center">
                        <h3 className="text-lg font-medium">No confluence items yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Start building your trading confluence checklist
                        </p>
                        <Button onClick={() => setIsDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Item
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}