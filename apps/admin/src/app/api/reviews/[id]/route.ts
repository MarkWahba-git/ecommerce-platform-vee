import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { reviewService } from '@vee/core';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/reviews/[id] — Get review detail with product and customer info
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const review = await reviewService.getById(id);

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error('[Review GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/reviews/[id] — Approve or reject a review
 * Body: { action: 'approve' | 'reject' }
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body as { action: 'approve' | 'reject' };

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject".' },
        { status: 400 },
      );
    }

    const review =
      action === 'approve'
        ? await reviewService.approve(id)
        : await reviewService.reject(id);

    return NextResponse.json({ review });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    console.error('[Review PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/reviews/[id] — Permanently delete a review
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await reviewService.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    console.error('[Review DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
