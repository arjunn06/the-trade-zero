import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface WelcomeEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
  user_email: string
  user_name?: string
}

export const WelcomeEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
  user_email,
  user_name,
}: WelcomeEmailProps) => {
  const confirmUrl = `${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`
  const displayName = user_name || user_email?.split('@')[0] || 'Trader'

  return (
    <Html>
      <Head />
      <Preview>Welcome to The Trade Zero - Verify your account to get started!</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with logo */}
          <Section style={header}>
            <div style={logoContainer}>
              <div style={logoIcon}>📈</div>
              <Text style={logoText}>The Trade Zero</Text>
            </div>
          </Section>

          {/* Welcome Message */}
          <Section style={content}>
            <Heading style={h1}>Welcome to The Trade Zero, {displayName}! 🎉</Heading>
            
            <Text style={paragraph}>
              We're thrilled to have you join our community of serious traders! You're just one step away from accessing your professional trading journal.
            </Text>

            <Text style={paragraph}>
              To get started and secure your account, please verify your email address by clicking the button below:
            </Text>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={confirmUrl}>
                Verify Your Account
              </Button>
            </Section>

            <Text style={paragraph}>
              Or copy and paste this link in your browser:
            </Text>
            <Link href={confirmUrl} style={link}>
              {confirmUrl}
            </Link>

            <Hr style={hr} />

            {/* What's Next Section */}
            <Text style={sectionTitle}>What's next?</Text>
            <Text style={paragraph}>
              Once you verify your account, you'll be able to:
            </Text>
            
            <ul style={list}>
              <li style={listItem}>📊 Track unlimited trades with detailed analytics</li>
              <li style={listItem}>💡 Create custom trading strategies and rules</li>
              <li style={listItem}>📈 View your performance with our beautiful P&L calendar</li>
              <li style={listItem}>🔍 Use advanced confluence checklists</li>
              <li style={listItem}>📱 Access your journal from anywhere</li>
            </ul>

            <Hr style={hr} />

            {/* Support Section */}
            <Text style={paragraph}>
              Need help getting started? We're here for you! Feel free to reach out to our support team at{' '}
              <Link href="mailto:support@thetradezero.com" style={link}>
                support@thetradezero.com
              </Link>
            </Text>

            <Text style={paragraph}>
              Happy trading,<br />
              <strong>The Trade Zero Team</strong>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent to {user_email}. If you didn't create an account with The Trade Zero, you can safely ignore this email.
            </Text>
            <Text style={footerText}>
              © 2024 The Trade Zero. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

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