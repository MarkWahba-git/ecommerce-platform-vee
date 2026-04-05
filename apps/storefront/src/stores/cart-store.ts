import { create } from 'zustand';
import type { CartItemSummary, CartSummary } from '@vee/shared';

// ---------------------------------------------------------------------------
// Cookie helpers (browser-safe, no external deps)
// ---------------------------------------------------------------------------

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export interface CartState {
  /** Line items currently in the cart */
  items: CartItemSummary[];
  /** Cart drawer open/closed */
  isOpen: boolean;
  /** Network operation in-flight */
  isLoading: boolean;
  /** Coupon code currently applied */
  couponCode: string | null;
  /** Discount amount in cents */
  discountAmount: number;
  /** Subtotal in cents */
  subtotal: number;
  /** Server-assigned cart / session id */
  sessionId: string | null;

  // Actions
  fetchCart: () => Promise<void>;
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
  toggleCartDrawer: () => void;
}

// ---------------------------------------------------------------------------
// Helper: compute subtotal from items array
// ---------------------------------------------------------------------------

function computeSubtotal(items: CartItemSummary[]): number {
  return items.reduce((sum, item) => sum + item.totalPrice, 0);
}

// ---------------------------------------------------------------------------
// Helper: fetch wrapper that always sends the session-id cookie header
// ---------------------------------------------------------------------------

async function apiFetch(path: string, options?: RequestInit): Promise<CartSummary> {
  const sessionId = getCookie('vee_cart_session');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(sessionId ? { 'x-cart-session': sessionId } : {}),
    ...(options?.headers ?? {}),
  };

  const res = await fetch(path, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }

  const data: CartSummary = await res.json();

  // Persist the session id returned by the server
  if (data.id) {
    setCookie('vee_cart_session', data.id);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isOpen: false,
  isLoading: false,
  couponCode: null,
  discountAmount: 0,
  subtotal: 0,
  sessionId: getCookie('vee_cart_session') ?? null,

  // ------------------------------------------------------------------
  // fetchCart – load current cart from the server
  // ------------------------------------------------------------------
  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const cart = await apiFetch('/api/cart');
      set({
        items: cart.items,
        couponCode: cart.couponCode,
        discountAmount: cart.discountAmount,
        subtotal: computeSubtotal(cart.items),
        sessionId: cart.id,
      });
    } catch (err) {
      console.error('[CartStore] fetchCart error:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  // ------------------------------------------------------------------
  // addItem – POST /api/cart/items
  // ------------------------------------------------------------------
  addItem: async (productId, variantId, quantity = 1, personalization) => {
    set({ isLoading: true });
    try {
      const cart = await apiFetch('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, variantId, quantity, personalization }),
      });
      set({
        items: cart.items,
        couponCode: cart.couponCode,
        discountAmount: cart.discountAmount,
        subtotal: computeSubtotal(cart.items),
        sessionId: cart.id,
        isOpen: true, // open drawer after adding
      });
    } catch (err) {
      console.error('[CartStore] addItem error:', err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  // ------------------------------------------------------------------
  // updateQuantity – PATCH /api/cart/items/:id
  // ------------------------------------------------------------------
  updateQuantity: async (itemId, quantity) => {
    // Optimistic update
    const prev = get().items;
    set({
      items: prev.map((i) =>
        i.id === itemId
          ? { ...i, quantity, totalPrice: i.unitPrice * quantity }
          : i,
      ),
    });
    set({ isLoading: true });
    try {
      const cart = await apiFetch(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      set({
        items: cart.items,
        couponCode: cart.couponCode,
        discountAmount: cart.discountAmount,
        subtotal: computeSubtotal(cart.items),
      });
    } catch (err) {
      // Roll back
      set({ items: prev, subtotal: computeSubtotal(prev) });
      console.error('[CartStore] updateQuantity error:', err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  // ------------------------------------------------------------------
  // removeItem – DELETE /api/cart/items/:id
  // ------------------------------------------------------------------
  removeItem: async (itemId) => {
    const prev = get().items;
    // Optimistic removal
    const next = prev.filter((i) => i.id !== itemId);
    set({ items: next, subtotal: computeSubtotal(next) });
    set({ isLoading: true });
    try {
      const cart = await apiFetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
      });
      set({
        items: cart.items,
        couponCode: cart.couponCode,
        discountAmount: cart.discountAmount,
        subtotal: computeSubtotal(cart.items),
      });
    } catch (err) {
      // Roll back
      set({ items: prev, subtotal: computeSubtotal(prev) });
      console.error('[CartStore] removeItem error:', err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  // ------------------------------------------------------------------
  // applyCoupon – POST /api/cart/coupon
  // ------------------------------------------------------------------
  applyCoupon: async (code) => {
    set({ isLoading: true });
    try {
      const cart = await apiFetch('/api/cart/coupon', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      set({
        items: cart.items,
        couponCode: cart.couponCode,
        discountAmount: cart.discountAmount,
        subtotal: computeSubtotal(cart.items),
      });
    } catch (err) {
      console.error('[CartStore] applyCoupon error:', err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  // ------------------------------------------------------------------
  // removeCoupon – DELETE /api/cart/coupon
  // ------------------------------------------------------------------
  removeCoupon: async () => {
    set({ isLoading: true });
    try {
      const cart = await apiFetch('/api/cart/coupon', {
        method: 'DELETE',
      });
      set({
        items: cart.items,
        couponCode: cart.couponCode,
        discountAmount: cart.discountAmount,
        subtotal: computeSubtotal(cart.items),
      });
    } catch (err) {
      console.error('[CartStore] removeCoupon error:', err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  // ------------------------------------------------------------------
  // toggleCartDrawer
  // ------------------------------------------------------------------
  toggleCartDrawer: () => set((s) => ({ isOpen: !s.isOpen })),
}));
