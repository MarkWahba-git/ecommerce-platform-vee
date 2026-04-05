'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Metadata } from 'next';

// Note: metadata export is not supported from client components;
// the title is set in the layout title template.

interface BundleItemInput {
  productId: string;
  variantId: string;
  quantity: number;
}

const EMPTY_ITEM: BundleItemInput = { productId: '', variantId: '', quantity: 1 };

export default function NewBundlePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [items, setItems] = useState<BundleItemInput[]>([{ ...EMPTY_ITEM }]);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Item helpers
  // ---------------------------------------------------------------------------

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof BundleItemInput, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: field === 'quantity' ? Number(value) : value } : item,
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      name: name.trim(),
      sku: sku.trim(),
      description: description.trim(),
      shortDescription: shortDescription.trim() || undefined,
      price: parseFloat(price),
      compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : undefined,
      items: items
        .filter((item) => item.productId.trim())
        .map((item) => ({
          productId: item.productId.trim(),
          variantId: item.variantId.trim() || undefined,
          quantity: Math.max(1, item.quantity),
        })),
    };

    if (!payload.name || !payload.sku || !payload.description || isNaN(payload.price)) {
      setError('Name, SKU, description and price are required.');
      return;
    }
    if (payload.items.length === 0) {
      setError('Add at least one product item to the bundle.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/bundles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'Failed to create bundle');
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

  // ---------------------------------------------------------------------------
  // Estimated savings indicator
  // ---------------------------------------------------------------------------

  const bundlePrice = parseFloat(price) || 0;
  const comparePrice = parseFloat(compareAtPrice) || 0;
  const savings = comparePrice > bundlePrice ? comparePrice - bundlePrice : 0;
  const savingsPct =
    comparePrice > 0 && savings > 0 ? ((savings / comparePrice) * 100).toFixed(1) : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">New Bundle</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Create a product bundle. Reference existing products by their ID.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error banner */}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Bundle details */}
        <fieldset className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <legend className="px-1 text-sm font-semibold text-gray-900">Bundle Details</legend>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-gray-700">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Starter Kit Bundle"
              />
            </div>
            <div>
              <label htmlFor="sku" className="block text-xs font-medium text-gray-700">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                id="sku"
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="BUNDLE-001"
              />
            </div>
          </div>

          <div>
            <label htmlFor="shortDescription" className="block text-xs font-medium text-gray-700">
              Short Description
            </label>
            <input
              id="shortDescription"
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Brief one-liner shown in listings"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Describe what's included in this bundle…"
            />
          </div>
        </fieldset>

        {/* Pricing */}
        <fieldset className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <legend className="px-1 text-sm font-semibold text-gray-900">Pricing</legend>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="price" className="block text-xs font-medium text-gray-700">
                Bundle Price (€) <span className="text-red-500">*</span>
              </label>
              <input
                id="price"
                type="number"
                required
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="29.99"
              />
            </div>
            <div>
              <label htmlFor="compareAtPrice" className="block text-xs font-medium text-gray-700">
                Compare-At Price (€)
                <span className="ml-1 text-gray-400 text-xs">(sum of individual prices)</span>
              </label>
              <input
                id="compareAtPrice"
                type="number"
                min="0"
                step="0.01"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="39.99"
              />
            </div>
          </div>

          {savingsPct && (
            <p className="flex items-center gap-2 text-sm text-green-700">
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
                <path d="M20 12V22H4V12" />
                <path d="M22 7H2v5h20V7z" />
                <path d="M12 22V7" />
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
              </svg>
              Customers save €{savings.toFixed(2)} ({savingsPct}% off)
            </p>
          )}
        </fieldset>

        {/* Bundle items */}
        <fieldset className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <legend className="px-1 text-sm font-semibold text-gray-900">Bundle Items</legend>
            <button
              type="button"
              onClick={addItem}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-900"
            >
              + Add item
            </button>
          </div>

          <p className="text-xs text-gray-400">
            Enter the product ID (cuid) for each item. Variant ID is optional — leave blank to use
            the base product.
          </p>

          {items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_1fr_80px_32px] items-end gap-2"
            >
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Product ID {index === 0 && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={item.productId}
                  onChange={(e) => updateItem(index, 'productId', e.target.value)}
                  placeholder="clxxxxx…"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Variant ID</label>
                <input
                  type="text"
                  value={item.variantId}
                  onChange={(e) => updateItem(index, 'variantId', e.target.value)}
                  placeholder="optional"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Qty</label>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="pb-0.5">
                <button
                  type="button"
                  onClick={() => removeItem(index)}
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
        </fieldset>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
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
            {isPending ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Creating…
              </>
            ) : (
              'Create Bundle'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
