import { NextRequest, NextResponse } from 'next/server';
import { db } from '@vee/db';

const PAGE_SIZE = 12;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const tag = searchParams.get('tag') ?? undefined;
    const skip = (page - 1) * PAGE_SIZE;

    const where = {
      status: 'published',
      ...(tag ? { tags: { has: tag } } : {}),
    };

    const [items, total] = await Promise.all([
      db.blogPost.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          coverImage: true,
          authorName: true,
          publishedAt: true,
          tags: true,
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: PAGE_SIZE,
      }),
      db.blogPost.count({ where }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      limit: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (err) {
    console.error('[GET /api/blog]', err);
    return NextResponse.json({ error: 'Blog-Beiträge konnten nicht geladen werden' }, { status: 500 });
  }
}
