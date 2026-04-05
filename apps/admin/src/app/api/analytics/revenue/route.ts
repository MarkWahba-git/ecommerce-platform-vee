import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { analyticsService } from '@vee/core';

/**
 * GET /api/analytics/revenue
 * Query params: startDate (ISO), endDate (ISO)
 * Returns revenue stats + daily chart data for the given period.
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

    const [stats, daily] = await Promise.all([
      analyticsService.getRevenueStats(startDate, endDate),
      analyticsService.getRevenueByDay(startDate, endDate),
    ]);

    return NextResponse.json({ stats, daily });
  } catch (error) {
    console.error('[Analytics Revenue GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
