'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  reviewId: string;
  isApproved: boolean;
}

export function ReviewDetailClient({ reviewId, isApproved }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleAction(action: 'approve' | 'reject') {
    setError(null);
    const res = await fetch(`/api/reviews/${reviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? 'Action failed.');
      return;
    }
    startTransition(() => router.refresh());
  }

  async function handleDelete() {
    setError(null);
    const res = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? 'Delete failed.');
      setShowDeleteConfirm(false);
      return;
    }
    router.push('/reviews');
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      {/* Moderation actions */}
      <div className="flex flex-wrap items-center gap-3">
        {!isApproved && (
          <button
            onClick={() => handleAction('approve')}
            disabled={isPending}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
          >
            {isPending ? 'Approving…' : 'Approve Review'}
          </button>
        )}
        {isApproved && (
          <button
            onClick={() => handleAction('reject')}
            disabled={isPending}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500 disabled:opacity-50"
          >
            {isPending ? 'Rejecting…' : 'Reject Review'}
          </button>
        )}

        <div className="ml-auto">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isPending}
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50 disabled:opacity-50"
            >
              Delete Permanently
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-2 ring-1 ring-inset ring-red-200">
              <span className="text-sm text-red-700">Are you sure? This cannot be undone.</span>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
