'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { BundleDetail, BundleItem } from '@vee/core';

interface Props {
  bundle: BundleDetail;
}

export function BundleEditForm({ bundle }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useTransition();

  const [price, setPrice] = useState(bundle.product.basePrice);
  const [status, setStatus] = useState(bundle.product.status);
  const [items, setItems] = useState<(BundleItem & { _key: number })[]>(
    bundle.items.map((item, i) => ({
      productId: item.product.id,
      variantId: item.variant?.id,
      quantity: item.quantity,
      _key: i,
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  let nextKey = items.length;

  function addItem() {
    setItems((prev) => [...prev, { productId: '', quantity: 1, _key: nextKey++ }]);
  }

  function removeItem(key: number) {
    setItems((prev) => prev.filter((item) => item._key !== key));
  }

  function updateItem(key: number, field: keyof BundleItem, value: string | number) {
    setItems((prev) =>
      prev.map((item) =>
        item._key === key
          ? { ...item, [field]: field === 'quantity' ? Number(value) : value || undefined }
          : item,
      ),
    );
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanItems = items
      .filter((item) => item.productId?.trim())
      .map(({ productId, variantId, quantity }) => ({
        productId: productId.trim(),
        variantId: variantId?.trim() || undefined,
        quantity: Math.max(1, quantity),
      }));

    if (cleanItems.length === 0) {
      setError('At least one item is required.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/bundles/${bundle.product.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            price: parseFloat(price),
            status,
            items: cleanItems,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'Failed to update bundle');
          return;
        }
        setSuccess('Bundle updated successfully.');
        router.refresh();
      } catch (err) {
        setError('Unexpected error. Please try again.');
        console.error(err);
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Archive "${bundle.product.name}"? It will no longer be visible in the storefront.`)) {
      return;
    }
    setIsDeleting(async () => {
      try {
        const res = await fetch(`/api/bundles/${bundle.product.id}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? 'Failed to archive bundle');
          return;
        }
        router.push('/bundles');
        router.refresh();
      } catch (err) {
        setError('Unexpected error. Please try again.');
        console.error(err);
      }
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Edit Bundle</h3>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="edit-price" className="block text-xs font-medium text-gray-700">
              Bundle Price (€)
            </label>
            <input
              id="edit-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="edit-status" className="block text-xs font-medium text-gray-700">
              Status
            </label>
            <select
              id="edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        {/* Items editor */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700">Items</p>
            <button
              type="button"
              onClick={addItem}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-900"
            >
              + Add item
            </button>
          </div>
          {items.map((item) => (
            <div key={item._key} className="grid grid-cols-[1fr_1fr_80px_32px] items-end gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600">Product ID</label>
                <input
                  type="text"
                  value={item.productId}
                  onChange={(e) => updateItem(item._key, 'productId', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 font-mono text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Variant ID</label>
                <input
                  type="text"
                  value={item.variantId ?? ''}
                  onChange={(e) => updateItem(item._key, 'variantId', e.target.value)}
                  placeholder="optional"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 font-mono text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Qty</label>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(item._key, 'quantity', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="pb-0.5">
                <button
                  type="button"
                  onClick={() => removeItem(item._key)}
                  disabled={items.length === 1}
                  className="rounded p-1 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Remove item"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting || bundle.product.status === 'ARCHIVED'}
          className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? 'Archiving…' : 'Archive Bundle'}
        </button>

        <div className="flex items-center gap-3">
          <a
            href="/bundles"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </a>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}
