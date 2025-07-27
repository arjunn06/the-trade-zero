import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  tradingAccountId: string;
  fullSync?: boolean; // Whether to perform a full sync or just recent data
}

interface AccountInfo {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  currency: string;
  accountNumber: string;
}

interface Position {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  currentPrice: number;
  pnl: number;
  commission: number;
  swap: number;
  openTime: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tradingAccountId, fullSync = false }: SyncRequest = await req.json();
    
    console.log(`Starting cTrader sync for account: ${tradingAccountId}, fullSync: ${fullSync}`);

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
      console.error('Authentication failed:', userError);
      throw new Error('Unauthorized');
    }

    console.log(`User authenticated: ${user.id}`);

    // Get cTrader connection info
    const { data: connection, error: connectionError } = await supabaseClient
      .from('ctrader_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('trading_account_id', tradingAccountId)
      .single();

    if (connectionError) {
      console.error('Connection query error:', connectionError);
      throw new Error(`Database error: ${connectionError.message}`);
    }

    if (!connection) {
      console.error('No connection found for user:', user.id, 'account:', tradingAccountId);
      throw new Error('cTrader connection not found. Please connect first.');
    }

    console.log(`Found connection: ${connection.account_number}`);

    // Check if token needs refresh (if expires_at is within 1 hour)
    const expiresAt = new Date(connection.expires_at);
    const now = new Date();
    const oneHour = 60 * 60 * 1000;

    if (expiresAt.getTime() - now.getTime() < oneHour) {
      console.log('Access token needs refresh');
      await refreshAccessToken(supabaseClient, connection);
    }

    // Sync account information
    const accountInfo = await fetchAccountInfo(connection.access_token, connection.account_number);
    
    // Update trading account with latest balance and equity
    const { error: updateError } = await supabaseClient
      .from('trading_accounts')
      .update({
        current_balance: accountInfo.balance,
        current_equity: accountInfo.equity,
        currency: accountInfo.currency,
        updated_at: new Date().toISOString()
      })
      .eq('id', tradingAccountId);

    if (updateError) {
      console.error('Failed to update account info:', updateError);
    } else {
      console.log('Updated account balance and equity');
    }

    // Sync recent trades (last 7 days for regular sync, full history for full sync)
    const syncDays = fullSync ? 365 : 7;
    const fromDate = new Date(Date.now() - syncDays * 24 * 60 * 60 * 1000).toISOString();
    const toDate = new Date().toISOString();

    console.log(`Syncing trades from ${fromDate} to ${toDate}`);

    // Import recent trades
    const { data: importResult, error: importError } = await supabaseClient.functions.invoke('ctrader-import', {
      body: {
        tradingAccountId,
        fromDate,
        toDate,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    let tradesCount = 0;
    if (!importError && importResult) {
      tradesCount = importResult.tradesCount || 0;
      console.log(`Imported ${tradesCount} trades during sync`);
    }

    // Sync open positions
    const positions = await fetchOpenPositions(connection.access_token, connection.account_number);
    await syncOpenPositions(supabaseClient, tradingAccountId, user.id, positions);

    // Update last sync time
    await supabaseClient
      .from('ctrader_connections')
      .update({
        last_sync: new Date().toISOString()
      })
      .eq('id', connection.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Sync completed successfully`,
        accountInfo: {
          balance: accountInfo.balance,
          equity: accountInfo.equity,
          currency: accountInfo.currency
        },
        tradesImported: tradesCount,
        openPositions: positions.length,
        syncType: fullSync ? 'full' : 'incremental'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('cTrader sync error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
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

async function refreshAccessToken(supabaseClient: any, connection: any) {
  console.log('Refreshing access token...');
  
  try {
    const response = await fetch('https://openapi.ctrader.com/apps/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token,
        client_id: Deno.env.get('CTRADER_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('CTRADER_CLIENT_SECRET') ?? '',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const tokenData = await response.json();
    
    // Update connection with new tokens
    await supabaseClient
      .from('ctrader_connections')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || connection.refresh_token,
        expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
      })
      .eq('id', connection.id);

    console.log('Access token refreshed successfully');
    
  } catch (error) {
    console.error('Failed to refresh token:', error);
    throw error;
  }
}

async function fetchAccountInfo(accessToken: string, accountNumber: string): Promise<AccountInfo> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (ws) ws.close();
      reject(new Error('Account info fetch timeout'));
    }, 15000);

    let ws: WebSocket;

    try {
      ws = new WebSocket('wss://live.ctraderapi.com:5036');

      ws.onopen = () => {
        console.log('WebSocket connected for account info');
        
        const authMessage = {
          payloadType: "ProtoOAApplicationAuthReq",
          clientId: Deno.env.get('CTRADER_CLIENT_ID'),
          clientSecret: Deno.env.get('CTRADER_CLIENT_SECRET')
        };
        
        ws.send(JSON.stringify(authMessage));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Account info response:', message.payloadType);

          if (message.payloadType === 'ProtoOAApplicationAuthRes') {
            const accountAuthMessage = {
              payloadType: "ProtoOAAccountAuthReq",
              accessToken: accessToken
            };
            ws.send(JSON.stringify(accountAuthMessage));

          } else if (message.payloadType === 'ProtoOAAccountAuthRes') {
            const accountInfoMessage = {
              payloadType: "ProtoOATraderReq",
              ctidTraderAccountId: parseInt(accountNumber.replace(/\D/g, ''))
            };
            ws.send(JSON.stringify(accountInfoMessage));

          } else if (message.payloadType === 'ProtoOATraderRes') {
            clearTimeout(timeout);
            ws.close();
            
            const trader = message.trader || {};
            resolve({
              balance: trader.balance || 0,
              equity: trader.balance || 0, // cTrader doesn't always provide equity directly
              margin: trader.usedMargin || 0,
              freeMargin: trader.freeMargin || 0,
              marginLevel: trader.marginLevel || 0,
              currency: trader.depositCurrency || 'USD',
              accountNumber: accountNumber
            });

          } else if (message.payloadType && typeof message.payloadType === 'string' && message.payloadType.includes('Error')) {
            clearTimeout(timeout);
            ws.close();
            reject(new Error(`cTrader API Error: ${message.description || message.errorCode}`));
          }

        } catch (parseError) {
          console.error('Error parsing account info message:', parseError);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${error}`));
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        if (event.code !== 1000) {
          reject(new Error(`WebSocket closed: ${event.code} ${event.reason}`));
        }
      };

    } catch (error) {
      clearTimeout(timeout);
      reject(new Error(`WebSocket setup failed: ${error.message}`));
    }
  });
}

