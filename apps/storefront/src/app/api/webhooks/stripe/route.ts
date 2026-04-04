import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@vee/core';
import { db } from '@vee/db';
import type Stripe from 'stripe';

// Required for raw body access in Next.js App Router
export const runtime = 'nodejs';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe webhook] Signature verification failed:', message);
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(pi);
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(pi);
        break;
      }
      case 'payment_intent.canceled': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentCanceled(pi);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }
      default:
        // Acknowledge unhandled event types without error
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`[Stripe webhook] Error handling ${event.type}:`, err);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }
}

async function handlePaymentSucceeded(pi: Stripe.PaymentIntent) {
  const payment = await db.payment.findFirst({
    where: { providerPaymentId: pi.id },
    include: { order: true },
  });

  if (!payment) {
    console.warn(`[Stripe webhook] No payment record found for PaymentIntent ${pi.id}`);
    return;
  }

  // Mark payment as succeeded
  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: 'SUCCEEDED',
      providerData: pi as unknown as Record<string, unknown>,
    },
  });

  // Confirm the order
  if (payment.order.status === 'PENDING') {
    await db.order.update({
      where: { id: payment.orderId },
      data: {
        status: 'CONFIRMED',
        paidAt: new Date(),
      },
    });
  }
}

async function handlePaymentFailed(pi: Stripe.PaymentIntent) {
  const payment = await db.payment.findFirst({
    where: { providerPaymentId: pi.id },
  });

  if (!payment) return;

  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: 'FAILED',
      providerData: pi as unknown as Record<string, unknown>,
    },
  });
}

async function handlePaymentCanceled(pi: Stripe.PaymentIntent) {
  const payment = await db.payment.findFirst({
    where: { providerPaymentId: pi.id },
  });

  if (!payment) return;

  await db.payment.update({
    where: { id: payment.id },
    data: { status: 'FAILED' },
  });

  // Cancel the order if still pending
  await db.order.updateMany({
    where: { id: payment.orderId, status: 'PENDING' },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  // Find the payment by the payment intent associated with this charge
  if (!charge.payment_intent) return;

  const piId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent.id;

  const payment = await db.payment.findFirst({
    where: { providerPaymentId: piId },
  });

  if (!payment) return;

  // Record a refund for each refund on the charge (idempotent by providerRefundId)
  for (const refund of charge.refunds?.data ?? []) {
    const existing = await db.refund.findFirst({
      where: { providerRefundId: refund.id },
    });

    if (!existing) {
      await db.refund.create({
        data: {
          orderId: payment.orderId,
          amount: refund.amount / 100, // Convert cents back to euros
          providerRefundId: refund.id,
          reason: refund.reason ?? undefined,
          status: refund.status ?? 'succeeded',
        },
      });
    }
  }

  // Update order status to REFUNDED if fully refunded
  if (charge.refunded) {
    await db.order.update({
      where: { id: payment.orderId },
      data: { status: 'REFUNDED' },
    });
  }
}
