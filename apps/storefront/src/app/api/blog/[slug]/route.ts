import { NextRequest, NextResponse } from 'next/server';
import { db } from '@vee/db';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    const post = await db.blogPost.findUnique({
      where: { slug },
      include: { seoMeta: true },
    });

    if (!post || post.status !== 'published') {
      return NextResponse.json({ error: 'Beitrag nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (err) {
    console.error('[GET /api/blog/[slug]]', err);
    return NextResponse.json({ error: 'Beitrag konnte nicht geladen werden' }, { status: 500 });
  }
}
