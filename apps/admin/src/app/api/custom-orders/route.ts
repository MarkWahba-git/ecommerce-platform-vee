import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { customOrderService } from '@vee/core';

/** GET /api/custom-orders — List custom order requests with optional status/customer filters */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? undefined;
    const customerId = searchParams.get('customerId') ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

    const result = await customOrderService.list({ status, customerId, page, limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Admin Custom Orders GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
