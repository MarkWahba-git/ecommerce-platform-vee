import { NextRequest, NextResponse } from 'next/server';
import { MeiliSearch } from 'meilisearch';
import { z } from 'zod';

const meili = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST ?? 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY ?? 'vee_meili_dev_key',
});

const PRODUCT_INDEX = 'products';

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  type: z.enum(['PHYSICAL', 'DIGITAL', 'PERSONALIZED']).optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const parsed = searchQuerySchema.parse({
      q: searchParams.get('q') ?? '',
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      minPrice: searchParams.get('minPrice') ?? undefined,
      maxPrice: searchParams.get('maxPrice') ?? undefined,
    });

    const filters: string[] = [];

    if (parsed.type) {
      filters.push(`type = "${parsed.type}"`);
    }
    if (parsed.category) {
      filters.push(`categories = "${parsed.category}"`);
    }
    if (parsed.minPrice !== undefined) {
      filters.push(`price >= ${parsed.minPrice}`);
    }
    if (parsed.maxPrice !== undefined) {
      filters.push(`price <= ${parsed.maxPrice}`);
    }

    const results = await meili.index(PRODUCT_INDEX).search(parsed.q, {
      limit: parsed.limit,
      offset: (parsed.page - 1) * parsed.limit,
      filter: filters.length > 0 ? filters.join(' AND ') : undefined,
      attributesToRetrieve: ['id', 'name', 'slug', 'type', 'price', 'imageUrl', 'categories', 'isFeatured'],
      attributesToHighlight: ['name', 'description'],
    });

    return NextResponse.json({
      items: results.hits,
      total: results.estimatedTotalHits ?? 0,
      page: parsed.page,
      limit: parsed.limit,
      totalPages: Math.ceil((results.estimatedTotalHits ?? 0) / parsed.limit),
      processingTimeMs: results.processingTimeMs,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: err.errors }, { status: 400 });
    }
    console.error('[GET /api/search]', err);
    return NextResponse.json({ error: 'Search unavailable' }, { status: 503 });
  }
}
