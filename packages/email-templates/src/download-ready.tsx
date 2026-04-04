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

interface DownloadReadyEmailProps {
  customerName: string;
  productName: string;
  downloadUrl: string;
  expiresAt?: string;
  downloadLimit?: number;
  downloadsUsed?: number;
}

export function DownloadReadyEmail({
  customerName = 'Kunde',
  productName = 'Digitales Produkt',
  downloadUrl = 'https://vee-handmade.de/downloads/token',
  expiresAt,
  downloadLimit,
  downloadsUsed = 0,
}: DownloadReadyEmailProps) {
  const remainingDownloads =
    downloadLimit != null ? downloadLimit - downloadsUsed : null;

  return (
    <Html>
      <Head />
      <Preview>Dein digitaler Download ist bereit – {productName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Dein digitaler Download ist bereit!</Heading>
          <Text style={text}>Hallo {customerName},</Text>
          <Text style={text}>
            vielen Dank für deinen Kauf! Dein digitales Produkt{' '}
            <strong>{productName}</strong> steht jetzt zum Download bereit.
          </Text>

          <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
            <Button style={button} href={downloadUrl}>
              Jetzt herunterladen
            </Button>
          </Section>

          <Hr style={hr} />

          <Section>
            <Heading as="h2" style={subheading}>
              Download-Informationen
            </Heading>
            {expiresAt && (
              <Text style={text}>
                <strong>Gültig bis:</strong> {expiresAt}
              </Text>
            )}
            {downloadLimit != null && (
              <Text style={text}>
                <strong>Verbleibende Downloads:</strong>{' '}
                {remainingDownloads !== null ? remainingDownloads : downloadLimit} von{' '}
                {downloadLimit}
              </Text>
            )}
          </Section>

          <Hr style={hr} />
          <Text style={text}>
            Bitte speichere die Datei nach dem Download an einem sicheren Ort. Bei Problemen
            kontaktiere uns unter{' '}
            <a href="mailto:hallo@vee-handmade.de" style={link}>
              hallo@vee-handmade.de
            </a>
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
const link = { color: '#1a1a1a' };

export default DownloadReadyEmail;
