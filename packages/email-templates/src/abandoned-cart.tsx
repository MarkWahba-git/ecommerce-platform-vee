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

interface CartItem {
  name: string;
  quantity: number;
  price: string;
  imageUrl?: string;
  variantName?: string;
}

interface AbandonedCartEmailProps {
  customerName: string;
  cartUrl: string;
  items: CartItem[];
  total?: string;
  unsubscribeUrl: string;
}

export function AbandonedCartEmail({
  customerName = 'Kunde',
  cartUrl = 'https://vee-handmade.de/cart',
  items = [],
  total,
  unsubscribeUrl = 'https://vee-handmade.de/newsletter/unsubscribe',
}: AbandonedCartEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Hast du etwas vergessen? Dein Warenkorb wartet auf dich!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Hast du etwas vergessen?</Heading>
          <Text style={text}>Hallo {customerName},</Text>
          <Text style={text}>
            du hast Artikel in deinem Warenkorb gelassen. Kein Problem – wir haben sie für dich
            aufbewahrt!
          </Text>

          <Hr style={hr} />

          <Section>
            <Heading as="h2" style={subheading}>
              Dein Warenkorb
            </Heading>
            {items.map((item, i) => (
              <Section key={i} style={itemRow}>
                {item.imageUrl && (
                  <Img
                    src={item.imageUrl}
                    alt={item.name}
                    width="64"
                    height="64"
                    style={itemImage}
                  />
                )}
                <Section style={itemDetails}>
                  <Text style={{ ...text, margin: '0', fontWeight: 'bold' }}>{item.name}</Text>
                  {item.variantName && (
                    <Text style={{ ...text, margin: '0', color: '#8898aa' }}>
                      {item.variantName}
                    </Text>
                  )}
                  <Text style={{ ...text, margin: '0' }}>
                    {item.quantity}x — {item.price}
                  </Text>
                </Section>
              </Section>
            ))}
            {total && (
              <>
                <Hr style={hr} />
                <Text style={{ ...text, fontWeight: 'bold' }}>Gesamt: {total}</Text>
              </>
            )}
          </Section>

          <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
            <Button style={button} href={cartUrl}>
              Zum Warenkorb zurückkehren
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={text}>
            Handgemachte Produkte in limitierter Auflage – sichere dir deine Artikel, bevor sie
            vergriffen sind!
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
const itemRow = { display: 'flex' as const, alignItems: 'center' as const, margin: '12px 0' };
const itemImage = { borderRadius: '4px', objectFit: 'cover' as const, marginRight: '16px' };
const itemDetails = { flex: 1 };
const unsubscribeLink = { color: '#8898aa', fontSize: '12px' };

export default AbandonedCartEmail;
