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
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      throw new Error('Missing authorization code or state');
    }

    console.log(`Processing cTrader callback with state: ${state}`);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify state and get auth info
    const { data: authState, error: stateError } = await supabaseClient
      .from('ctrader_auth_states')
      .select('*')
      .eq('state', state)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (stateError || !authState) {
      throw new Error('Invalid or expired state');
    }

    // Exchange code for access token
    const CTRADER_CLIENT_ID = Deno.env.get('CTRADER_CLIENT_ID');
    const CTRADER_CLIENT_SECRET = Deno.env.get('CTRADER_CLIENT_SECRET');
    const REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ctrader-callback`;

    const tokenResponse = await fetch('https://openapi.ctrader.com/apps/token', {
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

    // Clean up auth state
    await supabaseClient
      .from('ctrader_auth_states')
      .delete()
      .eq('state', state);

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
    // In a real implementation, you would make API calls to cTrader
    // to get account information. For now, we'll return a placeholder.
    // The actual implementation would involve WebSocket connections
    // and Protocol Buffer messages to cTrader's Open API.
    
    console.log('Fetching account info from cTrader API...');
    
    // Placeholder implementation - in reality you'd:
    // 1. Connect to cTrader WebSocket API
    // 2. Send ProtoOAApplicationAuthReq
    // 3. Send ProtoOAAccountListReq to get available accounts
    // 4. Return the first/selected account details
    
    return {
      accountNumber: `CT${Math.floor(Math.random() * 1000000)}`, // Placeholder
      accountName: 'Live Account',
      currency: 'USD',
      balance: 0
    };
  } catch (error) {
    console.error('Error fetching account info:', error);
    return {
      accountNumber: `CT${Date.now()}`, // Fallback
      accountName: 'Connected Account',
      currency: 'USD',
      balance: 0
    };
  }
}