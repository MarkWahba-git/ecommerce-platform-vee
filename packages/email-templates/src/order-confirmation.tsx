import {
  Body,
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

interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

interface OrderConfirmationEmailProps {
  orderNumber: string;
  customerName: string;
  items: OrderItem[];
  subtotal: string;
  shipping: string;
  total: string;
  shippingAddress: string;
}

export function OrderConfirmationEmail({
  orderNumber = 'VEE-2026-00001',
  customerName = 'Customer',
  items = [],
  subtotal = '0,00 EUR',
  shipping = '0,00 EUR',
  total = '0,00 EUR',
  shippingAddress = '',
}: OrderConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Bestellbestätigung {orderNumber} - Vee Handmade</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Vielen Dank für Ihre Bestellung!</Heading>
          <Text style={text}>Hallo {customerName},</Text>
          <Text style={text}>
            wir haben Ihre Bestellung <strong>{orderNumber}</strong> erhalten und bearbeiten sie.
          </Text>

          <Hr style={hr} />

          <Section>
            <Heading as="h2" style={subheading}>
              Bestellübersicht
            </Heading>
            {items.map((item, i) => (
              <Text key={i} style={text}>
                {item.quantity}x {item.name} — {item.totalPrice}
              </Text>
            ))}
            <Hr style={hr} />
            <Text style={text}>Zwischensumme: {subtotal}</Text>
            <Text style={text}>Versand: {shipping}</Text>
            <Text style={{ ...text, fontWeight: 'bold' }}>Gesamt: {total}</Text>
          </Section>

          {shippingAddress && (
            <Section>
              <Heading as="h2" style={subheading}>
                Lieferadresse
              </Heading>
              <Text style={text}>{shippingAddress}</Text>
            </Section>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            Vee Handmade — Handgemacht mit Liebe
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

export default OrderConfirmationEmail;
