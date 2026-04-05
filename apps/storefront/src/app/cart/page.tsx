'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@vee/ui';
import { useCartStore } from '@/stores/cart';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { useTranslation } from '@/hooks/use-translation';

const formatEUR = (cents: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents);

export default function CartPage() {
  const {
    items,
    isLoading,
    couponCode,
    discountAmount,
    subtotal,
    fetchCart,
    updateQuantity,
    removeItem,
    applyCoupon,
    removeCoupon,
  } = useCartStore();

  const { t } = useTranslation();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    fetchCart();
  }, [fetchCart]);

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCouponError('');
    try {
      await applyCoupon(couponInput.trim().toUpperCase());
      setCouponInput('');
    } catch {
      setCouponError(t('cart.couponInvalid'));
    }
  }

  async function handleRemoveCoupon() {
    setCouponError('');
    try {
      await removeCoupon();
    } catch {
      // ignore
    }
  }

  const shipping = subtotal >= 50 ? 0 : 4.99;
  const total = subtotal - discountAmount + shipping;

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-muted-foreground">{t('cart.loading')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={[{ label: t('cart.title') }]} />

      <h1 className="mb-8 text-3xl font-bold text-foreground">{t('cart.title')}</h1>

      {items.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* Items list */}
          <div className="lg:col-span-2 space-y-4">
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
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
                {t('cart.updating')}
              </div>
            )}

            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 rounded-lg border border-border bg-background p-4"
              >
                {/* Image */}
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col gap-2 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/product/${item.productSlug}`}
                        className="text-sm font-semibold text-foreground hover:text-accent line-clamp-2"
                      >
                        {item.productName}
                      </Link>
                      {item.variantName && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.variantName}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      aria-label={`${item.productName} entfernen`}
                      className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Quantity */}
                    <div className="flex items-center rounded-md border border-border">
                      <button
                        onClick={() => {
                          if (item.quantity > 1) updateQuantity(item.id, item.quantity - 1);
                        }}
                        disabled={item.quantity <= 1}
                        aria-label="Menge verringern"
                        className="flex h-8 w-8 items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 transition"
                      >
                        −
                      </button>
                      <span className="px-3 text-sm font-medium text-foreground" aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label="Menge erhöhen"
                        className="flex h-8 w-8 items-center justify-center text-foreground hover:bg-muted transition"
                      >
                        +
                      </button>
                    </div>

                    {/* Item total */}
                    <p className="text-sm font-semibold text-foreground">
                      {formatEUR(item.totalPrice)}
                    </p>
                  </div>

                  {/* Personalization preview */}
                  {item.personalization &&
                    Object.keys(item.personalization as Record<string, unknown>).length > 0 && (
                      <div className="rounded bg-muted px-2 py-1.5 text-xs text-muted-foreground">
                        <span className="font-medium">Personalisierung: </span>
                        {Object.entries(item.personalization as Record<string, string>)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-lg border border-border bg-background p-6 space-y-5">
              <h2 className="text-lg font-bold text-foreground">{t('cart.orderSummary')}</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('cart.subtotal')}</span>
                  <span>{formatEUR(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-accent">
                    <span>
                      {t('cart.discount')} {couponCode && `(${couponCode})`}
                    </span>
                    <span>−{formatEUR(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-muted-foreground">
                  <span>{t('cart.shipping')}</span>
                  <span>
                    {shipping === 0 ? (
                      <span className="text-accent font-medium">{t('cart.freeShipping')}</span>
                    ) : (
                      formatEUR(shipping)
                    )}
                  </span>
                </div>

                {subtotal < 50 && (
                  <p className="rounded bg-secondary px-3 py-2 text-xs text-muted-foreground">
                    {t('cart.freeShippingProgress', { amount: formatEUR(50 - subtotal) })}
                  </p>
                )}

                <div className="border-t border-border pt-3 flex justify-between font-bold text-foreground">
                  <span>{t('cart.total')}</span>
                  <span>{formatEUR(total)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t('cart.taxIncluded')}</p>
              </div>

              {/* Coupon code */}
              <div className="space-y-2">
                {couponCode ? (
                  <div className="flex items-center justify-between rounded-md bg-accent/10 px-3 py-2">
                    <span className="text-sm font-medium text-accent-foreground">
                      {t('cart.couponLabel', { code: couponCode })}
                    </span>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      {t('cart.couponRemove')}
                    </button>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="coupon" className="mb-1.5 block text-sm font-medium text-foreground">
                      {t('cart.couponCode')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="coupon"
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                        placeholder={t('cart.couponPlaceholder')}
                        className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleApplyCoupon}
                        disabled={!couponInput.trim() || isLoading}
                      >
                        {t('cart.couponApply')}
                      </Button>
                    </div>
                    {couponError && (
                      <p className="mt-1 text-xs text-destructive">{couponError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Checkout CTA */}
              <Link
                href="/checkout"
                className="block w-full rounded-md bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                {t('cart.checkout')} →
              </Link>

              <Link
                href="/shop"
                className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('cart.continueShopping')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyCart() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mb-6 text-muted-foreground"
        aria-hidden="true"
      >
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <line x1="3" x2="21" y1="6" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      <h2 className="text-2xl font-bold text-foreground">{t('cart.empty')}</h2>
      <p className="mt-3 max-w-sm text-muted-foreground">{t('cart.emptyMessage')}</p>
      <Link
        href="/shop"
        className="mt-8 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        {t('cart.shopNow')}
      </Link>
    </div>
  );
}
