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

interface UpgradeSuccessEmailProps {
  userDisplayName?: string;
  userEmail: string;
  planName: string;
  planPrice: string;
  dashboardUrl: string;
  billingDate?: string;
}

export const UpgradeSuccessEmail = ({
  userDisplayName = 'Trader',
  userEmail,
  planName,
  planPrice,
  dashboardUrl,
  billingDate,
}: UpgradeSuccessEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to {planName} - Your upgrade is complete! 🎉</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <div style={logoContainer}>
            <div style={logoIcon}>👑</div>
            <Text style={logoText}>The Trade Zero</Text>
          </div>
        </Section>

        {/* Content */}
        <Section style={content}>
          <Heading style={h1}>🎉 Welcome to {planName}!</Heading>
          
          <Text style={paragraph}>
            Hi {userDisplayName},
          </Text>

          <Text style={paragraph}>
            Congratulations! Your upgrade to <strong>{planName}</strong> has been processed successfully. You now have access to all premium features to take your trading to the next level.
          </Text>

          {/* Plan Details */}
          <Section style={planDetails}>
            <Text style={planDetailsTitle}>📋 Your Plan Details</Text>
            <Text style={planDetail}><strong>Plan:</strong> {planName}</Text>
            <Text style={planDetail}><strong>Price:</strong> {planPrice}</Text>
            {billingDate && <Text style={planDetail}><strong>Next Billing:</strong> {billingDate}</Text>}
          </Section>

          {/* Premium Features */}
          <Section style={featuresSection}>
            <Text style={featuresTitle}>🚀 Your Premium Features</Text>
            <ul style={featuresList}>
              <li style={featureItem}>📊 Unlimited trade tracking and analytics</li>
              <li style={featureItem}>📈 Advanced performance metrics and insights</li>
              <li style={featureItem}>🎯 Custom strategy backtesting</li>
              <li style={featureItem}>📱 Priority customer support</li>
              <li style={featureItem}>🔄 Advanced export capabilities</li>
              <li style={featureItem}>📊 Custom dashboard views</li>
              <li style={featureItem}>🤖 AI-powered trade analysis</li>
            </ul>
          </Section>

          {/* CTA Button */}
          <Section style={buttonContainer}>
            <Button style={button} href={dashboardUrl}>
              Explore Premium Features
            </Button>
          </Section>

          <Hr style={hr} />

          {/* Support Section */}
          <Text style={paragraph}>
            Need help getting the most out of your premium features? Our support team is here to help! Reach out to us at{' '}
            <Link href="mailto:support@thetradezero.com" style={link}>
              support@thetradezero.com
            </Link>
          </Text>

          <Text style={paragraph}>
            Thank you for choosing The Trade Zero Premium. We're excited to see your trading performance soar!
          </Text>

          <Text style={paragraph}>
            Happy trading,<br />
            <strong>The Trade Zero Team</strong>
          </Text>
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            This email was sent to {userEmail}. You can manage your subscription in your account settings.
          </Text>
          <Text style={footerText}>
            © 2024 The Trade Zero. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default UpgradeSuccessEmail;

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
  color: '#059669',
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

const planDetails = {
  backgroundColor: '#f0f9ff',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #bae6fd',
  margin: '24px 0',
};

const planDetailsTitle = {
  color: '#0369a1',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const planDetail = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '8px 0',
};

const featuresSection = {
  margin: '24px 0',
};

const featuresTitle = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const featuresList = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 16px',
  paddingLeft: '20px',
};

const featureItem = {
  margin: '8px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#059669',
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
  color: '#059669',
  textDecoration: 'underline',
};

const hr = {
  borderColor: '#e6e8eb',
  margin: '24px 0',
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