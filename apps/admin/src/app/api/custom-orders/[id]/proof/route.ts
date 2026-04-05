import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { customOrderService } from '@vee/core';
import { getUploadUrl } from '@vee/core';

/** POST /api/custom-orders/[id]/proof — Get a presigned upload URL and set proof file key */
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
    const body = await request.json() as { fileName?: string; contentType?: string };

    if (!body.fileName || !body.contentType) {
      return NextResponse.json(
        { error: 'fileName and contentType are required' },
        { status: 400 },
      );
    }

    // Build the S3 key for the proof file
    const ext = body.fileName.split('.').pop() ?? 'bin';
    const fileKey = `custom-orders/${id}/proof-${Date.now()}.${ext}`;

    const uploadUrl = await getUploadUrl(fileKey, body.contentType, 3600);

    // Register the proof key immediately so admin can also confirm after upload
    // The actual status transition happens when the admin calls uploadProof
    return NextResponse.json({ uploadUrl, fileKey });
  } catch (error) {
    console.error('[Admin Proof Upload]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PATCH /api/custom-orders/[id]/proof — Confirm the proof was uploaded (sets key + PROOF_SENT status) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json() as { fileKey?: string };

    if (!body.fileKey) {
      return NextResponse.json({ error: 'fileKey is required' }, { status: 400 });
    }

    const updated = await customOrderService.uploadProof(id, body.fileKey);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[Admin Proof Confirm]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
