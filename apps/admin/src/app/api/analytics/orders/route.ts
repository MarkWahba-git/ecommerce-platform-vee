import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { analyticsService } from '@vee/core';

/**
 * GET /api/analytics/orders
 * Query params: startDate (ISO), endDate (ISO)
 * Returns orders grouped by source and by status.
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

    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : defaultStart;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : now;

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date parameters' }, { status: 400 });
    }

    const [bySource, byStatus] = await Promise.all([
      analyticsService.getOrdersBySource(startDate, endDate),
      analyticsService.getOrdersByStatus(startDate, endDate),
    ]);

    return NextResponse.json({ bySource, byStatus });
  } catch (error) {
    console.error('[Analytics Orders GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
