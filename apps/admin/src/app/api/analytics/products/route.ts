import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { analyticsService } from '@vee/core';

/**
 * GET /api/analytics/products
 * Query params: limit (default 10), startDate (ISO), endDate (ISO)
 * Returns top products by revenue.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30);
    defaultStart.setHours(0, 0, 0, 0);

    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : defaultStart;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : now;

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date parameters' }, { status: 400 });
    }

    const products = await analyticsService.getTopProducts(limit, startDate, endDate);
    return NextResponse.json({ products });
  } catch (error) {
    console.error('[Analytics Products GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
