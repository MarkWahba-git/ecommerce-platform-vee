'use client';

import { useState } from 'react';
import Link from 'next/link';

const formatEUR = (val: string | number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(val));

type WishlistItem = {
  id: string;
  productId: string;
  createdAt: string;
  product: {
    id: string;
    slug: string;
    name: string;
    basePrice: string;
    compareAtPrice: string | null;
    type: string;
    images: Array<{ url: string; altText: string | null }>;
  };
};

export function WishlistClient({ initialItems }: { initialItems: WishlistItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  async function handleRemove(wishlistId: string) {
    setRemovingId(wishlistId);
    try {
      const res = await fetch(`/api/wishlist/${wishlistId}`, { method: 'DELETE' });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== wishlistId));
      }
    } finally {
      setRemovingId(null);
    }
  }

  async function handleAddToCart(item: WishlistItem) {
    setAddingId(item.productId);
    try {
      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: item.productId, quantity: 1 }),
      });
      if (res.ok) {
        setAddedIds((prev) => new Set(prev).add(item.productId));
        setTimeout(() => {
          setAddedIds((prev) => {
            const next = new Set(prev);
            next.delete(item.productId);
            return next;
          });
        }, 2000);
      }
    } finally {
      setAddingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Wunschliste</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Produkte, die du dir gemerkt hast.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background p-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-4 text-muted-foreground"
            aria-hidden="true"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          <p className="text-muted-foreground">Deine Wunschliste ist leer.</p>
          <Link
            href="/shop"
            className="mt-4 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Produkte entdecken
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Wunschliste</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? 'Produkt' : 'Produkte'} auf deiner Wunschliste.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const image = item.product.images[0];
          const isRemoving = removingId === item.id;
          const isAdding = addingId === item.productId;
          const isAdded = addedIds.has(item.productId);

          return (
            <div
              key={item.id}
              className={`group relative rounded-xl border border-border bg-background transition ${isRemoving ? 'opacity-50' : ''}`}
            >
              {/* Remove button */}
              <button
                onClick={() => handleRemove(item.id)}
                disabled={isRemoving}
                aria-label={`${item.product.name} von Wunschliste entfernen`}
                className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-1.5 text-muted-foreground shadow-sm backdrop-blur transition hover:bg-red-50 hover:text-red-500"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>

              {/* Product image */}
              <Link href={`/product/${item.product.slug}`}>
                <div className="aspect-square overflow-hidden rounded-t-xl bg-muted">
                  {image ? (
                    <img
                      src={image.url}
                      alt={image.altText ?? item.product.name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                        <circle cx="9" cy="9" r="2"/>
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                      </svg>
                    </div>
                  )}
                </div>
              </Link>

              <div className="p-4">
                <Link
                  href={`/product/${item.product.slug}`}
                  className="line-clamp-2 font-medium text-foreground hover:text-accent"
                >
                  {item.product.name}
                </Link>

                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-semibold text-foreground">
                    {formatEUR(item.product.basePrice)}
                  </span>
                  {item.product.compareAtPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatEUR(item.product.compareAtPrice)}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleAddToCart(item)}
                  disabled={isAdding || isAdded}
                  className={`mt-3 w-full rounded-md px-4 py-2 text-sm font-medium transition ${
                    isAdded
                      ? 'bg-green-600 text-white'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {isAdded ? '✓ Im Warenkorb' : isAdding ? 'Wird hinzugefügt…' : 'In den Warenkorb'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
