import { NextRequest, NextResponse } from 'next/server';
import { stripe, orderService } from '@vee/core';
import { checkoutSchema } from '@vee/shared';
import { db } from '@vee/db';
import { cookies } from 'next/headers';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const customerId = cookieStore.get('customerId')?.value;

    if (!customerId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify customer exists
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 401 });
    }

    const body = await req.json();
    const input = checkoutSchema.parse(body);

    // Validate cart and ownership
    const cart = await db.cart.findUnique({
      where: { id: input.cartId },
      include: {
        items: {
          include: {
            product: { select: { name: true, basePrice: true, type: true } },
            variant: { select: { name: true, price: true } },
          },
        },
      },
    });

    if (!cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    const sessionId = cookieStore.get('vee_session')?.value;
    const isOwnedCart =
      cart.customerId === customerId ||
      (sessionId && cart.sessionId === sessionId);

    if (!isOwnedCart) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 422 });
    }

    // Calculate total in smallest currency unit (cents)
    const totalAmount = cart.items.reduce((sum, item) => {
      const unitPrice = item.variant?.price
        ? Number(item.variant.price)
        : Number(item.product.basePrice);
      return sum + Math.round(unitPrice * 100) * item.quantity;
    }, 0);

    // Create the order record first (status: PENDING)
    const order = await orderService.createFromCart(input, customerId);

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId,
        customerEmail: customer.email,
      },
      receipt_email: customer.email,
      description: `Order ${order.orderNumber} — ${customer.firstName} ${customer.lastName}`,
    });

    // Record the pending payment against the order
    await db.payment.create({
      data: {
        orderId: order.id,
        amount: order.total,
        currency: 'EUR',
        status: 'PENDING',
        provider: 'stripe',
        providerPaymentId: paymentIntent.id,
        providerData: { clientSecret: paymentIntent.client_secret },
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: err.errors }, { status: 400 });
    }
    if (err instanceof Error && err.message === 'Cart is empty') {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    if (err instanceof Error && err.message.includes('Insufficient stock')) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error('[POST /api/checkout]', err);
    return NextResponse.json({ error: 'Failed to process checkout' }, { status: 500 });
  }
}
