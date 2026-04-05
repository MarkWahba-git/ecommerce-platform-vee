import { NextRequest, NextResponse } from 'next/server';
import { db } from '@vee/db';
import { productListSchema } from '@vee/shared';
import { productService } from '@vee/core';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    const category = await db.category.findUnique({
      where: { slug, isActive: true },
      include: {
        children: {
          where: { isActive: true },
          select: { id: true, slug: true, name: true, imageUrl: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' },
        },
        parent: {
          select: { id: true, slug: true, name: true },
        },
        seoMeta: true,
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const { searchParams } = req.nextUrl;

    const rawInput = {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
      sortBy: searchParams.get('sortBy') ?? undefined,
      sortOrder: searchParams.get('sortOrder') ?? undefined,
      status: 'ACTIVE' as const,
      categoryId: category.id,
    };

    const parsed = productListSchema.parse(rawInput);
    const products = await productService.list(parsed);

    return NextResponse.json({ category, products });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: err.errors }, { status: 400 });
    }
    console.error('[GET /api/categories/[slug]]', err);
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
  }
}
