import { z } from 'zod';

export const addressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().optional(),
  street1: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
  country: z.string().default('DE'),
  phone: z.string().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;

export const checkoutSchema = z.object({
  cartId: z.string(),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  customerNote: z.string().max(1000).optional(),
  couponCode: z.string().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const orderStatusUpdateSchema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'AWAITING_APPROVAL',
    'SHIPPED',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'REFUNDED',
  ]),
  internalNote: z.string().optional(),
});

export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;

export const orderListSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  status: z
    .enum([
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'AWAITING_APPROVAL',
      'SHIPPED',
      'DELIVERED',
      'COMPLETED',
      'CANCELLED',
      'REFUNDED',
    ])
    .optional(),
  source: z.enum(['WEBSITE', 'ETSY', 'AMAZON', 'MANUAL']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'total', 'orderNumber']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type OrderListInput = z.infer<typeof orderListSchema>;
