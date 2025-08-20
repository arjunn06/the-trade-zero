import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  token: string;
  inviterName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, token, inviterName }: InvitationRequest = await req.json();

    if (!email || !token) {
      return new Response(
        JSON.stringify({ error: "Email and token are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const inviteUrl = `https://thetradezero.com/invite/${token}`;

    const emailResponse = await resend.emails.send({
      from: "TradeZero <noreply@thetradezero.com>",
      to: [email],
      subject: "You're invited to TradeZero Beta!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>TradeZero Beta Invitation</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 40px 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
            .content { padding: 40px 30px; }
            .invite-box { background-color: #f1f5f9; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
            .btn { display: inline-block; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background-color: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>TradeZero</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Beta Trading Platform</p>
            </div>
            
            <div class="content">
              <h2 style="color: #1e293b; margin-bottom: 20px;">You're Invited to Join TradeZero Beta!</h2>
              
              <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
                Hello! ${inviterName} has invited you to join the exclusive beta of TradeZero - our advanced trading journal and analytics platform.
              </p>
              
              <div class="invite-box">
                <h3 style="color: #1e293b; margin-bottom: 15px;">🎉 Welcome to the Future of Trading</h3>
                <p style="color: #64748b; margin-bottom: 20px;">
                  TradeZero helps professional traders track, analyze, and optimize their trading performance with advanced analytics and AI-powered insights.
                </p>
                <p style="color: #475569; font-weight: 600; margin-bottom: 20px;">
                  Your invitation email: <strong>${email}</strong>
                </p>
                <a href="${inviteUrl}" class="btn">Accept Invitation & Join Beta</a>
              </div>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="color: #92400e; margin: 0; font-weight: 600;">⏰ This invitation expires in 7 days</p>
                <p style="color: #d97706; margin: 10px 0 0 0; font-size: 14px;">Don't wait - secure your spot in our exclusive beta program!</p>
              </div>
              
              <h3 style="color: #1e293b; margin-top: 30px;">What you'll get:</h3>
              <ul style="color: #475569; line-height: 1.8;">
                <li>📊 Advanced trade journaling and analytics</li>
                <li>🤖 AI-powered trading insights</li>
                <li>📈 Real-time performance tracking</li>
                <li>🎯 Risk management tools</li>
                <li>👥 Early access to new features</li>
              </ul>
              
              <p style="color: #475569; line-height: 1.6; margin-top: 30px;">
                If you have any questions, feel free to reach out to our team. We're excited to have you on board!
              </p>
            </div>
            
            <div class="footer">
              <p>This invitation was sent to ${email}</p>
              <p style="margin: 10px 0;">If you didn't expect this invitation, you can safely ignore this email.</p>
              <p style="margin: 0;">© 2024 TradeZero. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
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