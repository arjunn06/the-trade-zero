import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { renderAsync } from "@react-email/components";
import React from "react";
import { SignupConfirmationEmail } from "./_templates/signup-confirmation-email.tsx";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SignupConfirmationRequest {
  userEmail: string;
  userDisplayName?: string;
  confirmationUrl: string;
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userDisplayName, confirmationUrl, token }: SignupConfirmationRequest = await req.json();

    if (!userEmail || !confirmationUrl || !token) {
      return new Response(
        JSON.stringify({ error: "Email, confirmation URL, and token are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Render the React email template
    const emailHtml = await renderAsync(
      React.createElement(SignupConfirmationEmail, {
        userEmail,
        userDisplayName,
        confirmationUrl,
        token
      })
    );

    const emailResponse = await resend.emails.send({
      from: "TradeZero <noreply@thetradezero.com>",
      to: [userEmail],
      subject: "Welcome to TradeZero - Confirm your email",
      html: emailHtml,
    });

    console.log("Signup confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-signup-confirmation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);