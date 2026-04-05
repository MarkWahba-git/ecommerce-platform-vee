'use client';

import Link from 'next/link';
import type { BundleDetail } from '@vee/core';

interface Props {
  bundle: BundleDetail;
}

const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

/**
 * BundleDetails — displayed on the product page when the product is a bundle.
 * Shows each constituent item with its individual price and the total savings.
 */
export function BundleDetails({ bundle }: Props) {
  const { items, totalIndividualPrice, savings, savingsPercent } = bundle;

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Savings badge */}
      {savingsPercent > 0 && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
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
            Du sparst {savingsPercent.toFixed(0)}% — {EUR.format(savings)}
          </span>
        </div>
      )}

      {/* Items list */}
      <div className="rounded-lg border border-border bg-secondary/30">
        <div className="border-b border-border px-4 py-2.5">
          <p className="text-sm font-semibold text-foreground">
            Im Bundle enthalten ({items.length} Artikel)
          </p>
        </div>

        <ul className="divide-y divide-border">
          {items.map((item, index) => {
            const img = item.product.images[0];
            const displayPrice = item.individualPrice * item.quantity;

            return (
              <li key={`${item.product.id}-${item.variant?.id ?? ''}-${index}`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Thumbnail */}
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                    {img ? (
                      <img
                        src={img.url}
                        alt={img.altText ?? item.product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5"
                          aria-hidden="true"
                        >
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${item.product.slug}`}
                      className="line-clamp-1 text-sm font-medium text-foreground hover:text-accent"
                    >
                      {item.product.name}
                    </Link>
                    {item.variant && (
                      <p className="text-xs text-muted-foreground">{item.variant.name}</p>
                    )}
                    {item.quantity > 1 && (
                      <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {EUR.format(displayPrice)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-muted-foreground">
                        {EUR.format(item.individualPrice)} each
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Summary */}
        <div className="border-t border-border bg-secondary/50 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Einzeln würdest du zahlen</span>
            <span className="font-medium text-muted-foreground line-through">
              {EUR.format(totalIndividualPrice)}
            </span>
          </div>
          {savings > 0 && (
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="font-semibold text-green-700">Deine Ersparnis</span>
              <span className="font-semibold text-green-700">
                − {EUR.format(savings)} ({savingsPercent.toFixed(0)}%)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
