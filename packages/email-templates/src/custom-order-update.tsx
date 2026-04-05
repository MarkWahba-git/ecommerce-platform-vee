import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export type CustomOrderStatus =
  | 'REVIEWING'
  | 'QUOTED'
  | 'PROOF_SENT'
  | 'IN_PRODUCTION'
  | 'COMPLETED';

interface CustomOrderUpdateEmailProps {
  customerName: string;
  requestId: string;
  status: CustomOrderStatus;
  accountUrl: string;
  priceQuote?: string;
  proofImageUrl?: string;
  proofNotes?: string;
  message?: string;
}

const STATUS_CONFIG: Record<
  CustomOrderStatus,
  { subject: string; headline: string; body: string }
> = {
  REVIEWING: {
    subject: 'Wir haben deine Anfrage erhalten',
    headline: 'Deine Anfrage wird bearbeitet',
    body: 'Vielen Dank für deine Anfrage! Wir haben sie erhalten und werden sie sorgfältig prüfen. Du erhältst in Kürze ein Angebot von uns.',
  },
  QUOTED: {
    subject: 'Dein Angebot ist bereit',
    headline: 'Dein persönliches Angebot',
    body: 'Wir haben deine Anfrage geprüft und ein Angebot für dich erstellt. Bitte melde dich in deinem Konto an, um das Angebot einzusehen und zu akzeptieren.',
  },
  PROOF_SENT: {
    subject: 'Dein Proof ist fertig – bitte prüfen',
    headline: 'Dein Proof ist fertig!',
    body: 'Wir haben einen Entwurf für deine individuelle Bestellung erstellt. Bitte prüfe den Proof sorgfältig und teile uns mit, ob du Änderungen wünschst oder ob wir mit der Produktion beginnen können.',
  },
  IN_PRODUCTION: {
    subject: 'Deine Bestellung ist in Produktion',
    headline: 'Deine Bestellung wird hergestellt',
    body: 'Super, die Produktion deiner individuellen Bestellung hat begonnen! Wir fertigen sie mit größter Sorgfalt für dich an. Wir melden uns, sobald sie versandbereit ist.',
  },
  COMPLETED: {
    subject: 'Deine individuelle Bestellung ist abgeschlossen',
    headline: 'Deine Bestellung ist fertig!',
    body: 'Deine individuelle Bestellung ist abgeschlossen und auf dem Weg zu dir. Wir hoffen, dass sie dir genauso gut gefällt wie uns die Arbeit daran gemacht hat.',
  },
};

export function CustomOrderUpdateEmail({
  customerName = 'Kunde',
  requestId = 'VEE-CUSTOM-001',
  status = 'REVIEWING',
  accountUrl = 'https://vee-handmade.de/account',
  priceQuote,
  proofImageUrl,
  proofNotes,
  message,
}: CustomOrderUpdateEmailProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Html>
      <Head />
      <Preview>
        {config.subject} – Anfrage {requestId}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>{config.headline}</Heading>
          <Text style={text}>Hallo {customerName},</Text>
          <Text style={text}>{config.body}</Text>

          {message && (
            <Section style={messageBox}>
              <Text style={{ ...text, margin: 0 }}>{message}</Text>
            </Section>
          )}

          {status === 'QUOTED' && priceQuote && (
            <>
              <Hr style={hr} />
              <Section>
                <Heading as="h2" style={subheading}>
                  Angebot
                </Heading>
                <Text style={{ ...text, fontSize: '20px', fontWeight: 'bold', color: '#1a1a1a' }}>
                  {priceQuote}
                </Text>
                <Text style={text}>
                  Dieses Angebot ist 7 Tage gültig. Um es anzunehmen, melde dich in deinem Konto an.
                </Text>
              </Section>
            </>
          )}

          {status === 'PROOF_SENT' && proofImageUrl && (
            <>
              <Hr style={hr} />
              <Section>
                <Heading as="h2" style={subheading}>
                  Dein Entwurf
                </Heading>
                <Img
                  src={proofImageUrl}
                  alt="Entwurf deiner individuellen Bestellung"
                  width="480"
                  style={proofImage}
                />
                {proofNotes && <Text style={text}>{proofNotes}</Text>}
              </Section>
            </>
          )}

          <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
            <Button style={button} href={accountUrl}>
              Zum Konto
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={text}>
            <strong>Anfrage-ID:</strong> {requestId}
          </Text>
          <Text style={text}>
            Bei Fragen erreichst du uns unter{' '}
            <Link href="mailto:hallo@vee-handmade.de" style={link}>
              hallo@vee-handmade.de
            </Link>
            .
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
const button = {
  backgroundColor: '#1a1a1a',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '4px',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
};
const messageBox = {
  backgroundColor: '#f0f4f8',
  borderLeft: '4px solid #1a1a1a',
  padding: '12px 16px',
  margin: '16px 0',
  borderRadius: '0 4px 4px 0',
};
const proofImage = {
  borderRadius: '8px',
  width: '100%',
  maxWidth: '480px',
  margin: '8px 0',
};
const link = { color: '#1a1a1a' };

export default CustomOrderUpdateEmail;
