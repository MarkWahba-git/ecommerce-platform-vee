import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface ContactFormConfirmationEmailProps {
  firstName: string;
  subject: string;
  messagePreview?: string;
  responseTimeDays?: number;
}

export function ContactFormConfirmationEmail({
  firstName = 'Kunde',
  subject = 'Allgemeine Anfrage',
  messagePreview,
  responseTimeDays = 2,
}: ContactFormConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Danke für deine Nachricht – wir melden uns bald!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Danke für deine Nachricht!</Heading>
          <Text style={text}>Hallo {firstName},</Text>
          <Text style={text}>
            wir haben deine Nachricht erhalten und werden uns innerhalb von{' '}
            <strong>{responseTimeDays} Werktagen</strong> bei dir melden.
          </Text>

          <Hr style={hr} />

          <Section>
            <Heading as="h2" style={subheading}>
              Deine Anfrage
            </Heading>
            <Text style={text}>
              <strong>Betreff:</strong> {subject}
            </Text>
            {messagePreview && (
              <Section style={messageBox}>
                <Text style={{ ...text, margin: 0, fontStyle: 'italic' }}>{messagePreview}</Text>
              </Section>
            )}
          </Section>

          <Hr style={hr} />

          <Text style={text}>
            In der Zwischenzeit kannst du uns auch direkt per E-Mail erreichen:{' '}
            <Link href="mailto:hallo@vee-handmade.de" style={link}>
              hallo@vee-handmade.de
            </Link>
          </Text>

          <Hr style={hr} />
          <Text style={footer}>Vee Handmade — Handgemacht mit Liebe</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' };
const container = { margin: '0 auto', padding: '40px 20px', maxWidth: '560px' };
const heading = { fontSize: '24px', color: '#1a1a1a' };
const subheading = { fontSize: '18px', color: '#1a1a1a' };
const text = { fontSize: '14px', color: '#4a4a4a', lineHeight: '24px' };
const hr = { borderColor: '#e6ebf1', margin: '20px 0' };
const footer = { fontSize: '12px', color: '#8898aa', textAlign: 'center' as const };
const messageBox = {
  backgroundColor: '#f0f4f8',
  borderLeft: '4px solid #e6ebf1',
  padding: '12px 16px',
  margin: '8px 0',
  borderRadius: '0 4px 4px 0',
};
const link = { color: '#1a1a1a' };

export default ContactFormConfirmationEmail;
