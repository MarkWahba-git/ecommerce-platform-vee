export interface CartSummary {
  id: string;
  itemCount: number;
  subtotal: number;
  currency: string;
  couponCode: string | null;
  discountAmount: number;
  items: CartItemSummary[];
}

export interface CartItemSummary {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  productType: string;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl: string | null;
  personalization: Record<string, unknown> | null;
}
