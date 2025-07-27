import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing token");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error("Unauthorized");

    // Get latest tokens
    const { data: authRow, error: authError } = await supabase
      .from("ctrader_auth_states")
      .select("*")
      .eq("user_id", user.id)
      .order("expires_at", { ascending: false })
      .limit(1)
      .single();

    if (authError || !authRow?.access_token) throw new Error("Missing access token");

    // Call cTrader Open API (example: get account summary)
    const res = await fetch("https://api.spotware.com/connect/openapi/trading/accounts", {
      headers: {
        Authorization: `Bearer ${authRow.access_token}`,
      },
    });

    const accountInfo = await res.json();
    console.log("Account Info:", accountInfo);

    return new Response(JSON.stringify(accountInfo), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Sync error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});