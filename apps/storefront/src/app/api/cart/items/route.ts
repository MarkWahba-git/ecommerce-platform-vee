import { NextRequest, NextResponse } from 'next/server';
import { cartService } from '@vee/core';
import { addToCartSchema } from '@vee/shared';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const SESSION_COOKIE = 'vee_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const customerId = cookieStore.get('customerId')?.value;
    let sessionId = cookieStore.get(SESSION_COOKIE)?.value;

    // Mint a session if no identity exists
    const isNewSession = !customerId && !sessionId;
    if (isNewSession) {
      sessionId = randomUUID();
    }

    const cart = await cartService.getOrCreate(customerId, sessionId);

    const body = await req.json();
    const input = addToCartSchema.parse(body);

    const item = await cartService.addItem(cart.id, input);

    const res = NextResponse.json(item, { status: 201 });

    if (isNewSession && sessionId) {
      res.cookies.set(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
      });
    }

    return res;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: err.errors }, { status: 400 });
    }
    if (err instanceof Error && err.message.includes('Insufficient stock')) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error('[POST /api/cart/items]', err);
    return NextResponse.json({ error: 'Failed to add item to cart' }, { status: 500 });
  }
}
