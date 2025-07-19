import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ExternalLink, Download } from 'lucide-react';
import { PremiumFeature } from './PremiumFeature';

interface CTraderIntegrationProps {
  accountId: string;
  accountName: string;
}

export const CTraderIntegration: React.FC<CTraderIntegrationProps> = ({
  accountId,
  accountName,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const { toast } = useToast();

  const handleConnect = async () => {
    if (!accountNumber.trim()) {
      toast({
        title: "Account Number Required",
        description: "Please enter your cTrader account number",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      // Call the edge function to initiate OAuth flow
      const { data, error } = await supabase.functions.invoke('ctrader-auth', {
        body: {
          accountNumber: accountNumber.trim(),
          tradingAccountId: accountId,
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