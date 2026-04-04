'use client';

import { useCallback } from 'react';
import { useCartStore } from '@/stores/cart-store';
import type { CartItemSummary } from '@vee/shared';

// ---------------------------------------------------------------------------
// useCart – convenience hook wrapping the Zustand cart store
// ---------------------------------------------------------------------------

export interface UseCartReturn {
  /** All line items in the cart */
  items: CartItemSummary[];
  /** Total number of units across all line items */
  itemCount: number;
  /** Subtotal before discount */
  subtotal: number;
  /** Applied coupon code, if any */
  couponCode: string | null;
  /** Discount amount */
  discountAmount: number;
  /** Whether the cart drawer is open */
  isOpen: boolean;
  /** Whether a network operation is in-flight */
  isLoading: boolean;

  // Actions
  addItem: (
    productId: string,
    variantId?: string,
    quantity?: number,
    personalization?: Record<string, unknown>,
  ) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  toggleCart: () => void;
  fetchCart: () => Promise<void>;
}

export function useCart(): UseCartReturn {
  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isOpen);
  const isLoading = useCartStore((s) => s.isLoading);
  const couponCode = useCartStore((s) => s.couponCode);
  const discountAmount = useCartStore((s) => s.discountAmount);
  const subtotal = useCartStore((s) => s.subtotal);

  const addItemAction = useCartStore((s) => s.addItem);
  const updateQuantityAction = useCartStore((s) => s.updateQuantity);
  const removeItemAction = useCartStore((s) => s.removeItem);
  const applyCouponAction = useCartStore((s) => s.applyCoupon);
  const removeCouponAction = useCartStore((s) => s.removeCoupon);
  const toggleCartDrawer = useCartStore((s) => s.toggleCartDrawer);
  const fetchCartAction = useCartStore((s) => s.fetchCart);

  // Memoised wrappers so referential stability is preserved for React.memo'd components
  const addItem = useCallback(
    (
      productId: string,
      variantId?: string,
      quantity = 1,
      personalization?: Record<string, unknown>,
    ) => addItemAction(productId, variantId, quantity, personalization),
    [addItemAction],
  );

  const updateQuantity = useCallback(
    (itemId: string, quantity: number) => updateQuantityAction(itemId, quantity),
    [updateQuantityAction],
  );

  const removeItem = useCallback(
    (itemId: string) => removeItemAction(itemId),
    [removeItemAction],
  );

  const applyCoupon = useCallback(
    (code: string) => applyCouponAction(code),
    [applyCouponAction],
  );

  const removeCoupon = useCallback(() => removeCouponAction(), [removeCouponAction]);

  const toggleCart = useCallback(() => toggleCartDrawer(), [toggleCartDrawer]);

  const fetchCart = useCallback(() => fetchCartAction(), [fetchCartAction]);

  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  return {
    items,
    itemCount,
    subtotal,
    couponCode,
    discountAmount,
    isOpen,
    isLoading,
    addItem,
    updateQuantity,
    removeItem,
    applyCoupon,
    removeCoupon,
    toggleCart,
    fetchCart,
  };
}
