import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { analyticsService } from '@vee/core';

/**
 * GET /api/analytics/activity
 * Query params: limit (default 20, max 100)
 * Returns a unified recent activity feed of orders, reviews, and custom orders.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

    const activity = await analyticsService.getRecentActivity(limit);
    return NextResponse.json({ activity });
  } catch (error) {
    console.error('[Analytics Activity GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
