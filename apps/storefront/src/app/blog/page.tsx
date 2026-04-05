import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@vee/db';

export const revalidate = 3600;

const PAGE_SIZE = 12;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vee-handmade.de';

interface BlogPageProps {
  searchParams: Promise<{ page?: string; tag?: string }>;
}

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const { tag } = await searchParams;
  const title = tag ? `Blog – ${tag} | Vee` : 'Blog | Vee';
  const description = tag
    ? `Beiträge zum Thema ${tag} – Handwerk, Inspiration und Neuigkeiten von Vee Handmade.`
    : 'Handwerk, Inspiration und Neuigkeiten von Vee Handmade.';

  return {
    title,
    description,
    alternates: {
      canonical: tag ? `${SITE_URL}/blog?tag=${encodeURIComponent(tag)}` : `${SITE_URL}/blog`,
    },
    openGraph: { title, description, type: 'website' },
  };
}

function formatDate(date: Date | string | null) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const tag = params.tag ?? undefined;
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    status: 'published',
    ...(tag ? { tags: { has: tag } } : {}),
  };

  const [posts, total] = await Promise.all([
    db.blogPost.findMany({
      where,
      select: {
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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold mb-2">Blog</h1>
        {tag ? (
          <p className="text-gray-600">
            Beiträge zum Thema <strong>{tag}</strong> —{' '}
            <Link href="/blog" className="underline text-sm">
              Alle Beiträge
            </Link>
          </p>
        ) : (
          <p className="text-gray-600">
            Handwerk, Inspiration und Neuigkeiten von Vee Handmade.
          </p>
        )}
      </div>

      {posts.length === 0 ? (
        <p className="text-gray-500">Keine Beiträge gefunden.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <article key={post.slug} className="group flex flex-col">
              {post.coverImage && (
                <Link href={`/blog/${post.slug}`} className="block overflow-hidden rounded-lg mb-4">
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    width={600}
                    height={400}
                    className="w-full object-cover aspect-[3/2] group-hover:scale-105 transition-transform duration-300"
                  />
                </Link>
              )}
              <div className="flex flex-col flex-1">
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {post.tags.map((t) => (
                      <Link
                        key={t}
                        href={`/blog?tag=${encodeURIComponent(t)}`}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-0.5 rounded transition-colors"
                      >
                        {t}
                      </Link>
                    ))}
                  </div>
                )}
                <Link href={`/blog/${post.slug}`}>
                  <h2 className="text-lg font-semibold mb-2 group-hover:underline leading-snug">
                    {post.title}
                  </h2>
                </Link>
                {post.excerpt && (
                  <p className="text-gray-600 text-sm leading-relaxed mb-3 flex-1">
                    {post.excerpt}
                  </p>
                )}
                <div className="text-xs text-gray-400 mt-auto">
                  {post.authorName && <span>{post.authorName} · </span>}
                  <time dateTime={post.publishedAt?.toISOString()}>
                    {formatDate(post.publishedAt)}
                  </time>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-12 flex justify-center gap-2" aria-label="Seitennavigation">
          {page > 1 && (
            <Link
              href={`/blog?${tag ? `tag=${encodeURIComponent(tag)}&` : ''}page=${page - 1}`}
              className="px-4 py-2 border rounded text-sm hover:bg-gray-50 transition-colors"
            >
              ← Zurück
            </Link>
          )}
          <span className="px-4 py-2 text-sm text-gray-500">
            Seite {page} von {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/blog?${tag ? `tag=${encodeURIComponent(tag)}&` : ''}page=${page + 1}`}
              className="px-4 py-2 border rounded text-sm hover:bg-gray-50 transition-colors"
            >
              Weiter →
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
