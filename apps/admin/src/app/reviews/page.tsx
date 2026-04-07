import type { Metadata } from 'next';
import Link from 'next/link';
import { reviewService } from '@vee/core';
import { ReviewModerationClient } from './_components/ReviewModerationClient';

export const metadata: Metadata = { title: 'Review Moderation' };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchParams {
  status?: string;
  page?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-white px-5 py-4 shadow-sm ${
        highlight ? 'border-amber-300 ring-1 ring-amber-300' : 'border-gray-200'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          highlight ? 'text-amber-600' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { status, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? '1', 10));
  const filterStatus = status === 'pending' || status === 'approved' ? status : undefined;

  const [{ items, total, totalPages }, stats] = await Promise.all([
    reviewService.list({ status: filterStatus, page, limit: 25 }),
    reviewService.getStats(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Review Moderation</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Manage customer reviews before they appear on the storefront.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Reviews" value={stats.total} />
        <StatCard label="Pending" value={stats.pending} highlight={stats.pending > 0} />
        <StatCard label="Approved" value={stats.approved} />
        <StatCard label="Avg. Rating" value={stats.averageRating > 0 ? `${stats.averageRating} / 5` : '—'} />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        <FilterTab href="/reviews" label="All" active={!filterStatus} />
        <FilterTab href="/reviews?status=pending" label="Pending" active={filterStatus === 'pending'} count={stats.pending} />
        <FilterTab href="/reviews?status=approved" label="Approved" active={filterStatus === 'approved'} />
      </div>

      {/* Client component handles selection + bulk actions */}
      <ReviewModerationClient
        reviews={items.map((r: typeof items[number]) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          body: r.body,
          isApproved: r.isApproved,
          isVerified: r.isVerified,
          createdAt: r.createdAt.toISOString(),
          product: r.product
            ? { id: r.product.id, name: r.product.name, slug: r.product.slug }
            : null,
          customer: r.customer
            ? {
                id: r.customer.id,
                firstName: r.customer.firstName,
                lastName: r.customer.lastName,
                email: r.customer.email,
              }
            : null,
        }))}
        pagination={{ page, totalPages, total, filterStatus }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterTab helper
// ---------------------------------------------------------------------------

function FilterTab({
  href,
  label,
  active,
  count,
}: {
  href: string;
  label: string;
  active: boolean;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
      }`}
    >
      {label}
      {count != null && count > 0 && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
            active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
