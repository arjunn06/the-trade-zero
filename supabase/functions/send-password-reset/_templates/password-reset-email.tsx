import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
  Section
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface PasswordResetEmailProps {
  userEmail: string;
  userDisplayName?: string;
  resetUrl: string;
  token: string;
}

export const PasswordResetEmail = ({
  userEmail,
  userDisplayName,
  resetUrl,
  token
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your TradeZero password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Password Reset</Heading>
          <Text style={subtitle}>TradeZero Account Security</Text>
        </Section>
        
        <Section style={content}>
          <Text style={greeting}>
            Hello {userDisplayName || 'Trader'}!
          </Text>
          
          <Text style={text}>
            We received a request to reset the password for your TradeZero account associated with {userEmail}.
          </Text>
          
          <Text style={text}>
            If you made this request, click the button below to reset your password. This link will expire in 1 hour for security reasons.
          </Text>
          
          <Section style={buttonContainer}>
            <Button href={resetUrl} style={button}>
              Reset Password
            </Button>
          </Section>
          
          <Text style={text}>
            Or copy and paste this link into your browser:
          </Text>
          <Text style={linkText}>
            {resetUrl}
          </Text>
          
          <Section style={codeSection}>
            <Text style={codeLabel}>Reset Code:</Text>
            <Text style={code}>{token}</Text>
          </Section>
          
          <Section style={securityNotice}>
            <Text style={securityTitle}>🔒 Security Notice</Text>
            <Text style={securityText}>
              • This password reset link will expire in 1 hour<br/>
              • If you didn't request this reset, please ignore this email<br/>
              • Your password will remain unchanged unless you click the link above<br/>
              • For security, never share this email or link with anyone
            </Text>
          </Section>
          
          <Text style={helpText}>
            <strong>Didn't request this?</strong><br/>
            If you didn't request a password reset, you can safely ignore this email. 
            Your account remains secure and no changes will be made.
          </Text>
        </Section>
        
        <Section style={footer}>
          <Text style={footerText}>
            Best regards,<br />
            The TradeZero Security Team
          </Text>
          <Text style={footerLink}>
            Visit us at <Link href="https://thetradezero.com" style={link}>thetradezero.com</Link>
          </Text>
          <Text style={footerSmall}>
            This email was sent to {userEmail}
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default PasswordResetEmail;

// Styles
const main = {
  backgroundColor: '#f8fafc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segue UI", Roboto, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const header = {
  backgroundColor: '#ffffff',
  borderRadius: '12px 12px 0 0',
  padding: '40px 30px 30px',
  textAlign: 'center' as const,
  background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
};

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 10px',
};

const subtitle = {
  color: 'rgba(255,255,255,0.9)',
  fontSize: '16px',
  margin: '0',
};

const content = {
  backgroundColor: '#ffffff',
  padding: '40px 30px',
  borderRadius: '0 0 12px 12px',
};

const greeting = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#1e293b',
  margin: '0 0 20px',
};

const text = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
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
  padding: '16px 32px',
  border: 'none',
};

const linkText = {
  color: '#3b82f6',
  fontSize: '14px',
  fontFamily: 'monospace',
  wordBreak: 'break-all' as const,
  backgroundColor: '#f1f5f9',
  padding: '12px',
  borderRadius: '6px',
  margin: '16px 0',
};

const codeSection = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const codeLabel = {
  color: '#64748b',
  fontSize: '14px',
  margin: '0 0 8px',
};

const code = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#1e293b',
  fontFamily: 'monospace',
  letterSpacing: '2px',
  margin: '0',
};

const securityNotice = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const securityTitle = {
  color: '#dc2626',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const securityText = {
  color: '#7f1d1d',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const helpText = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '32px 0 0',
  padding: '16px',
  backgroundColor: '#fef3c7',
  borderRadius: '6px',
  border: '1px solid #fbbf24',
};

const footer = {
  backgroundColor: '#f8fafc',
  padding: '30px',
  textAlign: 'center' as const,
  marginTop: '20px',
  borderRadius: '12px',
};

const footerText = {
  color: '#475569',
  fontSize: '16px',
  margin: '0 0 16px',
};

const footerLink = {
  color: '#64748b',
  fontSize: '14px',
  margin: '0 0 16px',
};

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
};

const footerSmall = {
  color: '#94a3b8',
  fontSize: '12px',
  margin: '0',
};