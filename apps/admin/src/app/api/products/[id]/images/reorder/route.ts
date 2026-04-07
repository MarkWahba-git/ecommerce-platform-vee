import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { imageUploadService } from '@vee/core';

/** POST /api/products/[id]/images/reorder — Reorder images by providing ordered array of IDs */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { imageIds } = body as { imageIds?: string[] };

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: 'imageIds must be a non-empty array of strings' },
        { status: 400 },
      );
    }

    await imageUploadService.reorderImages(id, imageIds);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[Admin Images Reorder POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
