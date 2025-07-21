import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ExternalLink, Download } from 'lucide-react';
import { PremiumFeature } from './PremiumFeature';

interface CTraderIntegrationProps {
  accountId: string;
  accountName: string;
  isFirstAccount?: boolean;
}

export const CTraderIntegration: React.FC<CTraderIntegrationProps> = ({
  accountId,
  accountName,
  isFirstAccount = false,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName_internal, setAccountName_internal] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const handleConnect = async () => {
    if (!accountNumber.trim()) {
      toast({
        title: "Account Number Required",
        description: "Please enter your cTrader account number",
        variant: "destructive",
      });
      return;
    }

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

      // Call the edge function to initiate OAuth flow
      const { data, error } = await supabase.functions.invoke('ctrader-auth', {
        body: {
          accountNumber: accountNumber.trim(),
          tradingAccountId: finalAccountId,
        },
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Open OAuth URL in new window
        window.open(data.authUrl, 'ctrader-auth', 'width=600,height=700');
        
        toast({
          title: "Authentication Started",
          description: "Please complete the authentication in the popup window",
        });

        // If this was the first account, refresh the page after a delay to show the new account
        if (isFirstAccount) {
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        }
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

  const handleImportTrades = async () => {
    setIsImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('ctrader-import', {
        body: {
          tradingAccountId: accountId,
          fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
          toDate: new Date().toISOString(),
        },
      });

      if (error) throw error;

      toast({
        title: "Import Successful",
        description: `Imported ${data?.tradesCount || 0} trades from cTrader`,
      });
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
              Import your trading account and history from cTrader
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
            
            <div className="space-y-2">
              <Label htmlFor="accountNumber">cTrader Account Number</Label>
              <Input
                id="accountNumber"
                placeholder="Enter your cTrader account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleConnect}
              disabled={isConnecting || !accountNumber.trim() || !accountName_internal.trim()}
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
                This will create your trading account and connect it to cTrader for automatic trade import
              </p>
            </div>
          </CardContent>
        </Card>
      </PremiumFeature>
    );
  }

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
          </CardTitle>
          <CardDescription>
            Connect your cTrader account to automatically import trades for {accountName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accountNumber">cTrader Account Number</Label>
            <Input
              id="accountNumber"
              placeholder="Enter your cTrader account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              You can find your account number in your cTrader platform under Account Information
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleConnect}
              disabled={isConnecting || !accountNumber.trim()}
              className="flex-1"
            >
              {isConnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Connect to cTrader
            </Button>

            <Button 
              onClick={handleImportTrades}
              disabled={isImporting}
              variant="outline"
              className="flex-1"
            >
              {isImporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Import Trades
            </Button>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">How it works:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Enter your cTrader account number</li>
              <li>Click "Connect to cTrader" to authenticate</li>
              <li>Once connected, use "Import Trades" to fetch your trading history</li>
              <li>Your trades will be automatically mapped to this trading account</li>
            </ol>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> You'll need a cTrader account with API access enabled. 
              Contact your broker if you need API access activated.
            </p>
          </div>
        </CardContent>
      </Card>
    </PremiumFeature>
  );
};