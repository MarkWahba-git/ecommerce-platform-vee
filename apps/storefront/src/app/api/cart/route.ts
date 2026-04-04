import { NextRequest, NextResponse } from 'next/server';
import { cartService } from '@vee/core';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const SESSION_COOKIE = 'vee_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const createCartSchema = z.object({
  customerId: z.string().optional(),
});

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const customerId = cookieStore.get('customerId')?.value;
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

    if (!customerId && !sessionId) {
      // No identity yet — return empty state; cart is created on first item add
      return NextResponse.json(null);
    }

    const cart = await cartService.getOrCreate(customerId, sessionId);

    return NextResponse.json(cart);
  } catch (err) {
    console.error('[GET /api/cart]', err);
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    let customerId = cookieStore.get('customerId')?.value;
    let sessionId = cookieStore.get(SESSION_COOKIE)?.value;

    const body = await req.json().catch(() => ({}));
    const parsed = createCartSchema.safeParse(body);

    if (parsed.success && parsed.data.customerId) {
      customerId = parsed.data.customerId;
    }

    // Mint a new session if needed
    if (!customerId && !sessionId) {
      sessionId = uuidv4();
    }

    const cart = await cartService.getOrCreate(customerId, sessionId);

    const res = NextResponse.json(cart, { status: 201 });

    // Persist the session cookie if we just minted one
    if (sessionId && !cookieStore.get(SESSION_COOKIE)?.value) {
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
    console.error('[POST /api/cart]', err);
    return NextResponse.json({ error: 'Failed to create cart' }, { status: 500 });
  }
}
