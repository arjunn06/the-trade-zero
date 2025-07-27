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
    const state = url.searchParams.get("state");
    
    console.log("Callback received:", { 
      code: code ? "present" : "missing", 
      state: state ? "present" : "missing",
      fullUrl: req.url 
    });

    if (!code) {
      console.error("Missing authorization code from cTrader");
      return new Response("Authorization failed - missing code", { status: 400 });
    }

    if (!state) {
      console.error("Missing state parameter from cTrader");
      return new Response("Authorization failed - missing state", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find state row
    const { data: stateRow, error: stateError } = await supabase
      .from("ctrader_auth_states")
      .select("*")
      .eq("state", state)
      .single();

    if (stateError || !stateRow) {
      return new Response("Invalid or expired OAuth state", { status: 400 });
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

    // Update tokens in Supabase
    await supabase
      .from("ctrader_auth_states")
      .update({
        access_token,
        refresh_token,
        token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      })
      .eq("state", state);

    // Trigger import function
    await fetch("https://dynibyqrcbxneiwjyahn.supabase.co/functions/v1/ctrader-import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: stateRow.user_id,
        account_id: stateRow.account_id,
        access_token,
        refresh_token,
      }),
    });

    // Return response after triggering import
    return new Response("cTrader linked successfully. You can close this tab.", {
      headers: { "Content-Type": "text/plain", ...corsHeaders },
    });

  } catch (err) {
    console.error("OAuth callback error:", err.message);
    return new Response("Internal error", { status: 500 });
  }
});