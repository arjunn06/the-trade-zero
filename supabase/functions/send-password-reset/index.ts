import React from 'npm:react@18.3.1';
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { PasswordResetEmail } from './_templates/password-reset-email.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    
    console.log('Received webhook payload for password reset email');
    
    // Verify webhook signature if hook secret is provided
    if (hookSecret) {
      const wh = new Webhook(hookSecret);
      try {
        wh.verify(payload, headers);
      } catch (error) {
        console.error('Webhook verification failed:', error);
        return new Response('Unauthorized', { 
          status: 401,
          headers: corsHeaders 
        });
      }
    }

    const webhookData = JSON.parse(payload);
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = webhookData;

    console.log('Processing password reset email for user:', user.email);

    // Extract user name from metadata if available
    const userName = user.user_metadata?.display_name || user.user_metadata?.full_name || null;

    // Render the React email template
    const html = await renderAsync(
      React.createElement(PasswordResetEmail, {
        supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
        token,
        token_hash,
        redirect_to: redirect_to || Deno.env.get('SITE_URL') || '',
        email_action_type,
        user_email: user.email,
        user_name: userName,
      })
    );

    console.log('Sending password reset email via Resend...');

    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: 'The Trade Zero Security <security@thetradezero.com>',
      to: [user.email],
      subject: 'Reset your Trade Zero password 🔒',
      html,
    });

    if (error) {
      console.error('Failed to send email:', error);
      throw error;
    }

    console.log('Password reset email sent successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password reset email sent successfully',
        email_id: data?.id 
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in send-password-reset function:', error);
    
    return new Response(
      JSON.stringify({
        error: {
          message: error.message || 'Failed to send password reset email',
          code: error.code || 'UNKNOWN_ERROR',
        },
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});