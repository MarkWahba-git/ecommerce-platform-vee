import { NextRequest, NextResponse } from 'next/server';
import { productService } from '@vee/core';
import { productListSchema } from '@vee/shared';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const rawInput = {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
      type: searchParams.get('type') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      categoryId: searchParams.get('categoryId') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      sortBy: searchParams.get('sortBy') ?? undefined,
      sortOrder: searchParams.get('sortOrder') ?? undefined,
    };

    const parsed = productListSchema.parse(rawInput);

    // Storefront always filters to ACTIVE products unless explicitly overridden by admin
    if (!parsed.status) {
      parsed.status = 'ACTIVE';
    }

    const result = await productService.list(parsed);

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: err.errors }, { status: 400 });
    }
    console.error('[GET /api/products]', err);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
