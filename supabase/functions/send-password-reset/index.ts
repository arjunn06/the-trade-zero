import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { renderAsync } from "@react-email/components";
import React from "react";
import { PasswordResetEmail } from "./_templates/password-reset-email.tsx";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  userEmail: string;
  userDisplayName?: string;
  resetUrl: string;
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userDisplayName, resetUrl, token }: PasswordResetRequest = await req.json();

    if (!userEmail || !resetUrl || !token) {
      return new Response(
        JSON.stringify({ error: "Email, reset URL, and token are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Render the React email template
    const emailHtml = await renderAsync(
      React.createElement(PasswordResetEmail, {
        userEmail,
        userDisplayName,
        resetUrl,
        token
      })
    );

    const emailResponse = await resend.emails.send({
      from: "TradeZero Security <security@thetradezero.com>",
      to: [userEmail],
      subject: "Reset your TradeZero password",
      html: emailHtml,
    });

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
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