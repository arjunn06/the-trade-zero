import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    let state = url.searchParams.get("state");

    console.log("Callback received:", { 
      code: code ? "present" : "missing", 
      state: state ? "present" : "missing",
      fullUrl: req.url,
      allParams: Object.fromEntries(url.searchParams.entries())
    });

    if (!code) {
      console.error("Missing authorization code");
      return new Response("Missing authorization code", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find state row - if state is missing, try to find the most recent pending auth
    let stateRow;
    if (state) {
      const { data, error } = await supabase
        .from("ctrader_auth_states")
        .select("*")
        .eq("state", state)
        .single();
      
      if (error || !data) {
        console.error("Invalid or expired OAuth state:", error?.message);
        return new Response("Invalid or expired OAuth state", { status: 400 });
      }
      stateRow = data;
    } else {
      // Fallback: find most recent auth state without tokens (within last hour)
      console.log("No state parameter, attempting to find recent auth session");
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("ctrader_auth_states")
        .select("*")
        .gte("created_at", oneHourAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
        
      if (error || !data) {
        console.error("No recent auth session found:", error?.message);
        return new Response("No valid OAuth session found. Please try connecting again.", { status: 400 });
      }
      stateRow = data;
      state = stateRow.state; // Use the found state for token exchange
    }

    // Exchange code for access/refresh token
    const tokenRes = await fetch("https://connect.spotware.com/apps/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: Deno.env.get("CTRADER_CLIENT_ID")!,
        client_secret: Deno.env.get("CTRADER_CLIENT_SECRET")!,
        redirect_uri: Deno.env.get("CTRADER_REDIRECT_URI")!,
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      return new Response("Token exchange failed", { status: 400 });
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Store connection in the ctrader_connections table
    const { error: connectionError } = await supabase
      .from("ctrader_connections")
      .insert({
        user_id: stateRow.user_id,
        trading_account_id: stateRow.trading_account_id,
        account_number: stateRow.account_number,
        access_token,
        refresh_token,
        expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      });

    if (connectionError) {
      console.error("Failed to store connection:", connectionError.message);
      return new Response("Failed to store connection data", { status: 500 });
    }

    // Clean up the auth state record
    await supabase
      .from("ctrader_auth_states")
      .delete()
      .eq("state", state);

    console.log("Successfully stored cTrader connection for trading account:", stateRow.trading_account_id);

    // Optional redirect to frontend
    return new Response("cTrader linked successfully. You can close this tab.", {
      headers: { "Content-Type": "text/plain" },
    });

  } catch (err) {
    console.error("OAuth callback error:", err.message);
    return new Response("Internal error", { status: 500 });
  }
});