import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { imageUploadService } from '@vee/core';
import { db } from '@vee/db';

/** PATCH /api/products/[id]/images/[imageId] — Update altText or isPrimary */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, imageId } = await params;
    const body = await request.json();
    const { altText, isPrimary } = body as {
      altText?: string | null;
      isPrimary?: boolean;
    };

    // Verify image belongs to this product
    const existing = await db.productImage.findFirst({
      where: { id: imageId, productId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const updated = await imageUploadService.updateImage(imageId, { altText, isPrimary });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[Admin Image PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE /api/products/[id]/images/[imageId] — Delete an image */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, imageId } = await params;

    // Verify image belongs to this product
    const existing = await db.productImage.findFirst({
      where: { id: imageId, productId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    await imageUploadService.deleteImage(imageId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[Admin Image DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
