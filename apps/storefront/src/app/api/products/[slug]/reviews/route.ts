import { NextRequest, NextResponse } from 'next/server';
import { db } from '@vee/db';
import { z } from 'zod';
import { cookies } from 'next/headers';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

const reviewQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  body: z.string().max(5000).optional(),
});

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    const product = await db.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const { searchParams } = req.nextUrl;
    const { page, limit } = reviewQuerySchema.parse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where: { productId: product.id, isApproved: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { firstName: true, lastName: true } },
        },
      }),
      db.review.count({ where: { productId: product.id, isApproved: true } }),
    ]);

    const avgRating =
      total > 0
        ? await db.review
            .aggregate({
              where: { productId: product.id, isApproved: true },
              _avg: { rating: true },
            })
            .then((r) => r._avg.rating)
        : null;

    return NextResponse.json({
      items: reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      avgRating,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: err.errors }, { status: 400 });
    }
    console.error('[GET /api/products/[slug]/reviews]', err);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    // Auth: require customerId cookie (set on login — NextAuth integration pending)
    const cookieStore = await cookies();
    const customerId = cookieStore.get('customerId')?.value;

    if (!customerId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const product = await db.product.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });

    if (!product || product.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const body = await req.json();
    const input = createReviewSchema.parse(body);

    // Verify customer exists
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 401 });
    }

    // Check if customer already reviewed this product
    const existing = await db.review.findUnique({
      where: { productId_customerId: { productId: product.id, customerId } },
    });

    if (existing) {
      return NextResponse.json({ error: 'You have already reviewed this product' }, { status: 409 });
    }

    // Check if customer has purchased the product (verified review)
    const hasPurchased = await db.orderItem.findFirst({
      where: {
        productId: product.id,
        order: { customerId, status: { in: ['DELIVERED', 'COMPLETED'] } },
      },
      select: { id: true },
    });

    const review = await db.review.create({
      data: {
        productId: product.id,
        customerId,
        rating: input.rating,
        title: input.title,
        body: input.body,
        isVerified: !!hasPurchased,
        isApproved: false, // Requires admin moderation
      },
      include: {
        customer: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: err.errors }, { status: 400 });
    }
    console.error('[POST /api/products/[slug]/reviews]', err);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
