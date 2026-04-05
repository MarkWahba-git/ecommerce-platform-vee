import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { bundleService } from '@vee/core';
import { db } from '@vee/db';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/bundles/[id] — Get bundle detail with expanded items
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const bundle = await bundleService.getBundle(id);

    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
    }

    return NextResponse.json({ bundle });
  } catch (error) {
    console.error('[Bundle GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/bundles/[id] — Update bundle price and/or items
 * Body: { price?, compareAtPrice?, items?: BundleItem[], status? }
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { price, compareAtPrice, items, status, name, description, shortDescription } = body;

    // Update items composition if provided
    if (Array.isArray(items)) {
      await bundleService.updateItems(id, items);
    }

    // Build a generic product update for scalar fields
    const updateData: Record<string, unknown> = {};
    if (price != null) updateData.basePrice = Number(price);
    if (compareAtPrice != null) updateData.compareAtPrice = Number(compareAtPrice);
    if (status != null) updateData.status = status;
    if (name != null) updateData.name = name;
    if (description != null) updateData.description = description;
    if (shortDescription != null) updateData.shortDescription = shortDescription;

    let updated;
    if (Object.keys(updateData).length > 0) {
      updated = await db.product.update({ where: { id }, data: updateData });
    } else {
      updated = await db.product.findUniqueOrThrow({ where: { id } });
    }

    return NextResponse.json({ bundle: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('not a bundle')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    console.error('[Bundle PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/bundles/[id] — Archive a bundle (soft delete via status change)
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const bundle = await bundleService.getBundle(id);
    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
    }

    await db.product.update({ where: { id }, data: { status: 'ARCHIVED' } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Bundle DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
