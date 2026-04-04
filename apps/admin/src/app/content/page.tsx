import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@vee/db';

export const metadata: Metadata = { title: 'Content' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  if (status === 'published') {
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
        Published
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
      Draft
    </span>
  );
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function getBlogPosts() {
  return db.blogPost.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      authorName: true,
      publishedAt: true,
      createdAt: true,
      tags: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ContentPage() {
  const posts = await getBlogPosts();

  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const draftCount = posts.filter((p) => p.status !== 'published').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Content / Blog</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {posts.length} post{posts.length !== 1 ? 's' : ''}
            {publishedCount > 0 && (
              <span className="ml-2 text-green-600">{publishedCount} published</span>
            )}
            {draftCount > 0 && (
              <span className="ml-2 text-gray-400">{draftCount} draft{draftCount !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <Link
          href="/content/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          + New Post
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:pl-6">
                Title
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Author
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Published
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tags
              </th>
              <th className="relative py-3 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {posts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-gray-500">
                  No blog posts yet.{' '}
                  <Link href="/content/new" className="text-indigo-600 hover:underline">
                    Write your first post.
                  </Link>
                </td>
              </tr>
            )}
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-gray-50">
                <td className="py-3 pl-4 pr-3 sm:pl-6">
                  <p className="text-sm font-medium text-gray-900">{post.title}</p>
                  <p className="text-xs font-mono text-gray-400">/{post.slug}</p>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-sm">
                  <StatusBadge status={post.status} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-600">
                  {post.authorName ?? '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
                  {formatDate(post.publishedAt)}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                    {post.tags.length > 3 && (
                      <span className="text-xs text-gray-400">+{post.tags.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap py-3 pl-3 pr-4 text-right text-sm sm:pr-6">
                  <Link
                    href={`/content/${post.id}/edit`}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
