'use client';

import type { Metadata } from 'next';
import { useState, useId } from 'react';
import { useRouter } from 'next/navigation';
import { PRODUCT_TYPES, type ProductType } from '@vee/shared';

// ---------------------------------------------------------------------------
// Product creation form (client component)
// ---------------------------------------------------------------------------

const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string; description: string }[] = [
  {
    value: 'PHYSICAL',
    label: 'Physical',
    description: 'A tangible item that ships to the customer.',
  },
  {
    value: 'DIGITAL',
    label: 'Digital',
    description: 'A downloadable file or digital delivery.',
  },
  {
    value: 'PERSONALIZED',
    label: 'Personalized',
    description: 'Made-to-order with custom fields.',
  },
];

interface FormData {
  type: ProductType;
  name: string;
  shortDescription: string;
  description: string;
  basePrice: string;
  compareAtPrice: string;
  sku: string;
  // Physical-specific
  weight: string;
  // Digital-specific
  isInstantDelivery: boolean;
  maxDownloads: string;
  licenseType: string;
  // Personalized-specific
  isMadeToOrder: boolean;
  productionDays: string;
}

const INITIAL_FORM: FormData = {
  type: 'PHYSICAL',
  name: '',
  shortDescription: '',
  description: '',
  basePrice: '',
  compareAtPrice: '',
  sku: '',
  weight: '',
  isInstantDelivery: true,
  maxDownloads: '5',
  licenseType: 'PERSONAL',
  isMadeToOrder: true,
  productionDays: '7',
};

function generateSkuPreview(name: string, type: ProductType): string {
  const prefix = { PHYSICAL: 'PHY', DIGITAL: 'DIG', PERSONALIZED: 'PER' }[type];
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 8);
  return slug ? `VEE-${prefix}-${slug}` : `VEE-${prefix}-???`;
}

