import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { db } from '@vee/db';
import { JsonLd } from '@/components/seo/JsonLd';

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vee-handmade.de';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

// ---------------------------------------------------------------------------
// Static params for ISR
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const posts = await db.blogPost.findMany({
    where: { status: 'published' },
    select: { slug: true },
  });
  return posts.map((p) => ({ slug: p.slug }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.blogPost.findUnique({
    where: { slug },
    include: { seoMeta: true },
  });

  if (!post || post.status !== 'published') return { title: 'Beitrag nicht gefunden' };

  const title = post.seoMeta?.metaTitle ?? post.title;
  const description = post.seoMeta?.metaDescription ?? post.excerpt ?? post.content.slice(0, 160);

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/blog/${slug}` },
    openGraph: {
      title: post.seoMeta?.ogTitle ?? title,
      description: post.seoMeta?.ogDescription ?? description,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      authors: post.authorName ? [post.authorName] : undefined,
      images: post.seoMeta?.ogImage
        ? [{ url: post.seoMeta.ogImage }]
        : post.coverImage
          ? [{ url: post.coverImage, alt: post.title }]
          : [],
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date | null) {
  if (!date) return '';
  return date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;

  const post = await db.blogPost.findUnique({
    where: { slug },
    include: { seoMeta: true },
  });

  if (!post || post.status !== 'published') notFound();

  // Related posts: same tags, excluding this post
  const relatedPosts =
    post.tags.length > 0
      ? await db.blogPost.findMany({
          where: {
            status: 'published',
            slug: { not: slug },
            tags: { hasSome: post.tags },
          },
          select: {
            slug: true,
            title: true,
            excerpt: true,
            coverImage: true,
            publishedAt: true,
            tags: true,
          },
          orderBy: { publishedAt: 'desc' },
          take: 3,
        })
      : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.coverImage ?? undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      '@type': 'Person',
      name: post.authorName ?? 'Vee',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Vee Handmade',
      url: SITE_URL,
    },
    url: `${SITE_URL}/blog/${slug}`,
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <article className="max-w-3xl mx-auto px-4 py-12">
        {/* Hero image */}
        {post.coverImage && (
          <div className="w-full overflow-hidden rounded-xl mb-8">
            <Image
              src={post.coverImage}
              alt={post.title}
              width={1200}
              height={630}
              className="w-full object-cover aspect-[16/9]"
              priority
            />
          </div>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/blog?tag=${encodeURIComponent(tag)}`}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl font-semibold leading-tight mb-4">{post.title}</h1>

        {/* Meta */}
        <div className="flex items-center gap-3 text-sm text-gray-500 mb-8">
          {post.authorName && <span>{post.authorName}</span>}
          {post.authorName && post.publishedAt && <span aria-hidden>·</span>}
          {post.publishedAt && (
            <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt)}</time>
          )}
        </div>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-lg text-gray-600 leading-relaxed mb-8 font-medium">{post.excerpt}</p>
        )}

        {/* Content — rendered as HTML from rich-text CMS */}
        <div
          className="prose prose-gray max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <div className="mt-10 pt-8 border-t">
          <Link href="/blog" className="text-sm underline text-gray-600">
            ← Alle Beiträge
          </Link>
        </div>
      </article>

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <h2 className="text-xl font-semibold mb-6">Ähnliche Beiträge</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedPosts.map((related) => (
              <article key={related.slug} className="group">
                {related.coverImage && (
                  <Link
                    href={`/blog/${related.slug}`}
                    className="block overflow-hidden rounded-lg mb-3"
                  >
                    <Image
                      src={related.coverImage}
                      alt={related.title}
                      width={600}
                      height={400}
                      className="w-full object-cover aspect-[3/2] group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                )}
                <Link href={`/blog/${related.slug}`}>
                  <h3 className="font-medium group-hover:underline leading-snug mb-1">
                    {related.title}
                  </h3>
                </Link>
                {related.excerpt && (
                  <p className="text-sm text-gray-600 line-clamp-2">{related.excerpt}</p>
                )}
                {related.publishedAt && (
                  <time
                    dateTime={related.publishedAt.toISOString()}
                    className="text-xs text-gray-400 mt-2 block"
                  >
                    {formatDate(related.publishedAt)}
                  </time>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
