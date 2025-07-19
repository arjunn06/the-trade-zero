import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface PasswordResetEmailProps {
  supabase_url: string;
  email_action_type: string;
  redirect_to: string;
  token_hash: string;
  token: string;
  user_email: string;
  user_name?: string;
}

export const PasswordResetEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
  user_email,
  user_name,
}: PasswordResetEmailProps) => {
  const resetUrl = `${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;
  const displayName = user_name || user_email?.split('@')[0] || 'Trader';

  return (
    <Html>
      <Head />
      <Preview>Reset your Trade Zero password</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <div style={logoContainer}>
              <div style={logoIcon}>🔒</div>
              <Text style={logoText}>The Trade Zero</Text>
            </div>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={h1}>Password Reset Request</Heading>
            
            <Text style={paragraph}>
              Hi {displayName},
            </Text>

            <Text style={paragraph}>
              We received a request to reset your password for your Trade Zero account. If you didn't make this request, you can safely ignore this email.
            </Text>

            <Text style={paragraph}>
              To reset your password, click the button below:
            </Text>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={resetUrl}>
                Reset Your Password
              </Button>
            </Section>

            <Text style={paragraph}>
              Or copy and paste this link in your browser:
            </Text>
            <Link href={resetUrl} style={link}>
              {resetUrl}
            </Link>

            <Hr style={hr} />

            {/* Security Notice */}
            <Section style={securityNotice}>
              <Text style={securityTitle}>🛡️ Security Notice</Text>
              <Text style={paragraph}>
                This password reset link will expire in 1 hour for your security. If you didn't request this reset, please check your account for any suspicious activity.
              </Text>
            </Section>

            <Hr style={hr} />

            <Text style={paragraph}>
              If you're having trouble accessing your account or need assistance, feel free to contact our support team at{' '}
              <Link href="mailto:support@thetradezero.com" style={link}>
                support@thetradezero.com
              </Link>
            </Text>

            <Text style={paragraph}>
              Best regards,<br />
              <strong>The Trade Zero Security Team</strong>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent to {user_email}. If you didn't request a password reset, please ignore this email.
            </Text>
            <Text style={footerText}>
              © 2024 The Trade Zero. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default PasswordResetEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen-Sans,Ubuntu,Cantarell,Helvetica Neue,sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
};

const header = {
  backgroundColor: '#ffffff',
  borderRadius: '8px 8px 0 0',
  padding: '24px',
  borderBottom: '1px solid #e6e8eb',
};

const logoContainer = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
};

const logoIcon = {
  fontSize: '24px',
};

const logoText = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '0',
};

const content = {
  backgroundColor: '#ffffff',
  padding: '32px',
  borderRadius: '0 0 8px 8px',
};

const h1 = {
  color: '#dc2626',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 24px',
  textAlign: 'center' as const,
};

const paragraph = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 16px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#dc2626',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  border: 'none',
  cursor: 'pointer',
};

const link = {
  color: '#dc2626',
  textDecoration: 'underline',
  fontSize: '14px',
  wordBreak: 'break-all' as const,
};

const hr = {
  borderColor: '#e6e8eb',
  margin: '24px 0',
};

const securityNotice = {
  backgroundColor: '#fef2f2',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #fecaca',
};

const securityTitle = {
  color: '#dc2626',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const footer = {
  backgroundColor: '#f8fafc',
  padding: '24px',
  borderRadius: '8px',
  marginTop: '24px',
};

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px',
  textAlign: 'center' as const,
};