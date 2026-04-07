import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { reviewService } from '@vee/core';
import { ReviewDetailClient } from './_components/ReviewDetailClient';

export const metadata: Metadata = { title: 'Review Detail' };

interface Params {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`h-5 w-5 ${s <= rating ? 'text-amber-400' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-sm font-medium text-gray-700">{rating} / 5</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ReviewDetailPage({ params }: Params) {
  const { id } = await params;
  const review = await reviewService.getById(id);

  if (!review) notFound();

  const customerName = review.customer
    ? `${review.customer.firstName} ${review.customer.lastName}`.trim()
    : 'Unknown Customer';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link href="/reviews" className="text-sm text-gray-500 hover:text-gray-900">
          ← Reviews
        </Link>
        <h2 className="mt-1 text-xl font-semibold text-gray-900">Review Detail</h2>
      </div>

      {/* Status banner */}
      <div
        className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${
          review.isApproved
            ? 'bg-green-50 text-green-800 ring-1 ring-inset ring-green-600/20'
            : 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20'
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            review.isApproved ? 'bg-green-500' : 'bg-amber-500'
          }`}
        />
        {review.isApproved ? 'Approved — visible on storefront' : 'Pending — not yet visible on storefront'}
        {review.isVerified && (
          <span className="ml-auto rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
            Verified purchase
          </span>
        )}
      </div>

      {/* Review content */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Review Content</h3>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <StarRating rating={review.rating} />
          </div>
          {review.title && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Title</p>
              <p className="mt-1 text-base font-semibold text-gray-900">{review.title}</p>
            </div>
          )}
          {review.body && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Body</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                {review.body}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Submitted</p>
            <p className="mt-1 text-sm text-gray-700">
              {new Date(review.createdAt).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Product info */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Product</h3>
        </div>
        <div className="px-6 py-5">
          {review.product ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{review.product.name}</p>
                <p className="text-xs text-gray-500">slug: {review.product.slug}</p>
              </div>
              <Link
                href={`/products/${review.product.id}`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
              >
                View product →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Product not found.</p>
          )}
        </div>
      </div>

      {/* Customer info */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Customer</h3>
        </div>
        <div className="px-6 py-5">
          {review.customer ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{customerName}</p>
                <p className="text-xs text-gray-500">{review.customer.email}</p>
              </div>
              <Link
                href={`/customers/${review.customer.id}`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
              >
                View customer →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Customer not found.</p>
          )}
        </div>
      </div>

      {/* Actions (client component for mutations) */}
      <ReviewDetailClient reviewId={review.id} isApproved={review.isApproved} />
    </div>
  );
}
