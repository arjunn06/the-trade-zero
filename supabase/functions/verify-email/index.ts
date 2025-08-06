// supabase/functions/verify-email/index.ts

import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // Use service role for server-side function
)

serve(async (req) => {
  try {
    const body = await req.json()
    const email = body.email

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), { status: 400 })
    }

    const { data, error } = await supabase
      .from("profiles") // or whatever table holds your users
      .select("*")
      .eq("email", email)

    if (error) {
      console.error("DB Error:", error)
      return new Response(JSON.stringify({ error: "Error fetching accounts" }), { status: 500 })
    }

    if (!data || data.length === 0) {
      return new Response(JSON.stringify({ error: "No user found with this email" }), { status: 404 })
    }

    // Assuming user has multiple trading accounts in another table
    const { data: accounts, error: accError } = await supabase
      .from("accounts")
      .select("*")
      .eq("email", email)

    if (accError) {
      console.error("Accounts Error:", accError)
      return new Response(JSON.stringify({ error: "Error fetching accounts" }), { status: 500 })
    }

    return new Response(JSON.stringify({ accounts }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })

  } catch (err) {
    console.error("Unexpected Error:", err)
    return new Response(JSON.stringify({ error: "Unexpected error occurred" }), { status: 500 })
  }
})