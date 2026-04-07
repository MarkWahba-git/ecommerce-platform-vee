import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { couponService } from '@vee/core';

/**
 * GET /api/coupons — List coupons with optional filters
 * Query params: isActive (boolean), type, page, limit
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActiveParam = searchParams.get('isActive');
    const type = searchParams.get('type') ?? undefined;
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')));

    const isActive =
      isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined;

    const result = await couponService.list({ isActive, type, page, limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Coupons GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/coupons — Create a new coupon
 * Body: { code, type, value, minOrderAmount?, maxDiscountAmount?, usageLimit?,
 *         perCustomerLimit?, applicableTo?, startsAt?, expiresAt?, isActive? }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code, type, value } = body;

    if (!code || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: code, type' },
        { status: 400 },
      );
    }

    const validTypes = ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING', 'BUY_X_GET_Y'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 },
      );
    }

    if (type !== 'FREE_SHIPPING' && (value == null || isNaN(Number(value)) || Number(value) < 0)) {
      return NextResponse.json(
        { error: 'value must be a non-negative number for this coupon type.' },
        { status: 400 },
      );
    }

    const coupon = await couponService.create({
      code,
      type,
      value: type !== 'FREE_SHIPPING' ? Number(value) : 0,
      minOrderAmount: body.minOrderAmount != null ? Number(body.minOrderAmount) : null,
      maxDiscountAmount: body.maxDiscountAmount != null ? Number(body.maxDiscountAmount) : null,
      usageLimit: body.usageLimit != null ? Number(body.usageLimit) : null,
      perCustomerLimit: body.perCustomerLimit != null ? Number(body.perCustomerLimit) : 1,
      applicableTo: body.applicableTo ?? null,
      startsAt: body.startsAt ?? null,
      expiresAt: body.expiresAt ?? null,
      isActive: body.isActive ?? true,
    });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }
    console.error('[Coupons POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
