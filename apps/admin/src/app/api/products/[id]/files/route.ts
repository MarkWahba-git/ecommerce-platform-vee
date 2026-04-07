import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { imageUploadService } from '@vee/core';

type Params = { params: Promise<{ id: string }> };

/** POST /api/products/[id]/files — Request a presigned upload URL for a digital file */
export async function POST(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { fileName, contentType } = body as {
      fileName?: string;
      contentType?: string;
    };

    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }
    if (!contentType || typeof contentType !== 'string') {
      return NextResponse.json({ error: 'contentType is required' }, { status: 400 });
    }

    const result = await imageUploadService.requestFileUpload(id, fileName, contentType);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[Admin Files POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PATCH /api/products/[id]/files — Confirm file upload and create DB record */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { fileKey, fileName, fileSize, mimeType, isPreview } = body as {
      fileKey?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      isPreview?: boolean;
    };

    if (!fileKey || typeof fileKey !== 'string') {
      return NextResponse.json({ error: 'fileKey is required' }, { status: 400 });
    }
    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }
    if (typeof fileSize !== 'number' || fileSize <= 0) {
      return NextResponse.json({ error: 'fileSize must be a positive number' }, { status: 400 });
    }
    if (!mimeType || typeof mimeType !== 'string') {
      return NextResponse.json({ error: 'mimeType is required' }, { status: 400 });
    }

    const file = await imageUploadService.confirmFileUpload(id, fileKey, {
      fileName,
      fileSize,
      mimeType,
      isPreview,
    });

    return NextResponse.json(file, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[Admin Files PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
