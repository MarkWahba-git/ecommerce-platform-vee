'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING' | 'BUY_X_GET_Y';

interface FormErrors {
  code?: string;
  type?: string;
  value?: string;
  minOrderAmount?: string;
  maxDiscountAmount?: string;
  usageLimit?: string;
  perCustomerLimit?: string;
  startsAt?: string;
  expiresAt?: string;
  buyQuantity?: string;
  getQuantity?: string;
  qualifyingProductIds?: string;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  const { error, ...rest } = props;
  return (
    <input
      {...rest}
      className={`block w-full rounded-md border-0 px-3 py-2 text-gray-900 shadow-sm ring-1 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm ${
        error ? 'ring-red-300 focus:ring-red-500' : 'ring-gray-300'
      }`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  const { error, ...rest } = props;
  return (
    <select
      {...rest}
      className={`block w-full rounded-md border-0 py-2 pl-3 pr-8 text-gray-900 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm ${
        error ? 'ring-red-300 focus:ring-red-500' : 'ring-gray-300'
      }`}
    />
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DiscountNewPage() {
  const router = useRouter();

  const [code, setCode] = useState('');
  const [type, setType] = useState<DiscountType>('PERCENTAGE');
  const [value, setValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [perCustomerLimit, setPerCustomerLimit] = useState('1');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  // BUY_X_GET_Y specific fields
  const [buyQuantity, setBuyQuantity] = useState('1');
  const [getQuantity, setGetQuantity] = useState('1');
  const [qualifyingProductIds, setQualifyingProductIds] = useState('');
  const [getProductId, setGetProductId] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!code.trim()) e.code = 'Coupon code is required.';
    else if (!/^[A-Z0-9_-]{2,32}$/.test(code.trim()))
      e.code = 'Code must be 2–32 uppercase letters, digits, underscores, or hyphens.';

    if (type !== 'FREE_SHIPPING' && type !== 'BUY_X_GET_Y') {
      const v = parseFloat(value);
      if (!value || isNaN(v) || v <= 0) e.value = 'Enter a positive discount value.';
      if (type === 'PERCENTAGE' && v > 100) e.value = 'Percentage cannot exceed 100.';
    }

    if (type === 'BUY_X_GET_Y') {
      const bq = parseInt(buyQuantity);
      if (!buyQuantity || isNaN(bq) || bq < 1) e.buyQuantity = 'Must be a positive integer.';
      const gq = parseInt(getQuantity);
      if (!getQuantity || isNaN(gq) || gq < 1) e.getQuantity = 'Must be a positive integer.';
    }

    if (minOrderAmount && isNaN(parseFloat(minOrderAmount)))
      e.minOrderAmount = 'Must be a valid number.';
    if (maxDiscountAmount && isNaN(parseFloat(maxDiscountAmount)))
      e.maxDiscountAmount = 'Must be a valid number.';
    if (usageLimit && (isNaN(parseInt(usageLimit)) || parseInt(usageLimit) < 1))
      e.usageLimit = 'Must be a positive integer.';
    if (perCustomerLimit && (isNaN(parseInt(perCustomerLimit)) || parseInt(perCustomerLimit) < 1))
      e.perCustomerLimit = 'Must be a positive integer.';
    if (startsAt && expiresAt && new Date(startsAt) >= new Date(expiresAt))
      e.expiresAt = 'Expiry must be after start date.';

    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setApiError(null);
    try {
      // Build applicableTo for BUY_X_GET_Y
      let applicableTo: Record<string, unknown> | null = null;
      if (type === 'BUY_X_GET_Y') {
        applicableTo = {
          buyQuantity: parseInt(buyQuantity),
          getQuantity: parseInt(getQuantity),
          ...(getProductId.trim() && { getProductId: getProductId.trim() }),
          ...(qualifyingProductIds.trim() && {
            productIds: qualifyingProductIds
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          }),
        };
      }

      const res = await fetch('/api/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          type,
          value: type !== 'FREE_SHIPPING' && type !== 'BUY_X_GET_Y' ? parseFloat(value) : 0,
          minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
          maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
          usageLimit: usageLimit ? parseInt(usageLimit) : null,
          perCustomerLimit: perCustomerLimit ? parseInt(perCustomerLimit) : null,
          applicableTo,
          startsAt: startsAt || null,
          expiresAt: expiresAt || null,
          isActive,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setApiError(data?.error ?? `Server error: ${res.status}`);
        return;
      }
      router.push('/discounts');
    } catch (err) {
      setApiError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const part = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setCode(`VEE-${part}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Link href="/discounts" className="text-sm text-gray-500 hover:text-gray-900">
          ← Discounts
        </Link>
        <h2 className="mt-1 text-xl font-semibold text-gray-900">New Coupon</h2>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {apiError && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            {apiError}
          </div>
        )}

        {/* Card */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Coupon Details</h3>
          </div>
          <div className="space-y-5 px-6 py-5">
            {/* Code */}
            <Field label="Code *" error={errors.code}>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SUMMER20"
                  error={!!errors.code}
                  className="flex-1 block rounded-md border-0 px-3 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm font-mono uppercase"
                />
                <button
                  type="button"
                  onClick={generateCode}
                  className="shrink-0 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Generate
                </button>
              </div>
            </Field>

            {/* Type */}
            <Field label="Discount Type *" error={errors.type}>
              <Select
                value={type}
                onChange={(e) => setType(e.target.value as DiscountType)}
                error={!!errors.type}
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_AMOUNT">Fixed Amount (€)</option>
                <option value="FREE_SHIPPING">Free Shipping</option>
                <option value="BUY_X_GET_Y">Buy X Get Y Free</option>
              </Select>
            </Field>

            {/* Value */}
            {type !== 'FREE_SHIPPING' && type !== 'BUY_X_GET_Y' && (
              <Field
                label={type === 'PERCENTAGE' ? 'Discount Percentage *' : 'Discount Amount (€) *'}
                error={errors.value}
              >
                <div className="relative">
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={type === 'PERCENTAGE' ? '20' : '10.00'}
                    min={0}
                    max={type === 'PERCENTAGE' ? 100 : undefined}
                    step={type === 'PERCENTAGE' ? 1 : 0.01}
                    error={!!errors.value}
                  />
                  {type === 'PERCENTAGE' && (
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-400">
                      %
                    </span>
                  )}
                  {type === 'FIXED_AMOUNT' && (
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-400">
                      €
                    </span>
                  )}
                </div>
              </Field>
            )}

            {/* BUY_X_GET_Y configuration */}
            {type === 'BUY_X_GET_Y' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Buy Quantity *"
                    error={errors.buyQuantity}
                    hint="Customer must add this many qualifying items."
                  >
                    <Input
                      type="number"
                      value={buyQuantity}
                      onChange={(e) => setBuyQuantity(e.target.value)}
                      placeholder="2"
                      min={1}
                      step={1}
                      error={!!errors.buyQuantity}
                    />
                  </Field>
                  <Field
                    label="Get Quantity (Free) *"
                    error={errors.getQuantity}
                    hint="Number of cheapest items given free."
                  >
                    <Input
                      type="number"
                      value={getQuantity}
                      onChange={(e) => setGetQuantity(e.target.value)}
                      placeholder="1"
                      min={1}
                      step={1}
                      error={!!errors.getQuantity}
                    />
                  </Field>
                </div>
                <Field
                  label="Qualifying Product IDs"
                  error={errors.qualifyingProductIds}
                  hint="Comma-separated product IDs that qualify for the buy side. Leave blank to allow all products."
                >
                  <Input
                    type="text"
                    value={qualifyingProductIds}
                    onChange={(e) => setQualifyingProductIds(e.target.value)}
                    placeholder="prod_abc123, prod_def456"
                    error={!!errors.qualifyingProductIds}
                  />
                </Field>
                <Field
                  label="Free Product ID"
                  hint="Specific product ID to give for free. Leave blank to use the cheapest qualifying item(s)."
                >
                  <Input
                    type="text"
                    value={getProductId}
                    onChange={(e) => setGetProductId(e.target.value)}
                    placeholder="prod_xyz789"
                  />
                </Field>
              </>
            )}

            {/* Min order */}
            <Field
              label="Minimum Order Amount (€)"
              error={errors.minOrderAmount}
              hint="Leave blank for no minimum."
            >
              <Input
                type="number"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                placeholder="0.00"
                min={0}
                step={0.01}
                error={!!errors.minOrderAmount}
              />
            </Field>

            {/* Max discount — only for percentage coupons */}
            {type === 'PERCENTAGE' && (
              <Field
                label="Max Discount Amount (€)"
                error={errors.maxDiscountAmount}
                hint="Cap the maximum discount in euros. Leave blank for no cap."
              >
                <Input
                  type="number"
                  value={maxDiscountAmount}
                  onChange={(e) => setMaxDiscountAmount(e.target.value)}
                  placeholder="50.00"
                  min={0}
                  step={0.01}
                  error={!!errors.maxDiscountAmount}
                />
              </Field>
            )}
          </div>
        </div>

        {/* Usage limits */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Usage Limits</h3>
          </div>
          <div className="grid grid-cols-2 gap-5 px-6 py-5">
            <Field
              label="Total Usage Limit"
              error={errors.usageLimit}
              hint="Leave blank for unlimited use."
            >
              <Input
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="100"
                min={1}
                step={1}
                error={!!errors.usageLimit}
              />
            </Field>
            <Field
              label="Per-Customer Limit"
              error={errors.perCustomerLimit}
              hint="Max times one customer can use this."
            >
              <Input
                type="number"
                value={perCustomerLimit}
                onChange={(e) => setPerCustomerLimit(e.target.value)}
                placeholder="1"
                min={1}
                step={1}
                error={!!errors.perCustomerLimit}
              />
            </Field>
          </div>
        </div>

        {/* Dates */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Validity Period</h3>
          </div>
          <div className="grid grid-cols-2 gap-5 px-6 py-5">
            <Field label="Start Date" error={errors.startsAt}>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                error={!!errors.startsAt}
              />
            </Field>
            <Field label="Expiry Date" error={errors.expiresAt}>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                error={!!errors.expiresAt}
              />
            </Field>
          </div>
        </div>

        {/* Active toggle */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Active</p>
              <p className="text-xs text-gray-500">
                Inactive coupons cannot be applied at checkout.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                isActive ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={isActive}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/discounts"
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create Coupon'}
          </button>
        </div>
      </form>
    </div>
  );
}
