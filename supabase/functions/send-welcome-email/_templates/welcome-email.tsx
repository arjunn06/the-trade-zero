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

interface WelcomeEmailProps {
  userEmail: string;
  userDisplayName?: string;
}

export const WelcomeEmail = ({
  userEmail,
  userDisplayName
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to TradeZero - Your Trading Journey Begins!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Welcome to TradeZero!</Heading>
          <Text style={subtitle}>Your Professional Trading Journey Starts Here</Text>
        </Section>
        
        <Section style={content}>
          <Text style={greeting}>
            Hello {userDisplayName || 'Trader'}!
          </Text>
          
          <Text style={text}>
            🎉 Congratulations! Your TradeZero account has been successfully activated. 
            You're now part of an exclusive community of professional traders who are serious 
            about tracking, analyzing, and optimizing their trading performance.
          </Text>
          
          <Section style={featureHighlight}>
            <Text style={featureTitle}>🚀 Here's what you can do now:</Text>
            <ul style={featureList}>
              <li style={featureItem}>📊 <strong>Track Every Trade:</strong> Log your trades with detailed analytics</li>
              <li style={featureItem}>📈 <strong>Performance Analytics:</strong> Get insights into your trading patterns</li>
              <li style={featureItem}>🎯 <strong>Risk Management:</strong> Monitor your risk and drawdown in real-time</li>
              <li style={featureItem}>📱 <strong>Mobile Access:</strong> Trade tracking on-the-go</li>
              <li style={featureItem}>🔄 <strong>Import Trades:</strong> Connect with your broker for automatic imports</li>
              <li style={featureItem}>📝 <strong>Trading Journal:</strong> Document your trading thoughts and strategies</li>
            </ul>
          </Section>
          
          <Section style={buttonContainer}>
            <Button href="https://thetradezero.com/dashboard" style={button}>
              Start Trading Journey
            </Button>
          </Section>
          
          <Section style={tipsSection}>
            <Text style={tipsTitle}>💡 Quick Start Tips:</Text>
            <ol style={tipsList}>
              <li style={tipItem}>Set up your first trading account in the Accounts section</li>
              <li style={tipItem}>Add your first trade to see how our analytics work</li>
              <li style={tipItem}>Explore the Dashboard to understand your key metrics</li>
              <li style={tipItem}>Set up your trading goals and risk parameters</li>
            </ol>
          </Section>
          
          <Text style={supportText}>
            <strong>Need help getting started?</strong><br/>
            Check out our <Link href="https://thetradezero.com/docs" style={link}>documentation</Link> or 
            reach out to our support team at <Link href="mailto:support@thetradezero.com" style={link}>support@thetradezero.com</Link>
          </Text>
          
          <Section style={statsSection}>
            <Text style={statsTitle}>📊 Join the Community</Text>
            <Text style={statsText}>
              You're now part of a growing community of professional traders who have already:
            </Text>
            <ul style={statsList}>
              <li style={statsItem}>• Tracked over 50,000+ trades</li>
              <li style={statsItem}>• Improved their win rate by an average of 23%</li>
              <li style={statsItem}>• Reduced their maximum drawdown by 31%</li>
            </ul>
          </Section>
        </Section>
        
        <Section style={footer}>
          <Text style={footerText}>
            Happy Trading!<br />
            The TradeZero Team
          </Text>
          <Text style={footerLink}>
            Visit us at <Link href="https://thetradezero.com" style={link}>thetradezero.com</Link>
          </Text>
          <Text style={footerSmall}>
            This email was sent to {userEmail}<br/>
            You're receiving this because you just created a TradeZero account.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default WelcomeEmail

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen-Sans,Ubuntu,Cantarell,Helvetica Neue,sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
}

const header = {
  backgroundColor: '#ffffff',
  borderRadius: '8px 8px 0 0',
  padding: '24px',
  borderBottom: '1px solid #e6e8eb',
}

const logoContainer = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
}

const logoIcon = {
  fontSize: '24px',
}

const logoText = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '0',
}

const content = {
  backgroundColor: '#ffffff',
  padding: '32px',
  borderRadius: '0 0 8px 8px',
}

const h1 = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}

const paragraph = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 16px',
}

const sectionTitle = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  margin: '24px 0 16px',
}

const list = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 16px',
  paddingLeft: '20px',
}

const listItem = {
  margin: '8px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#3b82f6',
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
}

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
  fontSize: '14px',
  wordBreak: 'break-all' as const,
}

const hr = {
  borderColor: '#e6e8eb',
  margin: '24px 0',
}

const footer = {
  backgroundColor: '#f8fafc',
  padding: '24px',
  borderRadius: '8px',
  marginTop: '24px',
}

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}

const footerLink = {
  color: '#64748b',
  fontSize: '14px',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}

const footerSmall = {
  color: '#94a3b8',
  fontSize: '12px',
  margin: '0',
  textAlign: 'center' as const,
}

const subtitle = {
  color: 'rgba(255,255,255,0.9)',
  fontSize: '16px',
  margin: '0',
  textAlign: 'center' as const,
}

const greeting = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#1e293b',
  margin: '0 0 20px',
}

const text = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
}

const featureHighlight = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const featureTitle = {
  color: '#1e293b',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px',
}

const featureList = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '24px',
  paddingLeft: '20px',
  margin: '16px 0',
}

const featureItem = {
  margin: '8px 0',
}

const tipsSection = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const tipsTitle = {
  color: '#92400e',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px',
}

const tipsList = {
  color: '#451a03',
  fontSize: '14px',
  lineHeight: '20px',
  paddingLeft: '20px',
  margin: '12px 0',
}

const tipItem = {
  margin: '8px 0',
}

const supportText = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '32px 0',
  padding: '16px',
  backgroundColor: '#f1f5f9',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
}

const statsSection = {
  backgroundColor: '#ecfdf5',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const statsTitle = {
  color: '#065f46',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px',
}

const statsText = {
  color: '#047857',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 12px',
}

const statsList = {
  color: '#047857',
  fontSize: '14px',
  lineHeight: '20px',
  paddingLeft: '20px',
  margin: '12px 0 0',
}

const statsItem = {
  margin: '4px 0',
}