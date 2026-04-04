import { randomUUID } from 'crypto';
import { db } from '@vee/db';
import { resend, EMAIL_FROM } from '../lib/email';

// ---------------------------------------------------------------------------
// Simple in-process token store using a Map with TTL.
// In production replace with Redis (set/get/del with 24-hour TTL).
// ---------------------------------------------------------------------------

interface TokenEntry {
  email: string;
  expiresAt: number;
}

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const tokenStore = new Map<string, TokenEntry>();

function generateToken(email: string): string {
  const token = randomUUID();
  tokenStore.set(token, { email, expiresAt: Date.now() + TOKEN_TTL_MS });
  return token;
}

function consumeToken(token: string): string | null {
  const entry = tokenStore.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tokenStore.delete(token);
    return null;
  }
  tokenStore.delete(token);
  return entry.email;
}

function validateToken(token: string): string | null {
  const entry = tokenStore.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tokenStore.delete(token);
    return null;
  }
  return entry.email;
}

// ---------------------------------------------------------------------------

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vee-handmade.de';

export class NewsletterService {
  /**
   * Initiate double opt-in: generate a confirmation token and send email.
   * Returns idempotently if the address is already confirmed.
   */
  async subscribe(email: string, firstName?: string): Promise<{ alreadySubscribed: boolean }> {
    const existing = await db.customer.findUnique({
      where: { email },
      select: { id: true, marketingConsent: true },
    });

    if (existing?.marketingConsent) {
      return { alreadySubscribed: true };
    }

    const token = generateToken(email);
    const confirmationUrl = `${SITE_URL}/newsletter/confirm?token=${token}`;

    // Dynamically import to avoid bundling email templates on the server path
    // that don't use them. Falls back gracefully if the package isn't available.
    try {
      const { NewsletterConfirmationEmail } = await import('@vee/email-templates');
      const { render } = await import('@react-email/render');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html = await render(
        NewsletterConfirmationEmail({ confirmationUrl, firstName }) as any,
      );

      await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: 'Bitte bestätige deine Newsletter-Anmeldung – Vee',
        html,
      });
    } catch {
      // Fallback plain-text confirmation if template rendering fails
      await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: 'Bitte bestätige deine Newsletter-Anmeldung – Vee',
        html: `<p>Bitte bestätige deine Anmeldung: <a href="${confirmationUrl}">${confirmationUrl}</a></p>`,
      });
    }

    return { alreadySubscribed: false };
  }

  /**
   * Confirm a subscription using the token sent by email.
   * Creates a marketing-only Customer record if one doesn't exist yet.
   */
  async confirmSubscription(token: string): Promise<boolean> {
    const email = consumeToken(token);
    if (!email) return false;

    const existing = await db.customer.findUnique({ where: { email } });

    if (existing) {
      await db.customer.update({
        where: { id: existing.id },
        data: { marketingConsent: true, consentDate: new Date() },
      });
    } else {
      await db.customer.create({
        data: {
          email,
          firstName: '',
          lastName: '',
          marketingConsent: true,
          consentDate: new Date(),
        },
      });
    }

    // Send welcome email
    try {
      const { NewsletterWelcomeEmail } = await import('@vee/email-templates');
      const { render } = await import('@react-email/render');
      const unsubscribeUrl = `${SITE_URL}/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${generateToken(email)}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html = await render(
        NewsletterWelcomeEmail({ unsubscribeUrl }) as any,
      );

      await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: 'Willkommen bei Vee! 🎉',
        html,
      });
    } catch {
      // Non-fatal: welcome email failed
    }

    return true;
  }

  /**
   * Unsubscribe using a one-time token (sent in emails).
   */
  async unsubscribe(email: string, token: string): Promise<boolean> {
    const tokenEmail = validateToken(token);
    // Token must match the provided email
    if (tokenEmail !== email) return false;

    tokenStore.delete(token);

    const customer = await db.customer.findUnique({ where: { email } });
    if (!customer) return false;

    await db.customer.update({
      where: { id: customer.id },
      data: { marketingConsent: false },
    });

    return true;
  }

  /**
   * List all customers who have given marketing consent.
   */
  async getSubscribers(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      db.customer.findMany({
        where: { marketingConsent: true },
        select: { id: true, email: true, firstName: true, lastName: true, consentDate: true },
        skip,
        take: limit,
        orderBy: { consentDate: 'desc' },
      }),
      db.customer.count({ where: { marketingConsent: true } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

export const newsletterService = new NewsletterService();
