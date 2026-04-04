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

interface ShippingNotificationEmailProps {
  orderNumber: string;
  customerName: string;
  trackingNumber: string;
  trackingUrl: string;
  carrierName: string;
  estimatedDelivery?: string;
}

export function ShippingNotificationEmail({
  orderNumber = 'VEE-2026-00001',
  customerName = 'Kunde',
  trackingNumber = '1234567890',
  trackingUrl = 'https://tracking.example.com',
  carrierName = 'DHL',
  estimatedDelivery = '2–4 Werktage',
}: ShippingNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Deine Bestellung {orderNumber} ist auf dem Weg!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Deine Bestellung ist auf dem Weg!</Heading>
          <Text style={text}>Hallo {customerName},</Text>
          <Text style={text}>
            gute Neuigkeiten! Deine Bestellung <strong>{orderNumber}</strong> wurde versendet und
            ist jetzt unterwegs zu dir.
          </Text>

          <Hr style={hr} />

          <Section>
            <Heading as="h2" style={subheading}>
              Versandinformationen
            </Heading>
            <Text style={text}>
              <strong>Versanddienstleister:</strong> {carrierName}
            </Text>
            <Text style={text}>
              <strong>Sendungsnummer:</strong> {trackingNumber}
            </Text>
            {estimatedDelivery && (
              <Text style={text}>
                <strong>Voraussichtliche Lieferzeit:</strong> {estimatedDelivery}
              </Text>
            )}
          </Section>

          <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
            <Button style={button} href={trackingUrl}>
              Sendung verfolgen
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={text}>
            Du kannst deine Sendung auch direkt auf der Website von {carrierName} verfolgen:{' '}
            <Link href={trackingUrl} style={link}>
              {trackingUrl}
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
const button = {
  backgroundColor: '#1a1a1a',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '4px',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
};
const link = { color: '#1a1a1a' };

export default ShippingNotificationEmail;
