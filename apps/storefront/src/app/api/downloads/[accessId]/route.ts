import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@vee/db';
import { getDownloadUrl } from '@vee/core';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ accessId: string }> },
) {
  try {
    const { accessId } = await params;
    const cookieStore = await cookies();
    const customerId = cookieStore.get('customerId')?.value;

    if (!customerId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const access = await db.downloadAccess.findUnique({
      where: { id: accessId },
    });

    if (!access || access.customerId !== customerId) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    // Check download limits
    if (access.maxDownloads && access.downloadCount >= access.maxDownloads) {
      return NextResponse.json(
        { error: 'Download-Limit erreicht' },
        { status: 403 },
      );
    }

    // Check expiry
    if (access.expiresAt && access.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Download abgelaufen' },
        { status: 403 },
      );
    }

    // Generate signed URL
    const url = await getDownloadUrl(access.fileKey, 900);

    // Increment download count
    await db.downloadAccess.update({
      where: { id: accessId },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadAt: new Date(),
      },
    });

    return NextResponse.json({ url, fileName: access.fileName });
  } catch (error) {
    console.error('[Download Error]', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
