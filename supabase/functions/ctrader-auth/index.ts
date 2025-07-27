import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Expected request shape
interface AuthRequest {
  tradingAccountId: string;
}

serve(async (req) => {
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tradingAccountId }: AuthRequest = await req.json();
    console.log(`Starting cTrader OAuth for tradingAccountId: ${tradingAccountId}`);

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Extract and verify user token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("User auth failed:", userError?.message || "No user found");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load cTrader credentials
    const CTRADER_CLIENT_ID = Deno.env.get("CTRADER_CLIENT_ID");
    const CTRADER_CLIENT_SECRET = Deno.env.get("CTRADER_CLIENT_SECRET");
    const REDIRECT_URI = Deno.env.get("CTRADER_REDIRECT_URI") || "https://dynibyqrcbxneiwjyahn.supabase.co/functions/v1/ctrader-callback";

    if (!CTRADER_CLIENT_ID || !CTRADER_CLIENT_SECRET) {
      console.error("Missing cTrader credentials", {
        CTRADER_CLIENT_ID: !!CTRADER_CLIENT_ID,
        CTRADER_CLIENT_SECRET: !!CTRADER_CLIENT_SECRET,
      });
      return new Response(JSON.stringify({
        error: "cTrader integration not configured. Please add CTRADER_CLIENT_ID and CTRADER_CLIENT_SECRET to Supabase secrets.",
        missingCredentials: {
          CTRADER_CLIENT_ID: !CTRADER_CLIENT_ID,
          CTRADER_CLIENT_SECRET: !CTRADER_CLIENT_SECRET,
        },
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clear expired auth states
    await supabase.from("ctrader_auth_states")
      .delete()
      .lt("expires_at", new Date().toISOString());

    // Generate secure OAuth state
    const state = crypto.randomUUID();

    // Store auth state
    const { error: insertError } = await supabase.from("ctrader_auth_states").insert({
      state,
      user_id: user.id,
      trading_account_id: tradingAccountId,
      account_number: "", // Will be filled in the callback
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour expiry
    });

    if (insertError) {
      console.error("Failed to insert auth state:", insertError.message);
      throw new Error("Failed to create auth session");
    }

    // Construct OAuth URL
    const authUrl = new URL("https://connect.spotware.com/apps/auth");
    authUrl.searchParams.set("client_id", CTRADER_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("scope", "accounts");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", state);

    console.log("OAuth URL generated:", authUrl.toString());

    return new Response(JSON.stringify({ authUrl: authUrl.toString(), state }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("OAuth flow error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});