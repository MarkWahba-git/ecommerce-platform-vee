import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { reviewService } from '@vee/core';

/**
 * GET /api/reviews — List reviews with optional filters
 * Query params: status (pending|approved), productId, customerId, page, limit
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'approved' | null;
    const productId = searchParams.get('productId') ?? undefined;
    const customerId = searchParams.get('customerId') ?? undefined;
    const page = Number(searchParams.get('page') ?? '1');
    const limit = Number(searchParams.get('limit') ?? '20');

    const [result, stats] = await Promise.all([
      reviewService.list({ status: status ?? undefined, productId, customerId, page, limit }),
      reviewService.getStats(),
    ]);

    return NextResponse.json({ ...result, stats });
  } catch (error) {
    console.error('[Reviews GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
