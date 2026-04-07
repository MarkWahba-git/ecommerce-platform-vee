import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { couponService } from '@vee/core';
import { db } from '@vee/db';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/coupons/[id] — Get a single coupon by ID
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const coupon = await db.coupon.findUnique({ where: { id } });

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error('[Coupon GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/coupons/[id] — Update a coupon
 * Body: partial coupon fields
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Support deactivate shorthand
    if (body.deactivate === true) {
      const coupon = await couponService.deactivate(id);
      return NextResponse.json({ coupon });
    }

    const coupon = await couponService.update(id, {
      ...(body.code !== undefined && { code: body.code }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.value !== undefined && { value: Number(body.value) }),
      ...('minOrderAmount' in body && {
        minOrderAmount: body.minOrderAmount != null ? Number(body.minOrderAmount) : null,
      }),
      ...('maxDiscountAmount' in body && {
        maxDiscountAmount: body.maxDiscountAmount != null ? Number(body.maxDiscountAmount) : null,
      }),
      ...('usageLimit' in body && {
        usageLimit: body.usageLimit != null ? Number(body.usageLimit) : null,
      }),
      ...('perCustomerLimit' in body && {
        perCustomerLimit: body.perCustomerLimit != null ? Number(body.perCustomerLimit) : 1,
      }),
      ...('applicableTo' in body && { applicableTo: body.applicableTo ?? null }),
      ...('startsAt' in body && { startsAt: body.startsAt ?? null }),
      ...('expiresAt' in body && { expiresAt: body.expiresAt ?? null }),
      ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
    });

    return NextResponse.json({ coupon });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }
    console.error('[Coupon PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/coupons/[id] — Deactivate (soft delete) a coupon
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await couponService.deactivate(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }
    console.error('[Coupon DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
