import {
  Body,
  Button,
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

interface NewsletterWelcomeEmailProps {
  firstName?: string;
  shopUrl?: string;
  unsubscribeUrl: string;
}

export function NewsletterWelcomeEmail({
  firstName,
  shopUrl = 'https://vee-handmade.de/shop',
  unsubscribeUrl = 'https://vee-handmade.de/newsletter/unsubscribe',
}: NewsletterWelcomeEmailProps) {
  const greeting = firstName ? `Hallo ${firstName},` : 'Hallo,';

  return (
    <Html>
      <Head />
      <Preview>Willkommen bei Vee – schön, dass du dabei bist!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Willkommen bei Vee!</Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            herzlich willkommen in unserer Community! Wir freuen uns sehr, dich als
            Newsletter-Abonnenten begrüßen zu dürfen.
          </Text>

          <Hr style={hr} />

          <Section>
            <Heading as="h2" style={subheading}>
              Was dich erwartet
            </Heading>
            <Text style={text}>
              Als Teil der Vee-Familie wirst du als Erstes von Neuigkeiten erfahren:
            </Text>
            <Text style={text}>• Neue handgemachte Kollektionen und limitierte Editionen</Text>
            <Text style={text}>• Exklusive Rabatte nur für Newsletter-Abonnenten</Text>
            <Text style={text}>• Einblicke hinter die Kulissen unserer Werkstatt</Text>
            <Text style={text}>• Inspirationen und DIY-Tipps</Text>
          </Section>

          <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
            <Button style={button} href={shopUrl}>
              Jetzt entdecken
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={text}>
            Wir versprechen, deinen Posteingang nicht zu überfüllen – nur die wirklich wichtigen
            Neuigkeiten landen bei dir.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Vee Handmade — Handgemacht mit Liebe
            <br />
            <Link href={unsubscribeUrl} style={unsubscribeLink}>
              Newsletter abbestellen
            </Link>
          </Text>
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
const button = {
  backgroundColor: '#1a1a1a',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '4px',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
};
const unsubscribeLink = { color: '#8898aa', fontSize: '12px' };

export default NewsletterWelcomeEmail;
