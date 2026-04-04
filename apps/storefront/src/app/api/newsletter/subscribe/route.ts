import { NextRequest, NextResponse } from 'next/server';
import { db } from '@vee/db';
import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(100).optional(),
  source: z.string().max(50).default('storefront'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = subscribeSchema.parse(body);

    // Check if customer exists with this email
    const customer = await db.customer.findUnique({
      where: { email: input.email },
      select: { id: true, marketingConsent: true },
    });

    if (customer) {
      if (customer.marketingConsent) {
        // Already subscribed — idempotent success
        return NextResponse.json({ message: 'Already subscribed' });
      }

      await db.customer.update({
        where: { id: customer.id },
        data: { marketingConsent: true },
      });
    } else {
      // Create a marketing-only customer record
      await db.customer.create({
        data: {
          email: input.email,
          firstName: input.firstName ?? '',
          lastName: '',
          marketingConsent: true,
        },
      });
    }

    return NextResponse.json({ message: 'Successfully subscribed' }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: err.errors }, { status: 400 });
    }
    console.error('[POST /api/newsletter/subscribe]', err);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}
