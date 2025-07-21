import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    console.log('Full callback URL:', req.url);
    console.log('URL search params:', url.searchParams.toString());
    
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');
    
    console.log('Extracted code:', code ? 'present' : 'missing');
    console.log('Extracted state:', state ? 'present' : 'missing');
    console.log('OAuth error:', error);
    console.log('OAuth error description:', errorDescription);

    // Check for OAuth errors first
    if (error) {
      console.error('OAuth error received:', error, errorDescription);
      throw new Error(`OAuth error: ${error} - ${errorDescription}`);
    }

    if (!code) {
      console.error('Missing authorization code from cTrader');
      throw new Error('Missing authorization code from cTrader OAuth flow');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Looking for auth states...');
    
    // Get all current auth states for debugging
    const { data: allStates } = await supabaseClient
      .from('ctrader_auth_states')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('All auth states in DB:', allStates?.length || 0);
    console.log('Auth states:', allStates?.map(s => ({
      state: s.state.substring(0, 8) + '...',
      expires_at: s.expires_at,
      is_expired: new Date(s.expires_at) < new Date(),
      created_at: s.created_at
    })));

    // Try to find auth state by state parameter first
    let authState = null;
    if (state) {
      console.log('Searching for state:', state.substring(0, 8) + '...');
      const { data, error: stateError } = await supabaseClient
        .from('ctrader_auth_states')
        .select('*')
        .eq('state', state)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      
      if (data) {
        authState = data;
        console.log('Found auth state by state parameter');
      } else {
        console.log('State not found or expired:', stateError?.message);
      }
    }

    // If no state found by parameter, try fallback to most recent valid state
    if (!authState) {
      console.log('Using fallback: searching for most recent valid auth state');
      const { data, error: fallbackError } = await supabaseClient
        .from('ctrader_auth_states')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) {
        authState = data;
        console.log('Found auth state via fallback method');
      } else {
        console.log('No valid auth state found via fallback:', fallbackError?.message);
      }
    }

    if (!authState) {
      console.error('No valid authentication session found');
      console.log('Current time:', new Date().toISOString());
      console.log('Recent auth states:');
      allStates?.slice(0, 3).forEach(s => {
        console.log(`- State: ${s.state.substring(0, 8)}..., expires: ${s.expires_at}, expired: ${new Date(s.expires_at) < new Date()}`);
      });
      throw new Error('No valid authentication session found. Please try connecting again from the Trading Accounts page.');
    }

    console.log(`Processing cTrader callback for user: ${authState.user_id}`);

    // Exchange code for access token
    const CTRADER_CLIENT_ID = Deno.env.get('CTRADER_CLIENT_ID');
    const CTRADER_CLIENT_SECRET = Deno.env.get('CTRADER_CLIENT_SECRET');
    const REDIRECT_URI = 'https://dynibyqrcbxneiwjyahn.supabase.co/functions/v1/ctrader-callback';

    const tokenResponse = await fetch('https://connect.spotware.com/apps/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CTRADER_CLIENT_ID!,
        client_secret: CTRADER_CLIENT_SECRET!,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful');

    // Get account information from cTrader API
    const accountInfo = await fetchAccountInfo(tokenData.access_token);
    
    // Store the access token and refresh token
    await supabaseClient
      .from('ctrader_connections')
      .upsert({
        user_id: authState.user_id,
        trading_account_id: authState.trading_account_id,
        account_number: accountInfo.accountNumber || `Account_${Date.now()}`,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        connected_at: new Date().toISOString(),
      });

    // Clean up auth state - use the state we found, not the parameter
    await supabaseClient
      .from('ctrader_auth_states')
      .delete()
      .eq('state', authState.state);

    // Return success page
    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>cTrader Connected</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: green; font-size: 24px; margin-bottom: 20px; }
          .message { font-size: 16px; color: #666; }
        </style>
      </head>
      <body>
        <div class="success">✓ Successfully Connected to cTrader</div>
        <div class="message">
          Your cTrader account has been connected successfully.<br>
          You can now close this window and import your trades.
        </div>
        <script>
          // Auto-close window after 3 seconds
          setTimeout(() => window.close(), 3000);
        </script>
      </body>
      </html>
    `;

    return new Response(successHtml, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error) {
    console.error('cTrader callback error:', error);
    
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connection Failed</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: red; font-size: 24px; margin-bottom: 20px; }
          .message { font-size: 16px; color: #666; }
        </style>
      </head>
      <body>
        <div class="error">✗ Connection Failed</div>
        <div class="message">
          ${error.message}<br>
          Please try again or contact support.
        </div>
        <script>
          setTimeout(() => window.close(), 5000);
        </script>
      </body>
      </html>
    `;

    return new Response(errorHtml, {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
});

// Helper function to fetch account information from cTrader API
async function fetchAccountInfo(accessToken: string) {
  try {
    console.log('Attempting to fetch real account info from cTrader API...');
    
    // Try multiple approaches to get account info
    const accountInfo = await tryMultipleAccountFetchMethods(accessToken);
    console.log('Successfully fetched account info:', accountInfo);
    
    return accountInfo;
  } catch (error) {
    console.error('All account fetch methods failed:', error);
    
    // For now, we'll prompt the user to verify their account manually
    // This is safer than using random numbers
    console.log('Using fallback account info - user will need to verify');
    
    return {
      accountNumber: `VERIFY_${Date.now()}`, // User will need to verify this
      accountName: 'Please Verify Account',
      currency: 'USD',
      balance: 0,
      needsVerification: true
    };
  }
}

async function tryMultipleAccountFetchMethods(accessToken: string) {
  const errors = [];
  
  // Try WebSocket connections to both live and demo endpoints
  const endpoints = ['live', 'demo'];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying cTrader Open API endpoint: ${endpoint}`);
      const wsResult = await fetchAccountViaWebSocket(accessToken, endpoint);
      if (wsResult) return wsResult;
    } catch (error) {
      console.log(`cTrader ${endpoint} endpoint failed:`, error.message);
      errors.push(`${endpoint}: ${error.message}`);
    }
  }
  
  throw new Error(`All methods failed: ${errors.join('; ')}`);
}

async function fetchAccountViaREST(accessToken: string) {
  // cTrader doesn't use REST API - this method should not be used
  // Instead, we need to use WebSocket connections to their Open API
  throw new Error('cTrader uses WebSocket Open API, not REST endpoints');
}

async function fetchAccountViaWebSocket(accessToken: string, endpoint: string) {
  return new Promise((resolve, reject) => {
    let ws: WebSocket;
    
    const timeout = setTimeout(() => {
      if (ws) ws.close();
      reject(new Error('WebSocket timeout'));
    }, 15000);
    
    try {
      // Use the correct cTrader Open API endpoints
      const wsUrl = endpoint === 'live' 
        ? 'wss://live.ctraderapi.com:5036'  // JSON port for live
        : 'wss://demo.ctraderapi.com:5036'; // JSON port for demo
      
      console.log(`Connecting to cTrader Open API: ${wsUrl}`);
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log(`WebSocket connected to ${wsUrl}`);
        
        // Step 1: Application authorization
        const appAuthMessage = {
          payloadType: "ProtoOAApplicationAuthReq",
          clientId: Deno.env.get('CTRADER_CLIENT_ID'),
          clientSecret: Deno.env.get('CTRADER_CLIENT_SECRET')
        };
        
        console.log('Sending application auth request...');
        ws.send(JSON.stringify(appAuthMessage));
      };
      
      ws.onmessage = (event) => {
        try {
          console.log(`WebSocket message from ${wsUrl}:`, event.data);
          const message = JSON.parse(event.data);
          
          if (message.payloadType === 'ProtoOAApplicationAuthRes') {
            console.log('Application authorized, requesting account authorization...');
            
            // Step 2: Account authorization with access token
            const accountAuthMessage = {
              payloadType: "ProtoOAAccountAuthReq",
              accessToken: accessToken
            };
            
            ws.send(JSON.stringify(accountAuthMessage));
            
          } else if (message.payloadType === 'ProtoOAAccountAuthRes') {
            console.log('Account authorized, requesting account list...');
            
            // Step 3: Get account list  
            const accountListMessage = {
              payloadType: "ProtoOAGetAccountListByAccessTokenReq"
            };
            
            ws.send(JSON.stringify(accountListMessage));
            
          } else if (message.payloadType === 'ProtoOAGetAccountListByAccessTokenRes') {
            clearTimeout(timeout);
            
            const accounts = message.ctidTraderAccount || [];
            console.log('Received accounts:', accounts);
            
            if (accounts.length > 0) {
              const account = accounts[0];
              ws.close();
              resolve({
                accountNumber: account.ctidTraderAccountId?.toString() || `CT${Date.now()}`,
                accountName: account.traderLogin?.toString() || 'Live Account',
                currency: account.depositCurrency || 'USD',
                balance: account.balance || 0,
                ctidTraderAccountId: account.ctidTraderAccountId,
                traderLogin: account.traderLogin
              });
            } else {
              ws.close();
              reject(new Error('No accounts found'));
            }
            
          } else if (message.payloadType === 2142 || (message.payload && message.payload.errorCode)) {
            clearTimeout(timeout);
            ws.close();
            reject(new Error(`cTrader API Error: ${message.payload?.description || message.payload?.errorCode || 'Unknown error'}`));
          }
          
        } catch (parseError) {
          console.log('Error parsing WebSocket message:', parseError);
        }
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        console.log(`WebSocket error for ${wsUrl}:`, error);
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