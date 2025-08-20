import { useDrawdownMonitor } from '@/hooks/useDrawdownMonitor';

interface DrawdownMonitorProps {
  account: {
    id: string;
    is_active: boolean;
    is_prop_firm: boolean;
    max_loss_limit?: number;
    initial_balance: number;
  };
  currentEquity: number;
}

export const DrawdownMonitor = ({ account, currentEquity }: DrawdownMonitorProps) => {
  useDrawdownMonitor({
    accountId: account.id,
    isActive: account.is_active,
    isPropFirm: account.is_prop_firm,
    maxLossLimit: account.max_loss_limit,
    currentEquity,
    initialBalance: account.initial_balance
  });

  return null; // This component only handles side effects
};