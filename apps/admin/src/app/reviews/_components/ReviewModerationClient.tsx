'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReviewRow {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isApproved: boolean;
  isVerified: boolean;
  createdAt: string;
  product: { id: string; name: string; slug: string } | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface Pagination {
  page: number;
  totalPages: number;
  total: number;
  filterStatus?: string;
}

interface Props {
  reviews: ReviewRow[];
  pagination: Pagination;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`h-3.5 w-3.5 ${s <= rating ? 'text-amber-400' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function StatusBadge({ isApproved }: { isApproved: boolean }) {
  return isApproved ? (
    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
      Approved
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
      Pending
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReviewModerationClient({ reviews, pagination }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  const allIds = reviews.map((r) => r.id);
  const allChecked = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someChecked = selected.size > 0;

  function toggleAll() {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleRowAction(id: string, action: 'approve' | 'reject') {
    setActionError(null);
    const res = await fetch(`/api/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(data?.error ?? 'Action failed.');
      return;
    }
    startTransition(() => router.refresh());
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function handleBulkAction(action: 'approve' | 'reject') {
    if (selected.size === 0) return;
    setActionError(null);
    const res = await fetch('/api/reviews/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected), action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(data?.error ?? 'Bulk action failed.');
      return;
    }
    setSelected(new Set());
    startTransition(() => router.refresh());
  }

  const { page, totalPages, total, filterStatus } = pagination;
  const pageBase = filterStatus ? `/reviews?status=${filterStatus}&` : '/reviews?';

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {actionError}
        </div>
      )}

      {/* Bulk action bar */}
      {someChecked && (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5">
          <span className="text-sm font-medium text-indigo-700">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkAction('approve')}
              disabled={isPending}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
            >
              Approve All
            </button>
            <button
              onClick={() => handleBulkAction('reject')}
              disabled={isPending}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
            >
              Reject All
            </button>
          </div>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-indigo-500 hover:text-indigo-700"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 py-3 pl-4 pr-0">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  aria-label="Select all"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Product
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Customer
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Rating
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Review
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Date
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="relative px-3 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {reviews.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-gray-500">
                  No reviews found.
                </td>
              </tr>
            )}
            {reviews.map((review) => {
              const customerName = review.customer
                ? `${review.customer.firstName} ${review.customer.lastName}`.trim()
                : '—';
              const excerpt = review.body ? review.body.slice(0, 100) + (review.body.length > 100 ? '…' : '') : '';

              return (
                <tr key={review.id} className={`hover:bg-gray-50 ${selected.has(review.id) ? 'bg-indigo-50/40' : ''}`}>
                  <td className="w-10 py-3 pl-4 pr-0">
                    <input
                      type="checkbox"
                      checked={selected.has(review.id)}
                      onChange={() => toggleOne(review.id)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      aria-label={`Select review by ${customerName}`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    {review.product ? (
                      <Link
                        href={`/products/${review.product.id}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                      >
                        {review.product.name}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {review.customer ? (
                      <Link
                        href={`/customers/${review.customer.id}`}
                        className="text-sm text-gray-900 hover:text-indigo-600"
                      >
                        {customerName}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                    {review.isVerified && (
                      <p className="text-xs text-teal-600">Verified purchase</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <StarRating rating={review.rating} />
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/reviews/${review.id}`} className="group block max-w-xs">
                      {review.title && (
                        <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 line-clamp-1">
                          {review.title}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 line-clamp-2">{excerpt}</p>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-gray-500">
                    {new Date(review.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <StatusBadge isApproved={review.isApproved} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!review.isApproved && (
                        <button
                          onClick={() => handleRowAction(review.id, 'approve')}
                          disabled={isPending}
                          className="rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 hover:bg-green-100 disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}
                      {review.isApproved && (
                        <button
                          onClick={() => handleRowAction(review.id, 'reject')}
                          disabled={isPending}
                          className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 hover:bg-red-100 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}
                      <Link
                        href={`/reviews/${review.id}`}
                        className="text-xs text-indigo-600 hover:text-indigo-900"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <p>{total} total review{total !== 1 ? 's' : ''}</p>
          <div className="flex gap-1">
            {page > 1 && (
              <Link
                href={`${pageBase}page=${page - 1}`}
                className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            <span className="px-3 py-1.5 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`${pageBase}page=${page + 1}`}
                className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
