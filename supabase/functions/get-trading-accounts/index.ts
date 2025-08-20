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

  // Try JWT auth; else fallback to email lookup for Zoho GC
  let userId: string | null = null;

  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (!authError && user) {
      userId = user.id;
    }
  }

  if (!userId) {
    // Fallback: accept user_email from query string or JSON body
    const url = new URL(req.url);
    const emailFromQuery = url.searchParams.get('user_email');
    let email = emailFromQuery;
    if (!email && req.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await req.json();
        email = body?.user_email || body?.email;
      } catch (_) {
        // ignore
      }
    }
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing authentication: pass Authorization: Bearer <token> or include user_email in the request." }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Look up user_id by email in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();
    if (profileError || !profile?.user_id) {
      return new Response(
        JSON.stringify({ error: 'User not found for provided email' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    userId = profile.user_id;
  }

  // Use the authenticated or resolved user's ID - only fetch active accounts
  const { data, error } = await supabase
    .from("trading_accounts")
    .select("id, name")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch accounts" }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Provide all compatible shapes for Zoho mapping
  const account_numbered = (data || []).reduce((acc, account, index) => {
    acc[`account ${index + 1}`] = account.name;
    return acc;
  }, {} as Record<string, string>);

  const account_list = (data || []).reduce((acc, account, index) => {
    acc[`account_${index + 1}_name`] = account.name;
    return acc;
  }, {} as Record<string, string>);

  const account_array = (data || []).map((account) => ({ name: account.name }));

  const accountsResponse = {
    account: account_numbered,       // e.g. { "account 1": "Name" }
    account_list,                    // e.g. { account_1_name: "Name" }
    account_array                    // e.g. [ { name: "Name" } ]
  };

  return new Response(
    JSON.stringify(accountsResponse),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
