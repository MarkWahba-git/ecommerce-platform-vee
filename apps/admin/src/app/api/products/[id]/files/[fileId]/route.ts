import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { imageUploadService } from '@vee/core';
import { db } from '@vee/db';

/** DELETE /api/products/[id]/files/[fileId] — Delete a digital file */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, fileId } = await params;

    // Verify the file belongs to this product
    const existing = await db.productFile.findFirst({
      where: { id: fileId, productId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await imageUploadService.deleteFile(fileId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[Admin File DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
