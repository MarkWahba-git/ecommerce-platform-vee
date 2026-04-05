import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-helpers';
import { digitalDeliveryService } from '@vee/core';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ accessId: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { accessId } = await params;

    const url = await digitalDeliveryService.getDownloadUrl(accessId, session.customerId);

    // Redirect directly to the presigned S3 URL so the browser downloads the file
    return NextResponse.redirect(url);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Download not found') {
        return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
      }
      if (
        error.message === 'Download limit reached' ||
        error.message === 'Download link has expired'
      ) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error('[Download Error]', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
