import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { reviewService } from '@vee/core';

/**
 * POST /api/reviews/bulk — Bulk approve or reject reviews
 * Body: { ids: string[], action: 'approve' | 'reject' }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids, action } = body as { ids: string[]; action: 'approve' | 'reject' };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array.' }, { status: 400 });
    }
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject".' },
        { status: 400 },
      );
    }

    const results =
      action === 'approve'
        ? await reviewService.bulkApprove(ids)
        : await reviewService.bulkReject(ids);

    return NextResponse.json({ updated: results.length });
  } catch (error) {
    console.error('[Reviews Bulk POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
