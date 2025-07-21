// supabase/functions/ctrader-callback/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("No code found in URL", { status: 400 });
  }

  // Prepare token request
  const tokenResponse = await fetch("https://api.spotware.com/connect/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: "16201_rnkQHrJBaM07MDEzuuCrTBsvPEQm2iUzPX0uPuKk0ZmQ4zeJax", // replace this
      client_secret: "zx3joNxbUm5h8bOVGLxvxKg6yS2FXd7OQnITpzdu7kNmBk1gew", // replace this
      redirect_uri: "https://thetradezero.com/auth/ctrader/callback", // your callback URL
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    console.error("Token exchange failed:", tokenData);
    return new Response("Token exchange failed", { status: 500 });
  }

  // Save tokenData.access_token, refresh_token, etc. if needed

  // Redirect user back to dashboard or show success
  return Response.redirect("https://thetradezero.com/dashboard", 302);
});