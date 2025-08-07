import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AccountFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

interface TradingAccount {
  id: string;
  name: string;
  is_active: boolean;
}

export function AccountFilter({ value, onValueChange, className, placeholder = "All accounts" }: AccountFilterProps) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

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
        .select('id, name, is_active')
        .eq('user_id', user.id)
        .order('is_active', { ascending: false })
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching trading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeAccounts = accounts.filter(account => account.is_active);
  const inactiveAccounts = accounts.filter(account => !account.is_active);

  const getSelectedAccountName = () => {
    if (!value || value === 'all') return placeholder;
    const account = accounts.find(acc => acc.id === value);
    return account?.name || placeholder;
  };

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Loading..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value || 'all'} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={getSelectedAccountName()} />
      </SelectTrigger>
      <SelectContent className="w-[280px]">
        <SelectItem value="all" className="font-medium">
          All accounts
        </SelectItem>
        
        {activeAccounts.length > 0 && (
          <>
            <Separator className="my-1" />
            <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-3 w-3" />
              Active Accounts
            </div>
            {activeAccounts.map((account) => (
              <SelectItem 
                key={account.id} 
                value={account.id}
                className="pl-6 hover:bg-accent/50 focus:bg-accent/50"
              >
                <div className="flex items-center justify-between w-full">
                  <span>{account.name}</span>
                  <Badge variant="secondary" className="ml-2 text-xs bg-primary/10 text-primary border-primary/20">
                    Active
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </>
        )}

        {inactiveAccounts.length > 0 && (
          <>
            <Separator className="my-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowInactive(!showInactive);
              }}
              className="w-full justify-start px-2 py-1.5 h-auto text-sm font-medium text-muted-foreground hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                {showInactive ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <EyeOff className="h-3 w-3" />
                Inactive Accounts ({inactiveAccounts.length})
              </div>
            </Button>
            
            {showInactive && inactiveAccounts.map((account) => (
              <SelectItem 
                key={account.id} 
                value={account.id}
                className="pl-8 hover:bg-muted/30 focus:bg-muted/30"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-muted-foreground">{account.name}</span>
                  <Badge variant="outline" className="ml-2 text-xs border-muted-foreground/30 text-muted-foreground">
                    View Only
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
}