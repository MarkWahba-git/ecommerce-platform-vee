import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@vee/db';

export const metadata: Metadata = { title: 'SEO' };

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function getSeoData() {
  const [productMeta, categoryMeta, blogMeta, pageMeta] = await Promise.all([
    db.seoMeta.findMany({
      where: { productId: { not: null } },
      include: { product: { select: { id: true, name: true, slug: true } } },
      orderBy: { product: { name: 'asc' } },
    }),
    db.seoMeta.findMany({
      where: { categoryId: { not: null } },
      include: { category: { select: { id: true, name: true, slug: true } } },
      orderBy: { category: { name: 'asc' } },
    }),
    db.seoMeta.findMany({
      where: { blogPostId: { not: null } },
      include: { blogPost: { select: { id: true, title: true, slug: true } } },
      orderBy: { blogPost: { title: 'asc' } },
    }),
    db.seoMeta.findMany({
      where: { pageSlug: { not: null } },
      orderBy: { pageSlug: 'asc' },
    }),
  ]);

  return { productMeta, categoryMeta, blogMeta, pageMeta };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function DescLengthIndicator({ text }: { text: string | null | undefined }) {
  const len = text?.length ?? 0;
  if (len === 0) {
    return <span className="text-xs text-gray-400">No description</span>;
  }
  const color =
    len < 50
      ? 'text-orange-600'
      : len <= 160
      ? 'text-green-600'
      : 'text-red-600';
  const label =
    len < 50 ? 'Too short' : len <= 160 ? 'Good' : 'Too long';

  return (
    <span className={`text-xs font-medium ${color}`}>
      {len} chars · {label}
    </span>
  );
}

function NoIndexBadge({ noIndex }: { noIndex: boolean }) {
  if (!noIndex) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
      noindex
    </span>
  );
}

type SeoRow = {
  id: string;
  metaTitle: string | null;
  metaDescription: string | null;
  noIndex: boolean;
  entityName: string;
  editHref: string;
};

function SeoTable({
  title,
  rows,
  emptyMessage,
}: {
  title: string;
  rows: SeoRow[];
  emptyMessage: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
        <h3 className="text-sm font-semibold text-gray-900">
          {title}
          <span className="ml-2 text-xs font-normal text-gray-500">
            ({rows.length})
          </span>
        </h3>
      </div>
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50/50">
          <tr>
            <th className="py-2.5 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Entity
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Meta Title
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Description
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Flags
            </th>
            <th className="relative py-2.5 pl-3 pr-6">
              <span className="sr-only">Edit</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 bg-white">
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="py-3 pl-6 pr-3">
                <p className="text-sm font-medium text-gray-900">{row.entityName}</p>
              </td>
              <td className="px-3 py-3">
                {row.metaTitle ? (
                  <p className="max-w-xs truncate text-sm text-gray-700">{row.metaTitle}</p>
                ) : (
                  <span className="text-xs text-gray-400">Not set</span>
                )}
              </td>
              <td className="px-3 py-3">
                <DescLengthIndicator text={row.metaDescription} />
              </td>
              <td className="px-3 py-3">
                <NoIndexBadge noIndex={row.noIndex} />
              </td>
              <td className="whitespace-nowrap py-3 pl-3 pr-6 text-right text-sm">
                <Link
                  href={row.editHref}
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
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SeoPage() {
  const { productMeta, categoryMeta, blogMeta, pageMeta } = await getSeoData();

  const productRows: SeoRow[] = productMeta.map((m) => ({
    id: m.id,
    metaTitle: m.metaTitle,
    metaDescription: m.metaDescription,
    noIndex: m.noIndex,
    entityName: m.product?.name ?? 'Unknown Product',
    editHref: `/products/${m.product?.id}/edit?tab=seo`,
  }));

  const categoryRows: SeoRow[] = categoryMeta.map((m) => ({
    id: m.id,
    metaTitle: m.metaTitle,
    metaDescription: m.metaDescription,
    noIndex: m.noIndex,
    entityName: m.category?.name ?? 'Unknown Category',
    editHref: `/categories/${m.category?.id}/edit?tab=seo`,
  }));

  const blogRows: SeoRow[] = blogMeta.map((m) => ({
    id: m.id,
    metaTitle: m.metaTitle,
    metaDescription: m.metaDescription,
    noIndex: m.noIndex,
    entityName: m.blogPost?.title ?? 'Unknown Post',
    editHref: `/content/${m.blogPost?.id}/edit?tab=seo`,
  }));

  const pageRows: SeoRow[] = pageMeta.map((m) => ({
    id: m.id,
    metaTitle: m.metaTitle,
    metaDescription: m.metaDescription,
    noIndex: m.noIndex,
    entityName: m.pageSlug ?? '/',
    editHref: `/seo/pages/${m.id}/edit`,
  }));

  const totalRecords =
    productRows.length + categoryRows.length + blogRows.length + pageRows.length;
  const missingMeta = [
    ...productRows,
    ...categoryRows,
    ...blogRows,
    ...pageRows,
  ].filter((r) => !r.metaTitle || !r.metaDescription).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">SEO</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {totalRecords} SEO record{totalRecords !== 1 ? 's' : ''}
            {missingMeta > 0 && (
              <span className="ml-2 text-orange-600">
                {missingMeta} missing title or description
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Products', count: productRows.length },
          { label: 'Categories', count: categoryRows.length },
          { label: 'Blog Posts', count: blogRows.length },
          { label: 'Pages', count: pageRows.length },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{card.count}</p>
          </div>
        ))}
      </div>

      {/* Tables by group */}
      <SeoTable
        title="Products"
        rows={productRows}
        emptyMessage="No product SEO records. Add SEO data when editing a product."
      />
      <SeoTable
        title="Categories"
        rows={categoryRows}
        emptyMessage="No category SEO records."
      />
      <SeoTable
        title="Blog Posts"
        rows={blogRows}
        emptyMessage="No blog post SEO records."
      />
      <SeoTable
        title="Pages"
        rows={pageRows}
        emptyMessage="No page SEO records."
      />
    </div>
  );
}
