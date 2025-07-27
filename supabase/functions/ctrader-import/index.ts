import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

// Load env variables
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CREDENTIALS = {
  client_id: process.env.CTRADER_CLIENT_ID!,
  client_secret: process.env.CTRADER_CLIENT_SECRET!,
  redirect_uri: process.env.CTRADER_REDIRECT_URI!,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const user_id = searchParams.get("user_id");

  if (!code || !user_id) {
    console.error("Missing code or user_id in query params");
    return new Response("Missing code or user_id", { status: 400 });
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
    return new Response("Token exchange failed", { status: 500 });
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
    return new Response("Failed to fetch trading accounts", { status: 500 });
  }

  const tradingAccount = accountsData[0]; // Just pick the first one for now

  if (!tradingAccount) {
    console.error("No trading accounts found");
    return new Response("No trading account found", { status: 404 });
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
    return new Response("Failed to store connection", { status: 500 });
  }

  console.log("✅ Stored connection successfully");

  // 4. Trigger import
  const importRes = await fetch(`${process.env.BASE_URL}/api/sync/ctrader`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id, trading_account_id: tradingAccountId }),
  });

  if (!importRes.ok) {
    const errorText = await importRes.text();
    console.error("❌ Import trigger failed", errorText);
    return new Response("Import trigger failed", { status: 500 });
  }

  console.log("✅ Import triggered");

  return new Response("Connected & syncing!", { status: 200 });
}