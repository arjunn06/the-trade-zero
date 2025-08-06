// supabase/functions/fetch-accounts/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.3";

serve(async (req) => {
  // Validate Authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({
      code: 401,
      message: "Auth header is not 'Bearer {token}'"
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const token = authHeader.split("Bearer ")[1];

  // Create Supabase client with user's token
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      global: {
        headers: { Authorization: `Bearer ${session.access_token}` }
      }
    }
  );

  // Get user info from token
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return new Response(JSON.stringify({
      code: 401,
      message: "Invalid or expired token"
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Now fetch user-specific data from Supabase
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id);

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
});
