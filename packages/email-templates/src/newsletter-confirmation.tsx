import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface NewsletterConfirmationEmailProps {
  confirmationUrl: string;
  firstName?: string;
}

export function NewsletterConfirmationEmail({
  confirmationUrl = 'https://vee-handmade.de/newsletter/confirm?token=example',
  firstName,
}: NewsletterConfirmationEmailProps) {
  const greeting = firstName ? `Hallo ${firstName},` : 'Hallo,';

  return (
    <Html>
      <Head />
      <Preview>Bitte bestätige deine Newsletter-Anmeldung bei Vee</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Fast geschafft!</Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            du hast dich für den Vee Newsletter angemeldet. Bitte bestätige deine E-Mail-Adresse,
            um die Anmeldung abzuschließen.
          </Text>

          <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
            <Button style={button} href={confirmationUrl}>
              E-Mail-Adresse bestätigen
            </Button>
          </Section>

          <Hr style={hr} />

          <Section>
            <Heading as="h2" style={subheading}>
              Was dich erwartet
            </Heading>
            <Text style={text}>Als Newsletter-Abonnent erhältst du:</Text>
            <Text style={text}>• Neuigkeiten zu handgemachten Produkten</Text>
            <Text style={text}>• Exklusive Angebote und Rabatte</Text>
            <Text style={text}>• Einblicke in unsere Werkstatt und neue Kollektionen</Text>
          </Section>

          <Hr style={hr} />
          <Text style={noteText}>
            Falls du dich nicht angemeldet hast, kannst du diese E-Mail einfach ignorieren.
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
const noteText = { fontSize: '12px', color: '#8898aa', lineHeight: '20px' };
const hr = { borderColor: '#e6ebf1', margin: '20px 0' };
const footer = { fontSize: '12px', color: '#8898aa', textAlign: 'center' as const };
const button = {
  backgroundColor: '#1a1a1a',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '4px',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
};

export default NewsletterConfirmationEmail;