function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function Input({ id, value, onChange, placeholder, type = 'text', prefix }: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  prefix?: string;
}) {
  return (
    <div className={`flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-indigo-500 ${prefix ? '' : ''}`}>
      {prefix && (
        <span className="flex select-none items-center pl-3 text-gray-500 sm:text-sm">{prefix}</span>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`block w-full rounded-md border-0 py-1.5 text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6 ${prefix ? 'pl-1' : 'px-3'}`}
      />
    </div>
  );
}

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const descId = useId();
  const shortDescId = useId();

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      // Auto-update SKU preview when name or type changes
      ...(key === 'name' || key === 'type'
        ? { sku: generateSkuPreview(key === 'name' ? (value as string) : prev.name, key === 'type' ? (value as ProductType) : prev.type) }
        : {}),
    }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!form.basePrice || isNaN(Number(form.basePrice)) || Number(form.basePrice) <= 0)
      errs.basePrice = 'A valid price is required.';
    if (form.compareAtPrice && (isNaN(Number(form.compareAtPrice)) || Number(form.compareAtPrice) <= 0))
      errs.compareAtPrice = 'Compare-at price must be a positive number.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          name: form.name.trim(),
          shortDescription: form.shortDescription.trim() || null,
          description: form.description.trim(),
          basePrice: Math.round(Number(form.basePrice) * 100) / 100,
          compareAtPrice: form.compareAtPrice ? Math.round(Number(form.compareAtPrice) * 100) / 100 : null,
          sku: form.sku,
          weight: form.weight ? Number(form.weight) : null,
          isInstantDelivery: form.isInstantDelivery,
          maxDownloads: form.maxDownloads ? Number(form.maxDownloads) : null,
          licenseType: form.licenseType || null,
          isMadeToOrder: form.isMadeToOrder,
          productionDays: form.productionDays ? Number(form.productionDays) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Failed to create product.');
      }
      const created = await res.json() as { id: string };
      router.push(`/products/${created.id}/edit`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">New Product</h2>
          <p className="mt-0.5 text-sm text-gray-500">Fill in the details below to create a new product.</p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Product type selector */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Product Type</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PRODUCT_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('type', opt.value)}
                className={`rounded-lg border-2 p-4 text-left transition-colors ${
                  form.type === opt.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className={`text-sm font-semibold ${form.type === opt.value ? 'text-indigo-700' : 'text-gray-900'}`}>
                  {opt.label}
                </p>
                <p className="mt-1 text-xs text-gray-500">{opt.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Core details */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5">
          <h3 className="text-base font-semibold text-gray-900">Core Details</h3>

          <div className="space-y-1.5">
            <FieldLabel htmlFor="name" required>Product Name</FieldLabel>
            <Input id="name" value={form.name} onChange={(v) => set('name', v)} placeholder="e.g. Handmade Silver Ring" />
            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <FieldLabel htmlFor={shortDescId}>Short Description</FieldLabel>
            <Input id={shortDescId} value={form.shortDescription} onChange={(v) => set('shortDescription', v)} placeholder="One-line product summary…" />
          </div>

          <div className="space-y-1.5">
            <FieldLabel htmlFor={descId}>Description</FieldLabel>
            <textarea
              id={descId}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={5}
              placeholder="Full product description, materials, care instructions…"
              className="block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
            />
          </div>
        </section>

        {/* Pricing & SKU */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5">
          <h3 className="text-base font-semibold text-gray-900">Pricing &amp; SKU</h3>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="basePrice" required>Price (€)</FieldLabel>
              <Input id="basePrice" type="number" value={form.basePrice} onChange={(v) => set('basePrice', v)} placeholder="0.00" prefix="€" />
              {errors.basePrice && <p className="text-xs text-red-600">{errors.basePrice}</p>}
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="compareAtPrice">Compare-at Price (€)</FieldLabel>
              <Input id="compareAtPrice" type="number" value={form.compareAtPrice} onChange={(v) => set('compareAtPrice', v)} placeholder="0.00" prefix="€" />
              {errors.compareAtPrice && <p className="text-xs text-red-600">{errors.compareAtPrice}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <FieldLabel htmlFor="sku">SKU</FieldLabel>
            <Input
              id="sku"
              value={form.sku}
              onChange={(v) => set('sku', v)}
              placeholder="Auto-generated"
            />
            <p className="text-xs text-gray-500">Auto-generated from product name and type. You can override it.</p>
          </div>
        </section>

        {/* Physical-specific fields */}
        {form.type === PRODUCT_TYPES.PHYSICAL && (
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5">
            <h3 className="text-base font-semibold text-gray-900">Shipping</h3>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="weight">Weight (grams)</FieldLabel>
              <Input id="weight" type="number" value={form.weight} onChange={(v) => set('weight', v)} placeholder="e.g. 250" />
            </div>
          </section>
        )}

        {/* Digital-specific fields */}
        {form.type === PRODUCT_TYPES.DIGITAL && (
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5">
            <h3 className="text-base font-semibold text-gray-900">Digital Delivery</h3>

            <div className="flex items-center gap-3">
              <input
                id="isInstantDelivery"
                type="checkbox"
                checked={form.isInstantDelivery}
                onChange={(e) => set('isInstantDelivery', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isInstantDelivery" className="text-sm text-gray-700">
                Instant delivery (file available immediately after purchase)
              </label>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="maxDownloads">Max Downloads</FieldLabel>
                <Input id="maxDownloads" type="number" value={form.maxDownloads} onChange={(v) => set('maxDownloads', v)} placeholder="5" />
              </div>

              <div className="space-y-1.5">
                <FieldLabel htmlFor="licenseType">License Type</FieldLabel>
                <select
                  id="licenseType"
                  value={form.licenseType}
                  onChange={(e) => set('licenseType', e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="PERSONAL">Personal</option>
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="EXTENDED">Extended</option>
                </select>
              </div>
            </div>
          </section>
        )}

        {/* Personalized-specific fields */}
        {form.type === PRODUCT_TYPES.PERSONALIZED && (
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5">
            <h3 className="text-base font-semibold text-gray-900">Made-to-Order</h3>

            <div className="flex items-center gap-3">
              <input
                id="isMadeToOrder"
                type="checkbox"
                checked={form.isMadeToOrder}
                onChange={(e) => set('isMadeToOrder', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isMadeToOrder" className="text-sm text-gray-700">
                This is a made-to-order product
              </label>
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="productionDays">Production Time (days)</FieldLabel>
              <Input id="productionDays" type="number" value={form.productionDays} onChange={(v) => set('productionDays', v)} placeholder="7" />
              <p className="text-xs text-gray-500">Estimated business days to produce this item before shipping.</p>
            </div>
          </section>
        )}

        {/* Error banner */}
        {submitError && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            {submitError}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
          >
            {isSubmitting ? 'Creating…' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
