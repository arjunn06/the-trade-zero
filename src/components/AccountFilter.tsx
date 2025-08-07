import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff } from 'lucide-react';
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
      <SelectContent>
        <SelectItem value="all">All accounts</SelectItem>
        
        {activeAccounts.length > 0 && (
          <>
            <Separator className="my-1" />
            <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-3 w-3" />
              Active Accounts
            </div>
            {activeAccounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{account.name}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">
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
            <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground flex items-center gap-2">
              <EyeOff className="h-3 w-3" />
              Inactive Accounts (View Stats Only)
            </div>
            {inactiveAccounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                <div className="flex items-center justify-between w-full">
                  <span className="text-muted-foreground">{account.name}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    Inactive
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