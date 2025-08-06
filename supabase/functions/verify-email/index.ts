import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

serve(async (req) => {
  try {
    const { email } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email required' }), { status: 400 })
    }

    // Step 1: Find profile by email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .eq("email", email)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'No profile found' }), { status: 404 })
    }

    // Step 2: Get trading accounts for the user_id
    const { data: accounts, error: accountsError } = await supabase
      .from("trading_accounts")
      .select("id, name, type") // type = demo/live
      .eq("user_id", profile.user_id)

    if (accountsError) {
      return new Response(JSON.stringify({ error: 'Error fetching accounts' }), { status: 500 })
    }

    return new Response(JSON.stringify({
      success: true,
      user: {
        display_name: profile.display_name,
        user_id: profile.user_id
      },
      accounts
    }), { status: 200 })

  } catch (err) {
    console.error('Internal error:', err)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
})