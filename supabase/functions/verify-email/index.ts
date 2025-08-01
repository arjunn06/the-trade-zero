import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const { email } = await req.json();

  if (!email) {
    return new Response(JSON.stringify({ valid: false }), { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ valid: false }), { status: 404 });
  }

  return new Response(JSON.stringify({ valid: true, user_id: data.id }), { status: 200 });
});
