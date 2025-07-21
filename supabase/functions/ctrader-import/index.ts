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
      .maybeSingle();

    if (connectionError || !connection) {
      throw new Error('cTrader connection not found. Please connect first.');
    }

    // Check if this is a verification account that needs manual setup
    if (connection.account_number.startsWith('VERIFY_')) {
      console.log('Account needs verification, generating sample data...');
      
      // Use sample data for verification accounts since we can't fetch real data yet
      const fromTimestamp = new Date(fromDate).getTime();
      const toTimestamp = new Date(toDate).getTime();
      
      const deals = generateSampleDealsForDateRange(fromTimestamp, toTimestamp, connection.account_number);
      
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
          message: `Successfully imported ${importedTrades.length} sample trades (account verification needed)`,
          isVerificationAccount: true
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
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
  console.log('Fetching REAL data from cTrader Open API...');
  console.log(`Account: ${accountNumber}, From: ${fromDate}, To: ${toDate}`);
  
  try {
    // Try to fetch real data using cTrader's HTTP API endpoints
    const deals = await fetchRealCTraderData(accessToken, accountNumber, fromDate, toDate);
    console.log(`Successfully fetched ${deals.length} real deals from your cTrader account`);
    return deals;
  } catch (error) {
    console.error('Failed to fetch real cTrader data:', error);
    throw new Error(`Unable to fetch your real trading data: ${error.message}. Please check your cTrader connection.`);
  }
}

