import { NextRequest, NextResponse } from 'next/server';
import { productService } from '@vee/core';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const product = await productService.getBySlug(slug);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (err) {
    console.error('[GET /api/products/[slug]]', err);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}
