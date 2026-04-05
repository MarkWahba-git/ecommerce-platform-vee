import { NextRequest, NextResponse } from 'next/server';
import { cartService } from '@vee/core';
import { updateCartItemSchema } from '@vee/shared';
import { db } from '@vee/db';
import { cookies } from 'next/headers';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

/** Verify the cart item belongs to the caller's cart before mutating */
async function resolveCartItem(itemId: string) {
  const cookieStore = await cookies();
  const customerId = cookieStore.get('customerId')?.value;
  const sessionId = cookieStore.get('vee_session')?.value;

  const item = await db.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: { select: { customerId: true, sessionId: true } } },
  });

  if (!item) return { item: null, authorized: false };

  const cartOwner = item.cart;
  const authorized =
    (customerId && cartOwner.customerId === customerId) ||
    (sessionId && cartOwner.sessionId === sessionId);

  return { item, authorized: !!authorized };
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { itemId } = await params;
    const { item, authorized } = await resolveCartItem(itemId);

    if (!item) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const input = updateCartItemSchema.parse(body);

    const updated = await cartService.updateItem(itemId, input);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: err.errors }, { status: 400 });
    }
    console.error('[PATCH /api/cart/items/[itemId]]', err);
    return NextResponse.json({ error: 'Failed to update cart item' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { itemId } = await params;
    const { item, authorized } = await resolveCartItem(itemId);

    if (!item) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await cartService.removeItem(itemId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[DELETE /api/cart/items/[itemId]]', err);
    return NextResponse.json({ error: 'Failed to remove cart item' }, { status: 500 });
  }
}
