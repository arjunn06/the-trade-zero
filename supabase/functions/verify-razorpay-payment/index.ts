import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-RAZORPAY] ${step}${detailsStr}`);
};

interface VerificationRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  plan: string;
}

// Function to verify Razorpay signature
function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  const crypto = globalThis.crypto;
  const body = orderId + "|" + paymentId;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(body);
  
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  ).then(key => {
    return crypto.subtle.sign("HMAC", key, messageData);
  }).then(signatureBuffer => {
    const signatureArray = new Uint8Array(signatureBuffer);
    const signatureHex = Array.from(signatureArray)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
    
    return signatureHex === signature;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Verification function started");

    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!razorpayKeySecret) {
      throw new Error("Razorpay secret key is not configured");
    }

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan }: VerificationRequest = await req.json();
    logStep("Verification request received", { orderId: razorpay_order_id, paymentId: razorpay_payment_id, plan });

    // Verify signature
    const isValidSignature = await verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      razorpayKeySecret
    );

    if (!isValidSignature) {
      logStep("Invalid signature");
      throw new Error("Invalid payment signature");
    }

    logStep("Signature verified successfully");

    // Update subscriber status
    const subscriptionEnd = new Date();
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1); // Add 1 month

    await supabaseClient.from("subscribers").upsert({
      email: user.email,
      user_id: user.id,
      subscription_tier: plan,
      subscribed: true,
      subscription_end: subscriptionEnd.toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    logStep("Subscription updated successfully", { plan, subscriptionEnd });

    return new Response(JSON.stringify({
      success: true,
      message: "Payment verified and subscription activated",
      plan: plan,
      subscription_end: subscriptionEnd.toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-razorpay-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});