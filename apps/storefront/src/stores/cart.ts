// Re-export from the canonical cart store so components that import from
// '@/stores/cart' (e.g. Header.tsx) work without modification.
export { useCartStore } from './cart-store';
export type { CartState } from './cart-store';
