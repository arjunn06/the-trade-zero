import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuthRequest {
  tradingAccountId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tradingAccountId }: AuthRequest = await req.json();
    
    console.log(`Initiating cTrader OAuth for trading account: ${tradingAccountId}`);

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

    // cTrader OAuth configuration
    const CTRADER_CLIENT_ID = Deno.env.get('CTRADER_CLIENT_ID');
    const CTRADER_CLIENT_SECRET = Deno.env.get('CTRADER_CLIENT_SECRET');
    const REDIRECT_URI = 'https://dynibyqrcbxneiwjyahn.supabase.co/functions/v1/ctrader-callback';

    if (!CTRADER_CLIENT_ID || !CTRADER_CLIENT_SECRET) {
      console.error('Missing cTrader credentials:', { 
        hasClientId: !!CTRADER_CLIENT_ID, 
        hasClientSecret: !!CTRADER_CLIENT_SECRET 
      });
      return new Response(
        JSON.stringify({ 
          error: 'cTrader integration not configured. Please add CTRADER_CLIENT_ID and CTRADER_CLIENT_SECRET to your Supabase secrets.',
          missingCredentials: !CTRADER_CLIENT_ID || !CTRADER_CLIENT_SECRET
        }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Generate state parameter for security
    const state = crypto.randomUUID();
    
    // Store state and account info temporarily
    await supabaseClient
      .from('ctrader_auth_states')
      .insert({
        state,
        user_id: user.id,
        account_number: '', // Will be filled during callback when user selects account
        trading_account_id: tradingAccountId,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      });

    // Build OAuth URL
    const authUrl = new URL('https://connect.spotware.com/apps/auth');
    authUrl.searchParams.set('client_id', CTRADER_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', 'accounts');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_type', 'code');

    console.log('Generated OAuth URL:', authUrl.toString());
    console.log('Redirect URI being used:', REDIRECT_URI);

    return new Response(
      JSON.stringify({ 
        authUrl: authUrl.toString(),
        state 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('cTrader auth error:', error);
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