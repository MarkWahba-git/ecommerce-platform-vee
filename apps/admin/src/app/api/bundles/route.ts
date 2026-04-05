import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { bundleService } from '@vee/core';

/**
 * GET /api/bundles — List all product bundles
 */
export async function GET(_request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bundles = await bundleService.listBundles();
    return NextResponse.json({ bundles });
  } catch (error) {
    console.error('[Bundles GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/bundles — Create a new product bundle
 * Body: { name, slug?, sku, description, shortDescription?, price, compareAtPrice?, items: BundleItem[] }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, sku, description, shortDescription, price, compareAtPrice, items } = body;

    if (!name || !sku || !description || price == null) {
      return NextResponse.json(
        { error: 'Missing required fields: name, sku, description, price' },
        { status: 400 },
      );
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Bundle must include at least one item' },
        { status: 400 },
      );
    }

    const bundle = await bundleService.create({
      name,
      slug,
      sku,
      description,
      shortDescription,
      price: Number(price),
      compareAtPrice: compareAtPrice != null ? Number(compareAtPrice) : undefined,
      items,
    });

    return NextResponse.json({ bundle }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      // Surface validation errors (missing product, etc.) as 422
      if (
        error.message.includes('not found') ||
        error.message.includes('does not belong')
      ) {
        return NextResponse.json({ error: error.message }, { status: 422 });
      }
    }
    console.error('[Bundles POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