async function fetchRealCTraderData(
  accessToken: string,
  accountNumber: string,
  fromDate: string,
  toDate: string
): Promise<CTraderDeal[]> {
  console.log('Attempting to connect to cTrader Open API...');
  
  // cTrader's actual API endpoints - these may need adjustment based on their latest API
  const baseUrl = 'https://openapi.ctrader.com/v1';
  
  try {
    // First, get account information
    console.log('Getting account information...');
    const accountResponse = await fetch(`${baseUrl}/accounts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!accountResponse.ok) {
      throw new Error(`Account API error: ${accountResponse.status} ${accountResponse.statusText}`);
    }
    
    const accountData = await accountResponse.json();
    console.log('Account data received:', accountData);
    
    // Find the specific account
    const account = accountData.accounts?.find((acc: any) => 
      acc.accountNumber === accountNumber || acc.id === accountNumber
    );
    
    if (!account) {
      throw new Error(`Account ${accountNumber} not found in your cTrader accounts`);
    }
    
    console.log(`Found account: ${account.accountNumber || account.id}`);
    
    // Get historical trades/deals
    console.log('Fetching historical deals...');
    const fromTimestamp = new Date(fromDate).getTime();
    const toTimestamp = new Date(toDate).getTime();
    
    const dealsResponse = await fetch(`${baseUrl}/accounts/${account.id}/deals`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      // Add query parameters for date range
      body: null
    });
    
    if (!dealsResponse.ok) {
      throw new Error(`Deals API error: ${dealsResponse.status} ${dealsResponse.statusText}`);
    }
    
    const dealsData = await dealsResponse.json();
    console.log(`Raw deals data:`, dealsData);
    
    // Convert the response to our CTraderDeal format
    const deals: CTraderDeal[] = [];
    
    if (dealsData.deals && Array.isArray(dealsData.deals)) {
      for (const deal of dealsData.deals) {
        // Filter by date range
        const dealTime = deal.executionTimestamp || deal.createTimestamp;
        if (dealTime >= fromTimestamp && dealTime <= toTimestamp) {
          deals.push({
            dealId: deal.dealId?.toString() || `${Date.now()}_${deals.length}`,
            orderId: deal.orderId?.toString() || '',
            positionId: deal.positionId?.toString() || '',
            symbolName: deal.symbolName || deal.symbol || 'UNKNOWN',
            dealType: deal.dealType !== undefined ? deal.dealType : (deal.side === 'BUY' ? 0 : 1),
            volume: deal.volume || deal.quantity || 0,
            filledVolume: deal.filledVolume || deal.volume || deal.quantity || 0,
            createTimestamp: deal.createTimestamp || deal.timestamp || Date.now(),
            executionTimestamp: deal.executionTimestamp || deal.timestamp || Date.now(),
            executionPrice: deal.executionPrice || deal.price || 0,
            commission: deal.commission || 0,
            swap: deal.swap || deal.swapFee || 0,
            pnl: deal.pnl || deal.profit || deal.grossProfit || 0,
            grossProfit: deal.grossProfit || deal.pnl || deal.profit || 0,
            dealStatus: deal.dealStatus || deal.status || 'FILLED',
            orderType: deal.orderType || deal.type || 'MARKET',
            comment: deal.comment || deal.label || `Real trade from cTrader account ${accountNumber}`,
            baseToUsdConversionRate: deal.baseToUsdConversionRate,
            quoteToDepositConversionRate: deal.quoteToDepositConversionRate,
            marketPrice: deal.marketPrice,
            slippageInPoints: deal.slippageInPoints,
            marginRate: deal.marginRate
          });
        }
      }
    }
    
    console.log(`Processed ${deals.length} real deals from your cTrader account`);
    return deals;
    
  } catch (error) {
    console.error('Error in fetchRealCTraderData:', error);
    
    // If the HTTP API fails, we could try the WebSocket approach as backup
    console.log('HTTP API failed, attempting WebSocket connection...');
    return await fetchViaWebSocket(accessToken, accountNumber, fromDate, toDate);
  }
}

async function fetchViaWebSocket(
  accessToken: string,
  accountNumber: string,
  fromDate: string,
  toDate: string
): Promise<CTraderDeal[]> {
  return new Promise((resolve, reject) => {
    const deals: CTraderDeal[] = [];
    let ws: WebSocket;
    
    try {
      // Connect to cTrader Open API WebSocket
      ws = new WebSocket('wss://openapi.ctrader.com');
      
      // Set a shorter timeout
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout - cTrader API may be temporarily unavailable'));
      }, 15000); // 15 second timeout instead of 30
      
      ws.onopen = () => {
        console.log('WebSocket connected to cTrader');
        clearTimeout(timeout);
        
        // Send application authentication
        const authMessage = JSON.stringify({
          payloadType: 'ProtoOAApplicationAuthReq',
          clientId: Deno.env.get('CTRADER_CLIENT_ID'),
          clientSecret: Deno.env.get('CTRADER_CLIENT_SECRET')
        });
        
        ws.send(authMessage);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message:', message.payloadType);
          
          if (message.payloadType === 'ProtoOAApplicationAuthRes') {
            // App authenticated, now authenticate account
            const accountAuthMessage = JSON.stringify({
              payloadType: 'ProtoOAAccountAuthReq',
              ctidTraderAccountId: parseInt(accountNumber.replace(/\D/g, '')),
              accessToken: accessToken
            });
            ws.send(accountAuthMessage);
            
          } else if (message.payloadType === 'ProtoOAAccountAuthRes') {
            // Account authenticated, request deals
            const dealListMessage = JSON.stringify({
              payloadType: 'ProtoOADealListReq',
              ctidTraderAccountId: parseInt(accountNumber.replace(/\D/g, '')),
              fromTimestamp: new Date(fromDate).getTime(),
              toTimestamp: new Date(toDate).getTime(),
              maxRows: 1000
            });
            ws.send(dealListMessage);
            
          } else if (message.payloadType === 'ProtoOADealListRes') {
            // Process real deals from your account
            if (message.deal && Array.isArray(message.deal)) {
              for (const deal of message.deal) {
                deals.push({
                  dealId: deal.dealId?.toString() || `WS_${Date.now()}_${deals.length}`,
                  orderId: deal.orderId?.toString() || '',
                  positionId: deal.positionId?.toString() || '',
                  symbolName: deal.symbolName || 'UNKNOWN',
                  dealType: deal.dealType || 0,
                  volume: deal.volume || 0,
                  filledVolume: deal.filledVolume || deal.volume || 0,
                  createTimestamp: deal.createTimestamp || Date.now(),
                  executionTimestamp: deal.executionTimestamp || deal.createTimestamp || Date.now(),
                  executionPrice: deal.executionPrice || 0,
                  commission: deal.commission || 0,
                  swap: deal.swap || 0,
                  pnl: deal.pnl || 0,
                  grossProfit: deal.grossProfit || deal.pnl || 0,
                  dealStatus: deal.dealStatus || 'FILLED',
                  orderType: deal.orderType || 'MARKET',
                  comment: `Real trade from your cTrader account ${accountNumber}`,
                  baseToUsdConversionRate: deal.baseToUsdConversionRate,
                  quoteToDepositConversionRate: deal.quoteToDepositConversionRate,
                  marketPrice: deal.marketPrice,
                  slippageInPoints: deal.slippageInPoints,
                  marginRate: deal.marginRate
                });
              }
            }
            
            ws.close();
            resolve(deals);
            
          } else if (message.payloadType === 'ProtoOAErrorRes') {
            ws.close();
            reject(new Error(`cTrader API Error: ${message.errorCode} - ${message.description}`));
          }
          
        } catch (parseError) {
          console.error('Error parsing WebSocket message:', parseError);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(new Error('Failed to connect to cTrader API via WebSocket'));
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        if (deals.length === 0 && event.code !== 1000) {
          reject(new Error(`WebSocket closed unexpectedly: ${event.reason || 'Unknown error'}`));
        }
      };
      
    } catch (error) {
      reject(new Error(`WebSocket setup failed: ${error.message}`));
    }
  });
}

function generateSampleDealsForDateRange(fromTimestamp: number, toTimestamp: number, accountNumber: string): CTraderDeal[] {
  const timeRange = toTimestamp - fromTimestamp;
  const daysInRange = Math.ceil(timeRange / (24 * 60 * 60 * 1000));
  
  // Generate 1-3 trades per week in the range
  const numberOfTrades = Math.max(1, Math.floor(daysInRange / 7) * 2);
  
  const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF', 'EURGBP'];
  const sampleDeals: CTraderDeal[] = [];
  
  for (let i = 0; i < numberOfTrades; i++) {
    // Random time within the date range
    const tradeTime = fromTimestamp + Math.random() * timeRange;
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const isBuy = Math.random() > 0.5;
    const volume = [10000, 50000, 100000, 200000][Math.floor(Math.random() * 4)]; // 0.1, 0.5, 1, 2 lots
    
    // Generate realistic prices based on symbol
    let basePrice = 1.0;
    if (symbol.includes('JPY')) basePrice = 150;
    else if (symbol.includes('GBP')) basePrice = 1.25;
    else if (symbol.includes('AUD') || symbol.includes('NZD')) basePrice = 0.65;
    
    const price = basePrice + (Math.random() - 0.5) * 0.1;
    const pnl = (Math.random() - 0.5) * 500; // Random P&L between -250 and +250
    
    sampleDeals.push({
      dealId: `${accountNumber}_${tradeTime}_${i}`,
      orderId: `ORDER_${tradeTime}_${i}`,
      positionId: `POS_${tradeTime}_${i}`,
      symbolName: symbol,
      dealType: isBuy ? 0 : 1,
      volume: volume,
      filledVolume: volume,
      createTimestamp: tradeTime - 1000, // Order created 1 second before execution
      executionTimestamp: tradeTime,
      executionPrice: parseFloat(price.toFixed(symbol.includes('JPY') ? 3 : 5)),
      commission: -(volume / 100000) * (Math.random() * 5 + 2), // $2-7 per lot
      swap: Math.random() > 0.7 ? (Math.random() - 0.5) * 10 : 0, // Sometimes swap
      pnl: parseFloat(pnl.toFixed(2)),
      grossProfit: parseFloat(pnl.toFixed(2)),
      dealStatus: 'FILLED',
      orderType: Math.random() > 0.8 ? 'LIMIT' : 'MARKET',
      comment: `${symbol} ${isBuy ? 'BUY' : 'SELL'} - Sample trade (account needs verification)`
    });
  }
  
  // Sort by execution time
  sampleDeals.sort((a, b) => a.executionTimestamp - b.executionTimestamp);
  
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