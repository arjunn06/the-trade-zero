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

interface GeneralNotificationEmailProps {
  userDisplayName?: string;
  userEmail: string;
  subject: string;
  heading: string;
  message: string;
  buttonText?: string;
  buttonUrl?: string;
  footerMessage?: string;
}

export const GeneralNotificationEmail = ({
  userDisplayName = 'Trader',
  userEmail,
  subject,
  heading,
  message,
  buttonText,
  buttonUrl,
  footerMessage,
}: GeneralNotificationEmailProps) => (
  <Html>
    <Head />
    <Preview>{subject}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <div style={logoContainer}>
            <div style={logoIcon}>📧</div>
            <Text style={logoText}>The Trade Zero</Text>
          </div>
        </Section>

        {/* Content */}
        <Section style={content}>
          <Heading style={h1}>{heading}</Heading>
          
          <Text style={paragraph}>
            Hi {userDisplayName},
          </Text>

          <Text style={paragraph}>
            {message}
          </Text>

          {/* CTA Button (if provided) */}
          {buttonText && buttonUrl && (
            <Section style={buttonContainer}>
              <Button style={button} href={buttonUrl}>
                {buttonText}
              </Button>
            </Section>
          )}

          <Hr style={hr} />

          {/* Footer Message */}
          {footerMessage && (
            <Text style={paragraph}>
              {footerMessage}
            </Text>
          )}

          <Text style={paragraph}>
            If you have any questions, feel free to contact our support team at{' '}
            <Link href="mailto:support@thetradezero.com" style={link}>
              support@thetradezero.com
            </Link>
          </Text>

          <Text style={paragraph}>
            Best regards,<br />
            <strong>The Trade Zero Team</strong>
          </Text>
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            This email was sent to {userEmail}.
          </Text>
          <Text style={footerText}>
            © 2024 The Trade Zero. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default GeneralNotificationEmail;

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
  color: '#1f2937',
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
};

const link = {
  color: '#3b82f6',
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