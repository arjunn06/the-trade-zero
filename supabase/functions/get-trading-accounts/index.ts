import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const url = new URL(req.url);
  const user_id = url.searchParams.get("user_id");

  if (!user_id) {
    return new Response(JSON.stringify({ error: "Missing user_id" }), { status: 400 });
  }

  const { data, error } = await supabase
    .from("trading_accounts")
    .select("id, name")
    .eq("user_id", user_id);

  if (error || !data) {
    return new Response(JSON.stringify({ accounts: [] }), { status: 200 });
  }

  return new Response(JSON.stringify({ accounts: data }), { status: 200 });
});
