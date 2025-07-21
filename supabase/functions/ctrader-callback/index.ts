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
    console.log('Fetching REAL account info from cTrader API...');
    
    // Connect to cTrader Open API to get real account information
    const accountInfo = await getRealAccountInfo(accessToken);
    console.log('Successfully fetched real account info:', accountInfo);
    
    return accountInfo;
  } catch (error) {
    console.error('Error fetching real account info:', error);
    throw new Error(`Failed to fetch your account information: ${error.message}`);
  }
}

async function getRealAccountInfo(accessToken: string) {
  return new Promise((resolve, reject) => {
    let ws: WebSocket;
    
    try {
      // Connect to cTrader Open API
      ws = new WebSocket('wss://openapi.ctrader.com');
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Timeout fetching account information'));
      }, 20000);
      
      ws.onopen = () => {
        console.log('Connected to cTrader for account info');
        clearTimeout(timeout);
        
        // Authenticate application
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
          console.log('Account info message type:', message.payloadType);
          
          if (message.payloadType === 'ProtoOAApplicationAuthRes') {
            // App authenticated, get account list
            const accountListMessage = JSON.stringify({
              payloadType: 'ProtoOAAccountListReq',
              accessToken: accessToken
            });
            ws.send(accountListMessage);
            
          } else if (message.payloadType === 'ProtoOAAccountListRes') {
            // Got account list - return the first/primary account
            if (message.ctidTraderAccount && message.ctidTraderAccount.length > 0) {
              const account = message.ctidTraderAccount[0];
              
              const accountInfo = {
                accountNumber: account.ctidTraderAccountId?.toString() || `CT${account.accountNumber || Date.now()}`,
                accountName: account.accountName || account.traderLogin || 'Live Account',
                currency: account.depositCurrency || 'USD',
                balance: account.balance || 0,
                ctidTraderAccountId: account.ctidTraderAccountId,
                traderLogin: account.traderLogin
              };
              
              console.log('Real account info:', accountInfo);
              ws.close();
              resolve(accountInfo);
            } else {
              ws.close();
              reject(new Error('No accounts found for this cTrader user'));
            }
            
          } else if (message.payloadType === 'ProtoOAErrorRes') {
            ws.close();
            reject(new Error(`cTrader API Error: ${message.errorCode} - ${message.description}`));
          }
          
        } catch (parseError) {
          console.error('Error parsing account info message:', parseError);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error during account fetch:', error);
        reject(new Error('Failed to connect to cTrader API'));
      };
      
      ws.onclose = (event) => {
        if (event.code !== 1000) {
          reject(new Error(`WebSocket closed unexpectedly: ${event.reason || 'Unknown error'}`));
        }
      };
      
    } catch (error) {
      reject(new Error(`Account info fetch failed: ${error.message}`));
    }
  });
}