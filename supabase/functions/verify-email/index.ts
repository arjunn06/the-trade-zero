// supabase/functions/fetch-accounts/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.3";

serve(async (req) => {
  try {
    const body = await req.json();
    const email = body.email;

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email in request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("email", email); // or change to .eq("user_id", ...) if needed

    if (error) {
      return new Response(JSON.stringify({ error: "Error fetching accounts", details: error }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ accounts: data }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Unexpected error", details: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
