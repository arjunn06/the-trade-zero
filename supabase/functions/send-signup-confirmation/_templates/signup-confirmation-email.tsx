import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Button,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface SignupConfirmationEmailProps {
  userEmail: string;
  userDisplayName?: string;
  confirmationUrl: string;
  token: string;
}

export const SignupConfirmationEmail = ({
  userEmail,
  userDisplayName,
  confirmationUrl,
  token
}: SignupConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to TradeZero - Confirm your email address</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Welcome to TradeZero!</Heading>
          <Text style={subtitle}>Professional Trading Journal & Analytics Platform</Text>
        </Section>
        
        <Section style={content}>
          <Text style={greeting}>
            Hello {userDisplayName || 'Trader'}!
          </Text>
          
          <Text style={text}>
            Thank you for signing up for TradeZero. To get started with tracking and analyzing your trades, 
            please confirm your email address by clicking the button below.
          </Text>
          
          <Section style={buttonContainer}>
            <Button href={confirmationUrl} style={button}>
              Confirm Email Address
            </Button>
          </Section>
          
          <Text style={text}>
            Or copy and paste this link into your browser:
          </Text>
          <Text style={linkText}>
            {confirmationUrl}
          </Text>
          
          <Section style={codeSection}>
            <Text style={codeLabel}>Verification Code:</Text>
            <Text style={code}>{token}</Text>
          </Section>
          
          <Text style={text}>
            Once confirmed, you'll have access to:
          </Text>
          <ul style={featureList}>
            <li style={featureItem}>📊 Advanced trade journaling</li>
            <li style={featureItem}>📈 Performance analytics & insights</li>
            <li style={featureItem}>🎯 Risk management tools</li>
            <li style={featureItem}>📱 Mobile-friendly interface</li>
            <li style={featureItem}>🔄 Trade import from multiple platforms</li>
          </ul>
          
          <Text style={helpText}>
            If you didn't create an account with us, you can safely ignore this email.
          </Text>
        </Section>
        
        <Section style={footer}>
          <Text style={footerText}>
            Best regards,<br />
            The TradeZero Team
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

export default SignupConfirmationEmail;

// Styles
const main = {
  backgroundColor: '#f8fafc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
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
  backgroundColor: '#3b82f6',
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

const featureList = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '24px',
  paddingLeft: '20px',
  margin: '16px 0',
};

const featureItem = {
  margin: '8px 0',
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