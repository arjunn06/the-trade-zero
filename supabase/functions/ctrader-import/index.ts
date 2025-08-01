import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Load env variables
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const CREDENTIALS = {
  client_id: Deno.env.get('CTRADER_CLIENT_ID') ?? '',
  client_secret: Deno.env.get('CTRADER_CLIENT_SECRET') ?? '',
  redirect_uri: Deno.env.get('CTRADER_REDIRECT_URI') ?? '',
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const user_id = searchParams.get("user_id");

  if (!code || !user_id) {
    console.error("Missing code or user_id in query params");
    return new Response("Missing code or user_id", { status: 400, headers: corsHeaders });
  }

  console.log("⚡ Received OAuth callback", { code, user_id });

  // 1. Exchange code for tokens
  const tokenRes = await fetch("https://sandbox-api.spotware.com/connect/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      client_id: CREDENTIALS.client_id,
      client_secret: CREDENTIALS.client_secret,
      redirect_uri: CREDENTIALS.redirect_uri,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok) {
    console.error("❌ Failed to get tokens", tokenData);
    return new Response("Token exchange failed", { status: 500, headers: corsHeaders });
  }

  const { access_token, refresh_token } = tokenData;
  console.log("✅ Got tokens", { access_token });

  // 2. Fetch trading accounts linked to access_token
  const accountRes = await fetch("https://sandbox-api.spotware.com/connect/tradingaccounts", {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  const accountsData = await accountRes.json();

  if (!accountRes.ok) {
    console.error("❌ Failed to fetch trading accounts", accountsData);
    return new Response("Failed to fetch trading accounts", { status: 500, headers: corsHeaders });
  }

  const tradingAccount = accountsData[0]; // Just pick the first one for now

  if (!tradingAccount) {
    console.error("No trading accounts found");
    return new Response("No trading account found", { status: 404, headers: corsHeaders });
  }

  const { tradingAccountId, brokerName } = tradingAccount;

  // 3. Save to Supabase (UPSERT)
  const { error: connectionError } = await supabase
    .from("ctrader_connections")
    .upsert(
      {
        user_id,
        trading_account_id: tradingAccountId,
        access_token,
        refresh_token,
        broker: brokerName,
      },
      {
        onConflict: ["user_id", "trading_account_id"],
      }
    );

  if (connectionError) {
    console.error("❌ Failed to store connection", connectionError);
    return new Response("Failed to store connection", { status: 500, headers: corsHeaders });
  }

  console.log("✅ Stored connection successfully");

  // 4. Trigger sync via existing ctrader-sync function
  const syncRes = await supabase.functions.invoke('ctrader-sync', {
    body: { user_id, trading_account_id: tradingAccountId }
  });

  if (syncRes.error) {
    console.error("❌ Sync trigger failed", syncRes.error);
    return new Response("Sync trigger failed", { status: 500, headers: corsHeaders });
  }

  console.log("✅ Sync triggered");

  return new Response("Connected & syncing!", { status: 200, headers: corsHeaders });
})