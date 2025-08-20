import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get the authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: "Auth header is not 'Bearer {token}'" }), 
      { status: 401, headers: corsHeaders }
    );
  }

  // Verify the JWT token
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Invalid token" }), 
      { status: 401, headers: corsHeaders }
    );
  }

  // Use the authenticated user's ID instead of query parameter
  const { data, error } = await supabase
    .from("trading_accounts")
    .select("id, name")
    .eq("user_id", user.id);

  if (error) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch accounts" }), 
      { status: 500, headers: corsHeaders }
    );
  }

  return new Response(
    JSON.stringify({ accounts: data || [] }), 
    { status: 200, headers: corsHeaders }
  );
});
