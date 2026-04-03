import { z } from 'zod';

export const addToCartSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  personalization: z.record(z.unknown()).optional(),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive(),
});

export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const applyCouponSchema = z.object({
  code: z.string().min(1).max(50),
});

export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