async function fetchOpenPositions(accessToken: string, accountNumber: string): Promise<Position[]> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (ws) ws.close();
      reject(new Error('Positions fetch timeout'));
    }, 15000);

    let ws: WebSocket;
    const positions: Position[] = [];

    try {
      ws = new WebSocket('wss://live.ctraderapi.com:5036');

      ws.onopen = () => {
        console.log('WebSocket connected for positions');
        
        const authMessage = {
          payloadType: "ProtoOAApplicationAuthReq",
          clientId: Deno.env.get('CTRADER_CLIENT_ID'),
          clientSecret: Deno.env.get('CTRADER_CLIENT_SECRET')
        };
        
        ws.send(JSON.stringify(authMessage));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.payloadType === 'ProtoOAApplicationAuthRes') {
            const accountAuthMessage = {
              payloadType: "ProtoOAAccountAuthReq",
              accessToken: accessToken
            };
            ws.send(JSON.stringify(accountAuthMessage));

          } else if (message.payloadType === 'ProtoOAAccountAuthRes') {
            const positionsMessage = {
              payloadType: "ProtoOAReconcileReq",
              ctidTraderAccountId: parseInt(accountNumber.replace(/\D/g, ''))
            };
            ws.send(JSON.stringify(positionsMessage));

          } else if (message.payloadType === 'ProtoOAReconcileRes') {
            clearTimeout(timeout);
            
            if (message.position && Array.isArray(message.position)) {
              for (const pos of message.position) {
                positions.push({
                  id: pos.positionId?.toString() || `${Date.now()}_${positions.length}`,
                  symbol: pos.symbolName || 'UNKNOWN',
                  side: pos.tradeData?.tradeSide === 1 ? 'BUY' : 'SELL',
                  volume: (pos.tradeData?.volume || 0) / 100000,
                  openPrice: pos.price || 0,
                  currentPrice: pos.currentPrice || pos.price || 0,
                  pnl: pos.swap + pos.commission + pos.moneyDigits || 0,
                  commission: pos.commission || 0,
                  swap: pos.swap || 0,
                  openTime: pos.utcLastUpdateTimestamp || Date.now()
                });
              }
            }
            
            ws.close();
            resolve(positions);

          } else if (message.payloadType && typeof message.payloadType === 'string' && message.payloadType.includes('Error')) {
            clearTimeout(timeout);
            ws.close();
            reject(new Error(`cTrader API Error: ${message.description || message.errorCode}`));
          }

        } catch (parseError) {
          console.error('Error parsing positions message:', parseError);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${error}`));
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        if (event.code !== 1000) {
          reject(new Error(`WebSocket closed: ${event.code} ${event.reason}`));
        }
      };

    } catch (error) {
      clearTimeout(timeout);
      reject(new Error(`WebSocket setup failed: ${error.message}`));
    }
  });
}

async function syncOpenPositions(supabaseClient: any, tradingAccountId: string, userId: string, positions: Position[]) {
  console.log(`Syncing ${positions.length} open positions`);
  
  for (const position of positions) {
    try {
      // Check if position already exists
      const { data: existingPosition } = await supabaseClient
        .from('trades')
        .select('id')
        .eq('external_id', position.id)
        .eq('trading_account_id', tradingAccountId)
        .eq('status', 'open')
        .single();

      const positionData = {
        user_id: userId,
        trading_account_id: tradingAccountId,
        external_id: position.id,
        symbol: position.symbol,
        trade_type: position.side.toLowerCase(),
        quantity: position.volume,
        entry_price: position.openPrice,
        entry_date: new Date(position.openTime).toISOString(),
        pnl: position.pnl,
        commission: position.commission,
        swap: position.swap,
        status: 'open',
        notes: `Open position from cTrader (Live sync)`,
        source: 'ctrader',
        updated_at: new Date().toISOString()
      };

      if (existingPosition) {
        // Update existing position
        await supabaseClient
          .from('trades')
          .update({
            pnl: position.pnl,
            commission: position.commission,
            swap: position.swap,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPosition.id);
      } else {
        // Insert new position
        await supabaseClient
          .from('trades')
          .insert(positionData);
      }

    } catch (error) {
      console.error('Error syncing position:', position.id, error);
    }
  }
}