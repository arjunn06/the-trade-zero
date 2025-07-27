import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@supabase/auth-helpers-react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

const TradingAccounts = () => {
  const user = useUser();
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ broker: '', accountType: '', balance: '', goal: '' });
  const [syncing, setSyncing] = useState(false);
  const [linked, setLinked] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (linked) {
      syncTrades();
      const interval = setInterval(syncTrades, 5 * 60 * 1000); // Every 5 mins
      return () => clearInterval(interval);
    }
  }, [linked]);

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from('trading_accounts')
      .select('*')
      .eq('user_id', user?.id);

    if (!error) setAccounts(data);
  };

  const handleManualCreate = async () => {
    const { broker, accountType, balance, goal } = form;
    const { data, error } = await supabase.from('trading_accounts').insert([
      {
        broker,
        account_type: accountType,
        balance: parseFloat(balance),
        equity_goal: parseFloat(goal),
        user_id: user?.id,
        is_ctrader: false,
      },
    ]);

    if (!error) {
      fetchAccounts();
      setForm({ broker: '', accountType: '', balance: '', goal: '' });
    }
  };

  const handleConnectCTrader = async () => {
    const redirectUrl = `${window.location.origin}/ctrader-callback`;

    const { data, error } = await supabase.functions.invoke('ctrader-auth', {
      body: { redirectUrl },
    });

    if (data?.url) {
      window.location.href = data.url;
    }
  };

  const syncTrades = async () => {
    if (!user?.id) return;
    setSyncing(true);

    try {
      const { error } = await supabase.functions.invoke('ctrader-import-trades', {
        body: { userId: user.id },
      });
      if (!error) await fetchAccounts();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4 space-y-8">
      {/* Manual Account Form */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Create Manual Account</h2>
        <Input
          placeholder="Broker"
          value={form.broker}
          onChange={(e) => setForm({ ...form, broker: e.target.value })}
        />
        <Input
          placeholder="Account Type"
          value={form.accountType}
          onChange={(e) => setForm({ ...form, accountType: e.target.value })}
        />
        <Input
          placeholder="Initial Balance"
          type="number"
          value={form.balance}
          onChange={(e) => setForm({ ...form, balance: e.target.value })}
        />
        <Input
          placeholder="Equity Goal"
          type="number"
          value={form.goal}
          onChange={(e) => setForm({ ...form, goal: e.target.value })}
        />
        <Button onClick={handleManualCreate}>Create Account</Button>
      </div>

      {/* cTrader Link */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Link cTrader Account</h2>
        <Button onClick={handleConnectCTrader}>Connect cTrader</Button>
      </div>

      {/* Sync Button */}
      {linked && (
        <div className="space-y-2">
          <h2 className="text-lg font-bold">cTrader Sync</h2>
          <Button onClick={syncTrades} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      )}

      {/* Accounts Display */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Your Accounts</h2>
        {accounts.map((acc, i) => (
          <div key={i} className="p-4 border rounded-md">
            <p><strong>Broker:</strong> {acc.broker}</p>
            <p><strong>Type:</strong> {acc.account_type}</p>
            <p><strong>Balance:</strong> ₹{acc.balance}</p>
            <p><strong>Goal:</strong> ₹{acc.equity_goal}</p>
            <p><strong>Source:</strong> {acc.is_ctrader ? 'cTrader' : 'Manual'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TradingAccounts;