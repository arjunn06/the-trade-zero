import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

serve(async (req) => {
  try {
    const body = await req.json()
    const email = body.email

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), { status: 400 })
    }

    const { data: users, error: userError } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)

    if (userError) {
      console.error("DB Error:", userError)
      return new Response(JSON.stringify({ error: "Error looking up user" }), { status: 500 })
    }

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ error: "No user found with this email" }), { status: 404 })
    }

    const user = users[0]

    // ✅ Now use user's ID to get their trading accounts
    const { data: accounts, error: accError } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id) // 👈 make sure this matches your schema

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