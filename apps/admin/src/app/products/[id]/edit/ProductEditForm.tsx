'use client';

import { useState, useId, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateSlug } from '@vee/shared';
import type { productService } from '@vee/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Full product shape returned by productService.getById() */
type ProductWithRelations = NonNullable<Awaited<ReturnType<typeof productService.getById>>>;
type ProductImage = ProductWithRelations['images'][number];
type ProductVariant = ProductWithRelations['variants'][number];
type ProductCategory = ProductWithRelations['categories'][number];
type ProductTag = ProductWithRelations['tags'][number];

interface FormState {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  basePrice: string;
  compareAtPrice: string;
  costPrice: string;
  taxRate: string;
  sku: string;
  weight: string;
  width: string;
  height: string;
  length: string;
  isInstantDelivery: boolean;
  maxDownloads: string;
  downloadExpiryDays: string;
  licenseType: string;
  isMadeToOrder: boolean;
  productionDays: string;
  isFeatured: boolean;
  // SEO
  seoMetaTitle: string;
  seoMetaDescription: string;
  seoOgImage: string;
  seoNoIndex: boolean;
}

interface NewVariant {
  name: string;
  sku: string;
  price: string;
  options: string;
}

const INITIAL_NEW_VARIANT: NewVariant = { name: '', sku: '', price: '', options: '{}' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function productToFormState(p: ProductWithRelations): FormState {
  return {
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription ?? '',
    description: p.description,
    basePrice: toStr(p.basePrice),
    compareAtPrice: toStr(p.compareAtPrice ?? ''),
    costPrice: toStr(p.costPrice ?? ''),
    taxRate: toStr(p.taxRate),
    sku: p.sku,
    weight: toStr(p.weight ?? ''),
    width: toStr(p.width ?? ''),
    height: toStr(p.height ?? ''),
    length: toStr(p.length ?? ''),
    isInstantDelivery: p.isInstantDelivery,
    maxDownloads: toStr(p.maxDownloads ?? ''),
    downloadExpiryDays: toStr(p.downloadExpiryDays ?? ''),
    licenseType: p.licenseType ?? 'PERSONAL',
    isMadeToOrder: p.isMadeToOrder,
    productionDays: toStr(p.productionDays ?? ''),
    isFeatured: p.isFeatured,
    seoMetaTitle: p.seoMeta?.metaTitle ?? '',
    seoMetaDescription: p.seoMeta?.metaDescription ?? '',
    seoOgImage: p.seoMeta?.ogImage ?? '',
    seoNoIndex: p.seoMeta?.noIndex ?? false,
  };
}

// ---------------------------------------------------------------------------
// Small reusable components
// ---------------------------------------------------------------------------

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function Input({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  prefix,
  readOnly,
  className,
}: {
  id: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  prefix?: string;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 ${
        readOnly ? 'bg-gray-50' : 'focus-within:ring-2 focus-within:ring-indigo-500'
      } ${className ?? ''}`}
    >
      {prefix && (
        <span className="flex select-none items-center pl-3 text-gray-500 sm:text-sm">
          {prefix}
        </span>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`block w-full rounded-md border-0 py-1.5 text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm sm:leading-6 ${
          prefix ? 'pl-1' : 'px-3'
        } ${readOnly ? 'bg-gray-50 text-gray-500' : ''}`}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-green-50 text-green-700 ring-green-600/20',
    DRAFT: 'bg-gray-50 text-gray-600 ring-gray-500/10',
    ARCHIVED: 'bg-red-50 text-red-700 ring-red-600/10',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        styles[status] ?? 'bg-gray-50 text-gray-600 ring-gray-500/10'
      }`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    PHYSICAL: 'bg-blue-50 text-blue-700 ring-blue-700/10',
    DIGITAL: 'bg-purple-50 text-purple-700 ring-purple-700/10',
    PERSONALIZED: 'bg-amber-50 text-amber-700 ring-amber-700/10',
  };
  const labels: Record<string, string> = {
    PHYSICAL: 'Physical',
    DIGITAL: 'Digital',
    PERSONALIZED: 'Personalized',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        styles[type] ?? 'bg-gray-50 text-gray-600 ring-gray-500/10'
      }`}
    >
      {labels[type] ?? type}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProductEditForm({ product }: { product: ProductWithRelations }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => productToFormState(product));
  const [savedForm, setSavedForm] = useState<FormState>(() => productToFormState(product));
  const [status, setStatus] = useState(product.status);
  const [images, setImages] = useState<ProductImage[]>(product.images);
  const [variants, setVariants] = useState<ProductVariant[]>(product.variants);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Variant inline form
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [newVariant, setNewVariant] = useState<NewVariant>(INITIAL_NEW_VARIANT);
  const [variantError, setVariantError] = useState<string | null>(null);
  const [isAddingVariant, setIsAddingVariant] = useState(false);

  // IDs for accessibility
  const descId = useId();
  const shortDescId = useId();
  const seoDescId = useId();

  const isDirty =
    JSON.stringify(form) !== JSON.stringify(savedForm) || status !== product.status;

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveError(null);
    setSaveSuccess(false);
  }

  const handleGenerateSlug = useCallback(() => {
    setField('slug', generateSlug(form.name));
  }, [form.name]);

  // ---------------------------------------------------------------------------
  // Save / status change
  // ---------------------------------------------------------------------------

  async function patchProduct(payload: Record<string, unknown>) {
    const res = await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? 'Failed to update product.');
    }
    return res.json();
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await patchProduct({
        name: form.name.trim(),
        slug: form.slug.trim(),
        shortDescription: form.shortDescription.trim() || null,
        description: form.description.trim(),
        basePrice: form.basePrice ? Number(form.basePrice) : undefined,
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
        costPrice: form.costPrice ? Number(form.costPrice) : null,
        taxRate: form.taxRate ? Number(form.taxRate) : undefined,
        sku: form.sku.trim(),
        weight: form.weight ? Number(form.weight) : null,
        width: form.width ? Number(form.width) : null,
        height: form.height ? Number(form.height) : null,
        length: form.length ? Number(form.length) : null,
        isInstantDelivery: form.isInstantDelivery,
        maxDownloads: form.maxDownloads ? Number(form.maxDownloads) : null,
        downloadExpiryDays: form.downloadExpiryDays ? Number(form.downloadExpiryDays) : null,
        licenseType: form.licenseType || null,
        isMadeToOrder: form.isMadeToOrder,
        productionDays: form.productionDays ? Number(form.productionDays) : null,
        isFeatured: form.isFeatured,
        status,
      });
      setSavedForm({ ...form });
      setSaveSuccess(true);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(nextStatus: 'DRAFT' | 'ACTIVE' | 'ARCHIVED') {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await patchProduct({ status: nextStatus });
      setStatus(nextStatus);
      setSaveSuccess(true);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setIsSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Failed to delete product.');
      }
      router.push('/products');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to delete product.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Image actions (optimistic UI — real upload is future work)
  // ---------------------------------------------------------------------------

  async function handleSetPrimaryImage(imageId: string) {
    setImages((prev) =>
      prev.map((img) => ({ ...img, isPrimary: img.id === imageId })),
    );
    // In real implementation, call PATCH on image endpoint
  }

  async function handleDeleteImage(imageId: string) {
    setImages((prev) => prev.filter((img) => img.id !== imageId));
    // In real implementation, call DELETE on image endpoint
  }

  // ---------------------------------------------------------------------------
  // Variant actions
  // ---------------------------------------------------------------------------

  async function handleDeleteVariant(variantId: string) {
    setVariants((prev) => prev.filter((v) => v.id !== variantId));
    // In real implementation, call DELETE on variant endpoint
  }

  async function handleToggleVariantActive(variantId: string) {
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, isActive: !v.isActive } : v)),
    );
    // In real implementation, call PATCH on variant endpoint
  }

  async function handleAddVariant(e: React.FormEvent) {
    e.preventDefault();
    setVariantError(null);
    if (!newVariant.name.trim()) {
      setVariantError('Variant name is required.');
      return;
    }
    let parsedOptions: Record<string, string> = {};
    try {
      parsedOptions = JSON.parse(newVariant.options);
    } catch {
      setVariantError('Options must be valid JSON (e.g. {"Color":"Red"}).');
      return;
    }
    setIsAddingVariant(true);
    try {
      const res = await fetch(`/api/products/${product.id}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          name: newVariant.name.trim(),
          sku: newVariant.sku.trim() || undefined,
          price: newVariant.price ? Number(newVariant.price) : undefined,
          options: parsedOptions,
          isActive: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Failed to add variant.');
      }
      const created = await res.json();
      setVariants((prev) => [...prev, created]);
      setNewVariant(INITIAL_NEW_VARIANT);
      setShowAddVariant(false);
    } catch (err) {
      setVariantError(err instanceof Error ? err.message : 'Failed to add variant.');
    } finally {
      setIsAddingVariant(false);
    }
  }

  // Auto-dismiss success banner
  useEffect(() => {
    if (saveSuccess) {
      const t = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(t);
    }
  }, [saveSuccess]);

  const isPhysical = product.type === 'PHYSICAL';
  const isDigital = product.type === 'DIGITAL';
  const isPersonalized = product.type === 'PERSONALIZED';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Edit Product</h2>
          <p className="mt-0.5 text-sm text-gray-500 font-mono">{product.sku}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/products')}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back to Products
        </button>
      </div>

      {/* ── Status Bar ── */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            <TypeBadge type={product.type} />
            {isDirty && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-200">
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Status quick actions */}
            {status === 'DRAFT' && (
              <button
                type="button"
                onClick={() => handleStatusChange('ACTIVE')}
                disabled={isSaving}
                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-60"
              >
                Publish
              </button>
            )}
            {status === 'ACTIVE' && (
              <button
                type="button"
                onClick={() => handleStatusChange('ARCHIVED')}
                disabled={isSaving}
                className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
              >
                Archive
              </button>
            )}
            {status === 'ARCHIVED' && (
              <button
                type="button"
                onClick={() => handleStatusChange('DRAFT')}
                disabled={isSaving}
                className="rounded-md bg-gray-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-500 disabled:opacity-60"
              >
                Restore to Draft
              </button>
            )}
            {/* Delete */}
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-1.5 ring-1 ring-red-200">
                <span className="text-xs text-red-700">Delete permanently?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-xs font-semibold text-red-700 hover:text-red-900 disabled:opacity-60"
                >
                  {isDeleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Core Details ── */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <h3 className="text-base font-semibold text-gray-900">Core Details</h3>

        <div className="space-y-1.5">
          <p className="block text-sm font-medium text-gray-700">Product Type</p>
          <TypeBadge type={product.type} />
          <p className="text-xs text-gray-500">Product type cannot be changed after creation.</p>
        </div>

        <div className="space-y-1.5">
          <FieldLabel htmlFor="name" required>Product Name</FieldLabel>
          <Input
            id="name"
            value={form.name}
            onChange={(v) => setField('name', v)}
            placeholder="e.g. Handmade Silver Ring"
          />
        </div>

        <div className="space-y-1.5">
          <FieldLabel htmlFor="slug">Slug</FieldLabel>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                id="slug"
                value={form.slug}
                onChange={(v) => setField('slug', v)}
                placeholder="auto-generated-slug"
              />
            </div>
            <button
              type="button"
              onClick={handleGenerateSlug}
              className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Generate
            </button>
          </div>
          <p className="text-xs text-gray-500">Used in the product URL. Changing this will break existing links.</p>
        </div>

        <div className="space-y-1.5">
          <FieldLabel htmlFor={shortDescId}>Short Description</FieldLabel>
          <Input
            id={shortDescId}
            value={form.shortDescription}
            onChange={(v) => setField('shortDescription', v)}
            placeholder="One-line product summary…"
          />
        </div>

        <div className="space-y-1.5">
          <FieldLabel htmlFor={descId}>Description</FieldLabel>
          <textarea
            id={descId}
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            rows={6}
            placeholder="Full product description, materials, care instructions…"
            className="block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
          />
        </div>
      </section>

      {/* ── Pricing & SKU ── */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <h3 className="text-base font-semibold text-gray-900">Pricing &amp; SKU</h3>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="basePrice" required>Base Price (€)</FieldLabel>
            <Input
              id="basePrice"
              type="number"
              value={form.basePrice}
              onChange={(v) => setField('basePrice', v)}
              placeholder="0.00"
              prefix="€"
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel htmlFor="compareAtPrice">Compare-at Price (€)</FieldLabel>
            <Input
              id="compareAtPrice"
              type="number"
              value={form.compareAtPrice}
              onChange={(v) => setField('compareAtPrice', v)}
              placeholder="0.00"
              prefix="€"
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel htmlFor="costPrice">Cost Price (€)</FieldLabel>
            <Input
              id="costPrice"
              type="number"
              value={form.costPrice}
              onChange={(v) => setField('costPrice', v)}
              placeholder="0.00"
              prefix="€"
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel htmlFor="taxRate">Tax Rate (%)</FieldLabel>
            <Input
              id="taxRate"
              type="number"
              value={form.taxRate ? String(Number(form.taxRate) * 100) : ''}
              onChange={(v) => setField('taxRate', v ? String(Number(v) / 100) : '')}
              placeholder="19"
              prefix="%"
            />
            <p className="text-xs text-gray-500">Stored as decimal (0.19 = 19%). Default: 19%.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <FieldLabel htmlFor="sku">SKU</FieldLabel>
          <Input
            id="sku"
            value={form.sku}
            onChange={(v) => setField('sku', v)}
            placeholder="VEE-PHY-PRODUCT"
          />
        </div>
      </section>

      {/* ── Physical Properties ── */}
      {(isPhysical || isPersonalized) && (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5">
          <h3 className="text-base font-semibold text-gray-900">Physical Properties</h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="weight">Weight (grams)</FieldLabel>
              <Input
                id="weight"
                type="number"
                value={form.weight}
                onChange={(v) => setField('weight', v)}
                placeholder="e.g. 250"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="width">Width (cm)</FieldLabel>
              <Input
                id="width"
                type="number"
                value={form.width}
                onChange={(v) => setField('width', v)}
                placeholder="e.g. 10"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="height">Height (cm)</FieldLabel>
              <Input
                id="height"
                type="number"
                value={form.height}
                onChange={(v) => setField('height', v)}
                placeholder="e.g. 5"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="length">Length (cm)</FieldLabel>
              <Input
                id="length"
                type="number"
                value={form.length}
                onChange={(v) => setField('length', v)}
                placeholder="e.g. 20"
              />
            </div>
          </div>
        </section>
      )}

      {/* ── Digital Product ── */}
      {isDigital && (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5">
          <h3 className="text-base font-semibold text-gray-900">Digital Delivery</h3>

          <div className="flex items-center gap-3">
            <input
              id="isInstantDelivery"
              type="checkbox"
              checked={form.isInstantDelivery}
              onChange={(e) => setField('isInstantDelivery', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isInstantDelivery" className="text-sm text-gray-700">
              Instant delivery (file available immediately after purchase)
            </label>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="maxDownloads">Max Downloads</FieldLabel>
              <Input
                id="maxDownloads"
                type="number"
                value={form.maxDownloads}
                onChange={(v) => setField('maxDownloads', v)}
                placeholder="5"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="downloadExpiryDays">Download Expiry (days)</FieldLabel>
              <Input
                id="downloadExpiryDays"
                type="number"
                value={form.downloadExpiryDays}
                onChange={(v) => setField('downloadExpiryDays', v)}
                placeholder="30"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <FieldLabel htmlFor="licenseType">License Type</FieldLabel>
            <select
              id="licenseType"
              value={form.licenseType}
              onChange={(e) => setField('licenseType', e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm"
            >
              <option value="PERSONAL">Personal</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="EXTENDED">Extended</option>
            </select>
          </div>
        </section>
      )}

      {/* ── Made-to-Order ── */}
      {isPersonalized && (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5">
          <h3 className="text-base font-semibold text-gray-900">Made-to-Order</h3>

          <div className="flex items-center gap-3">
            <input
              id="isMadeToOrder"
              type="checkbox"
              checked={form.isMadeToOrder}
              onChange={(e) => setField('isMadeToOrder', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isMadeToOrder" className="text-sm text-gray-700">
              This is a made-to-order product
            </label>
          </div>

          <div className="space-y-1.5">
            <FieldLabel htmlFor="productionDays">Production Time (days)</FieldLabel>
            <Input
              id="productionDays"
              type="number"
              value={form.productionDays}
              onChange={(v) => setField('productionDays', v)}
              placeholder="7"
            />
            <p className="text-xs text-gray-500">
              Estimated business days to produce this item before shipping.
            </p>
          </div>
        </section>
      )}

      {/* ── Images ── */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Images</h3>
          <span className="text-xs text-gray-500">{images.length} image{images.length !== 1 ? 's' : ''}</span>
        </div>

        {images.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
            <svg
              className="mx-auto h-10 w-10 text-gray-300"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No images yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {images.map((img) => (
              <div
                key={img.id}
                className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 aspect-square group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.altText ?? ''}
                  className="h-full w-full object-cover"
                />
                {img.isPrimary && (
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Primary
                  </span>
                )}
                {/* Hover actions */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!img.isPrimary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimaryImage(img.id)}
                      className="rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(img.id)}
                    className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add image placeholder */}
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-500">
            Image upload coming soon. Images can be uploaded via the media library.
          </p>
        </div>
      </section>

      {/* ── Variants ── */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Variants</h3>
          <button
            type="button"
            onClick={() => setShowAddVariant((v) => !v)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            {showAddVariant ? 'Cancel' : '+ Add Variant'}
          </button>
        </div>

        {variants.length === 0 && !showAddVariant && (
          <p className="text-sm text-gray-500">No variants yet.</p>
        )}

        {variants.length > 0 && (
          <div className="divide-y divide-gray-100">
            {variants.map((v) => (
              <div key={v.id} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{v.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{v.sku}</p>
                  {v.price !== null && (
                    <p className="text-xs text-gray-500">
                      Price override: €{Number(v.price).toFixed(2)}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    Options: {JSON.stringify(v.options)}
                  </p>
                  {v.inventory && (
                    <p className="text-xs text-gray-400">
                      Stock: {v.inventory.quantity - v.inventory.reservedQuantity} available
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleVariantActive(v.id)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                      v.isActive
                        ? 'bg-green-50 text-green-700 ring-green-600/20 hover:bg-green-100'
                        : 'bg-gray-50 text-gray-600 ring-gray-500/10 hover:bg-gray-100'
                    }`}
                  >
                    {v.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteVariant(v.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add variant form */}
        {showAddVariant && (
          <form
            onSubmit={handleAddVariant}
            className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3"
          >
            <p className="text-sm font-semibold text-gray-700">New Variant</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600" htmlFor="newVariantName">Name *</label>
                <Input
                  id="newVariantName"
                  value={newVariant.name}
                  onChange={(v) => setNewVariant((p) => ({ ...p, name: v }))}
                  placeholder="e.g. Size M / Red"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600" htmlFor="newVariantSku">SKU</label>
                <Input
                  id="newVariantSku"
                  value={newVariant.sku}
                  onChange={(v) => setNewVariant((p) => ({ ...p, sku: v }))}
                  placeholder="Auto-generated"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600" htmlFor="newVariantPrice">Price override (€)</label>
                <Input
                  id="newVariantPrice"
                  type="number"
                  value={newVariant.price}
                  onChange={(v) => setNewVariant((p) => ({ ...p, price: v }))}
                  placeholder="Leave blank to use base price"
                  prefix="€"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600" htmlFor="newVariantOptions">
                  Options (JSON)
                </label>
                <Input
                  id="newVariantOptions"
                  value={newVariant.options}
                  onChange={(v) => setNewVariant((p) => ({ ...p, options: v }))}
                  placeholder='{"Color":"Red","Size":"M"}'
                />
              </div>
            </div>
            {variantError && (
              <p className="text-xs text-red-600">{variantError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowAddVariant(false); setNewVariant(INITIAL_NEW_VARIANT); setVariantError(null); }}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAddingVariant}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {isAddingVariant ? 'Adding…' : 'Add Variant'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ── Categories & Tags ── */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Categories &amp; Tags</h3>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Categories</p>
          {product.categories.length === 0 ? (
            <p className="text-sm text-gray-500">No categories assigned.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {product.categories.map((c: ProductCategory) => (
                <span
                  key={c.categoryId}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                >
                  {c.category.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Tags</p>
          {product.tags.length === 0 ? (
            <p className="text-sm text-gray-500">No tags assigned.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((t: ProductTag) => (
                <span
                  key={t.tagId}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-500/10"
                >
                  {t.tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── SEO ── */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <h3 className="text-base font-semibold text-gray-900">SEO</h3>

        <div className="space-y-1.5">
          <FieldLabel htmlFor="seoMetaTitle">Meta Title</FieldLabel>
          <Input
            id="seoMetaTitle"
            value={form.seoMetaTitle}
            onChange={(v) => setField('seoMetaTitle', v)}
            placeholder="Leave blank to use product name"
          />
        </div>

        <div className="space-y-1.5">
          <FieldLabel htmlFor={seoDescId}>Meta Description</FieldLabel>
          <textarea
            id={seoDescId}
            value={form.seoMetaDescription}
            onChange={(e) => setField('seoMetaDescription', e.target.value)}
            rows={3}
            placeholder="Brief description for search engines…"
            className="block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
          />
        </div>

        <div className="space-y-1.5">
          <FieldLabel htmlFor="seoOgImage">OG Image URL</FieldLabel>
          <Input
            id="seoOgImage"
            value={form.seoOgImage}
            onChange={(v) => setField('seoOgImage', v)}
            placeholder="https://…"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="seoNoIndex"
            type="checkbox"
            checked={form.seoNoIndex}
            onChange={(e) => setField('seoNoIndex', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="seoNoIndex" className="text-sm text-gray-700">
            No-index (hide from search engines)
          </label>
        </div>
      </section>

      {/* ── Feature Flags ── */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Feature Flags</h3>
        <div className="flex items-center gap-3">
          <input
            id="isFeatured"
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => setField('isFeatured', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="isFeatured" className="text-sm text-gray-700">
            Featured product (shown in featured sections on the storefront)
          </label>
        </div>
      </section>

      {/* ── Feedback ── */}
      {saveError && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {saveError}
        </div>
      )}
      {saveSuccess && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700 ring-1 ring-inset ring-green-200">
          Product saved successfully.
        </div>
      )}

      {/* ── Save Actions ── */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <button
          type="button"
          onClick={() => router.push('/products')}
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
