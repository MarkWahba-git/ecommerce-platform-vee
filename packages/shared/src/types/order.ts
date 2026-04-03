export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  source: string;
  total: number;
  currency: string;
  itemCount: number;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
}

export interface OrderDetail extends OrderSummary {
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  couponCode: string | null;
  customerNote: string | null;
  internalNote: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: OrderItemDetail[];
  shippingAddress: AddressSummary | null;
  billingAddress: AddressSummary | null;
  payments: PaymentSummary[];
  shipments: ShipmentSummary[];
  marketplaceOrderId: string | null;
}

export interface OrderItemDetail {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isDigital: boolean;
  personalization: Record<string, unknown> | null;
  productSlug: string;
  variantName: string | null;
}

export interface AddressSummary {
  firstName: string;
  lastName: string;
  company: string | null;
  street1: string;
  street2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
}

export interface PaymentSummary {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
}

export interface ShipmentSummary {
  id: string;
  carrier: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: string;
  shippedAt: string | null;
}
