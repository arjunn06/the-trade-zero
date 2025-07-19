import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRequest {
  tradingAccountId: string;
  fromDate: string;
  toDate: string;
}

interface CTraderDeal {
  dealId: string;
  orderId: string;
  positionId: string;
  symbolName: string;
  dealType: number; // 0 = BUY, 1 = SELL
  volume: number;
  filledVolume: number;
  createTimestamp: number;
  executionTimestamp: number;
  executionPrice: number;
  commission: number;
  swap: number;
  pnl: number;
  comment?: string;
  // Additional fields from cTrader API
  grossProfit?: number;
  dealStatus?: string;
  orderType?: string;
  baseToUsdConversionRate?: number;
  quoteToDepositConversionRate?: number;
  marketPrice?: number;
  slippageInPoints?: number;
  marginRate?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tradingAccountId, fromDate, toDate }: ImportRequest = await req.json();
    
    console.log(`Importing cTrader trades for account: ${tradingAccountId}`);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from Authorization header
    const authHeader = req.headers.get('authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get cTrader connection info
    const { data: connection, error: connectionError } = await supabaseClient
      .from('ctrader_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('trading_account_id', tradingAccountId)
      .single();

    if (connectionError || !connection) {
      throw new Error('cTrader connection not found. Please connect first.');
    }

    // Check if token is expired and refresh if needed
    let accessToken = connection.access_token;
    if (new Date() >= new Date(connection.expires_at)) {
      console.log('Access token expired, refreshing...');
      
      const refreshResponse = await fetch('https://openapi.ctrader.com/apps/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: Deno.env.get('CTRADER_CLIENT_ID')!,
          client_secret: Deno.env.get('CTRADER_CLIENT_SECRET')!,
          refresh_token: connection.refresh_token,
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh access token');
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update connection with new token
      await supabaseClient
        .from('ctrader_connections')
        .update({
          access_token: accessToken,
          expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq('id', connection.id);
    }

    // Fetch deals from cTrader API
    // Note: This is a simplified example. In practice, you'd need to establish
    // a WebSocket connection to cTrader's Open API and send Protocol Buffer messages
    const deals = await fetchCTraderDeals(accessToken, connection.account_number, fromDate, toDate);
    
    console.log(`Fetched ${deals.length} deals from cTrader`);

    // Convert deals to trades and import
    const importedTrades = [];
    for (const deal of deals) {
      try {
        const trade = await convertDealToTrade(deal, tradingAccountId, user.id, supabaseClient);
        if (trade) {
          importedTrades.push(trade);
        }
      } catch (error) {
        console.error(`Failed to import deal ${deal.dealId}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        tradesCount: importedTrades.length,
        message: `Successfully imported ${importedTrades.length} trades from cTrader`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('cTrader import error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

async function fetchCTraderDeals(
  accessToken: string, 
  accountNumber: string, 
  fromDate: string, 
  toDate: string
): Promise<CTraderDeal[]> {
  // This is a placeholder implementation
  // In a real implementation, you would:
  // 1. Establish WebSocket connection to cTrader Open API
  // 2. Send ProtoOAApplicationAuthReq message
  // 3. Send ProtoOAAccountAuthReq message
  // 4. Send ProtoOADealListReq message with date range
  // 5. Parse ProtoOADealListRes response
  
  console.log('Fetching deals from cTrader API...');
  
  // For now, return empty array - you'll need to implement the actual API calls
  return [];
}

async function convertDealToTrade(
  deal: CTraderDeal, 
  tradingAccountId: string, 
  userId: string,
  supabaseClient: any
) {
  // Check if trade already exists
  const { data: existingTrade } = await supabaseClient
    .from('trades')
    .select('id')
    .eq('external_id', deal.dealId)
    .eq('trading_account_id', tradingAccountId)
    .single();

  if (existingTrade) {
    console.log(`Trade ${deal.dealId} already exists, skipping`);
    return null;
  }

  // Calculate slippage if execution price differs from market price
  const slippagePoints = deal.executionPrice && deal.marketPrice 
    ? Math.abs(deal.executionPrice - deal.marketPrice) 
    : null;

  // Convert cTrader deal to trade format with all available fields
  const tradeData = {
    user_id: userId,
    trading_account_id: tradingAccountId,
    external_id: deal.dealId,
    symbol: deal.symbolName,
    trade_type: deal.dealType === 0 ? 'long' : 'short',
    quantity: deal.volume / 100000, // Convert from lots to standard units
    entry_price: deal.executionPrice || 0,
    execution_price: deal.executionPrice,
    entry_date: new Date(deal.executionTimestamp).toISOString(),
    execution_time: new Date(deal.executionTimestamp).toISOString(),
    create_timestamp: new Date(deal.createTimestamp).toISOString(),
    commission: deal.commission || 0,
    swap: deal.swap || 0,
    pnl: deal.pnl || 0,
    gross_profit: deal.grossProfit || deal.pnl || 0,
    status: 'closed',
    notes: deal.comment || `Imported from cTrader (Deal ID: ${deal.dealId})`,
    source: 'ctrader',
    
    // cTrader specific fields
    deal_id: deal.dealId,
    order_id: deal.orderId,
    position_id: deal.positionId,
    filled_volume: deal.filledVolume ? deal.filledVolume / 100000 : null,
    deal_status: deal.dealStatus || 'FILLED',
    order_type: deal.orderType || 'MARKET',
    slippage_points: slippagePoints,
    base_to_usd_rate: deal.baseToUsdConversionRate,
    quote_to_deposit_rate: deal.quoteToDepositConversionRate,
    
    // Fields that would need additional API calls to get
    spread: null, // Would need to get from symbol info
    margin_rate: null, // Would need to get from account settings
    market_price_at_entry: null, // Would need historical data
    market_price_at_exit: null, // Would need historical data
  };

  // Insert trade
  const { data: insertedTrade, error } = await supabaseClient
    .from('trades')
    .insert(tradeData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  console.log(`Imported trade: ${deal.symbolName} - ${deal.dealType === 0 ? 'BUY' : 'SELL'} - ${deal.executionPrice}`);
  return insertedTrade;
}