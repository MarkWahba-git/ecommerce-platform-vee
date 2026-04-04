import { NextRequest, NextResponse } from 'next/server';
import { cartService } from '@vee/core';
import { applyCouponSchema } from '@vee/shared';
import { cookies } from 'next/headers';
import { z } from 'zod';

async function resolveCartId(): Promise<string | null> {
  const cookieStore = await cookies();
  const customerId = cookieStore.get('customerId')?.value;
  const sessionId = cookieStore.get('vee_session')?.value;

  if (!customerId && !sessionId) return null;

  try {
    const cart = await cartService.getOrCreate(customerId, sessionId);
    return cart.id;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const cartId = await resolveCartId();
    if (!cartId) {
      return NextResponse.json({ error: 'No active cart found' }, { status: 404 });
    }

    const body = await req.json();
    const { code } = applyCouponSchema.parse(body);

    const cart = await cartService.applyCoupon(cartId, code);
    return NextResponse.json(cart);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: err.errors }, { status: 400 });
    }
    if (err instanceof Error && (
      err.message.includes('Invalid') ||
      err.message.includes('expired') ||
      err.message.includes('limit reached')
    )) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error('[POST /api/cart/coupon]', err);
    return NextResponse.json({ error: 'Failed to apply coupon' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    const cartId = await resolveCartId();
    if (!cartId) {
      return NextResponse.json({ error: 'No active cart found' }, { status: 404 });
    }

    const cart = await cartService.removeCoupon(cartId);
    return NextResponse.json(cart);
  } catch (err) {
    console.error('[DELETE /api/cart/coupon]', err);
    return NextResponse.json({ error: 'Failed to remove coupon' }, { status: 500 });
  }
}
