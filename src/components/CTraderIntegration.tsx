import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ExternalLink, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { PremiumFeature } from './PremiumFeature';

interface CTraderIntegrationProps {
  accountId: string;
  accountName: string;
  isFirstAccount?: boolean;
}

interface CTraderConnection {
  id: string;
  account_number: string;
  connected_at: string;
  last_sync?: string;
}

export const CTraderIntegration: React.FC<CTraderIntegrationProps> = ({
  accountId,
  accountName,
  isFirstAccount = false,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [accountName_internal, setAccountName_internal] = useState('');
  const [connection, setConnection] = useState<CTraderConnection | null>(null);
  const [loadingConnection, setLoadingConnection] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!isFirstAccount) {
      checkExistingConnection();
    }
  }, [accountId, isFirstAccount]);

  const checkExistingConnection = async () => {
    if (!user || isFirstAccount) return;
    
    try {
      const { data, error } = await supabase
        .from('ctrader_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('trading_account_id', accountId)
        .maybeSingle();

      if (!error && data) {
        setConnection(data);
      }
    } catch (error) {
      console.log('No existing connection found');
    } finally {
      setLoadingConnection(false);
    }
  };

  const handleOneClickConnect = async () => {
    if (isFirstAccount && !accountName_internal.trim()) {
      toast({
        title: "Account Name Required",
        description: "Please enter a name for your trading account",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      let finalAccountId = accountId;

      // If this is the first account, create a trading account first
      if (isFirstAccount && user) {
        const { data: newAccount, error: createError } = await supabase
          .from('trading_accounts')
          .insert({
            name: accountName_internal.trim(),
            account_type: 'live',
            broker: 'cTrader',
            initial_balance: 0,
            current_balance: 0,
            current_equity: 0,
            currency: 'USD',
            user_id: user.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        finalAccountId = newAccount.id;
      }

      // Call the edge function to initiate OAuth flow (no account number needed)
      const { data, error } = await supabase.functions.invoke('ctrader-auth', {
        body: {
          tradingAccountId: finalAccountId,
        },
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Open OAuth URL in new window
        const authWindow = window.open(data.authUrl, 'ctrader-auth', 'width=600,height=700');
        
        toast({
          title: "Authentication Started",
          description: "Please complete the authentication in the popup window",
        });

        // Listen for window close to refresh connection status
        const checkClosed = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkClosed);
            setTimeout(() => {
              if (isFirstAccount) {
                window.location.reload();
              } else {
                checkExistingConnection();
              }
            }, 1000);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error connecting to cTrader:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to cTrader. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleImportTrades = async (customFromDate?: string, customToDate?: string) => {
    setIsImporting(true);
    try {
      // Use custom dates if provided, otherwise default to last 30 days
      const fromDate = customFromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const toDate = customToDate || new Date().toISOString();
      
      const { data, error } = await supabase.functions.invoke('ctrader-import', {
        body: {
          tradingAccountId: accountId,
          fromDate,
          toDate,
        },
      });

      if (error) throw error;

      const daysImported = Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (24 * 60 * 60 * 1000));
      
      toast({
        title: "Import Successful",
        description: `Imported ${data?.tradesCount || 0} trades from cTrader (${daysImported} days)`,
      });

      // Update last sync time
      setConnection(prev => prev ? { ...prev, last_sync: new Date().toISOString() } : null);
    } catch (error) {
      console.error('Error importing trades:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import trades from cTrader. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportLatestTrades = async () => {
    await handleImportTrades(); // Use default 30 days
  };

  const handleImportAllTrades = async () => {
    // Import trades from the past year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    await handleImportTrades(oneYearAgo.toISOString(), new Date().toISOString());
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    
    try {
      const { error } = await supabase
        .from('ctrader_connections')
        .delete()
        .eq('id', connection.id);

      if (error) throw error;

      setConnection(null);
      toast({
        title: "Disconnected",
        description: "Successfully disconnected from cTrader",
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect from cTrader",
        variant: "destructive",
      });
    }
  };

  // For first account, render a simpler card layout
  if (isFirstAccount) {
    return (
      <PremiumFeature feature="cTrader Integration">
        <Card className="w-full sm:w-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/CTrader_logo.svg/120px-CTrader_logo.svg.png" 
                alt="cTrader" 
                className="w-6 h-6"
              />
              Connect cTrader Account
            </CardTitle>
            <CardDescription className="text-center">
              One-click connection to import your trading account and history from cTrader
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountName_internal">Account Name</Label>
              <Input
                id="accountName_internal"
                placeholder="e.g., My Live Account"
                value={accountName_internal}
                onChange={(e) => setAccountName_internal(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleOneClickConnect}
              disabled={isConnecting || !accountName_internal.trim()}
              className="w-full"
              size="lg"
            >
              {isConnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Connect & Import from cTrader
            </Button>

            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                ✨ No account numbers needed! OAuth will automatically discover your accounts and import trades.
              </p>
            </div>
          </CardContent>
        </Card>
      </PremiumFeature>
    );
  }

  if (loadingConnection) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Checking cTrader connection...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If connected, show connection status and import options
  if (connection) {
    return (
      <PremiumFeature feature="cTrader Integration">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/CTrader_logo.svg/120px-CTrader_logo.svg.png" 
                alt="cTrader" 
                className="w-6 h-6"
              />
              cTrader Integration
              <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
            </CardTitle>
            <CardDescription>
              Connected to cTrader account {connection.account_number}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Connected</span>
              </div>
              <p className="text-sm text-green-700">
                Account {connection.account_number} connected on{' '}
                {new Date(connection.connected_at).toLocaleDateString()}
              </p>
              {connection.last_sync && (
                <p className="text-sm text-green-700">
                  Last sync: {new Date(connection.last_sync).toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex gap-3 flex-col sm:flex-row">
              <Button 
                onClick={handleImportLatestTrades}
                disabled={isImporting}
                className="flex-1"
              >
                {isImporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Import Latest (30 days)
              </Button>

              <Button 
                onClick={handleImportAllTrades}
                disabled={isImporting}
                variant="outline"
                className="flex-1"
              >
                {isImporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Import All (1 year)
              </Button>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleDisconnect}
                variant="outline"
                className="w-full"
              >
                Disconnect
              </Button>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Auto-Import Features:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Automatic trade detection from your cTrader account</li>
                <li>Real-time trade data synchronization</li>
                <li>Complete trade history with P&L calculations</li>
                <li>Secure OAuth authentication</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </PremiumFeature>
    );
  }

  // If not connected, show connection option
  return (
    <PremiumFeature feature="cTrader Integration">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/CTrader_logo.svg/120px-CTrader_logo.svg.png" 
              alt="cTrader" 
              className="w-6 h-6"
            />
            cTrader Integration
            <AlertCircle className="h-5 w-5 text-amber-500 ml-auto" />
          </CardTitle>
          <CardDescription>
            Connect your cTrader account to automatically import trades for {accountName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleOneClickConnect}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Connect to cTrader
          </Button>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">✨ Simple One-Click Process:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Click "One-Click Connect to cTrader"</li>
              <li>Authenticate with your cTrader credentials</li>
              <li>Choose which account to connect</li>
              <li>Start importing your trading history automatically</li>
            </ol>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>No manual entry required!</strong> OAuth will automatically discover your available 
              cTrader accounts and let you choose which one to connect.
            </p>
          </div>
        </CardContent>
      </Card>
    </PremiumFeature>
  );
};