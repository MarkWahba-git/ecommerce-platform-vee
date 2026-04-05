import { z } from 'zod';

export const productCreateSchema = z.object({
  type: z.enum(['PHYSICAL', 'DIGITAL', 'PERSONALIZED']),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  sku: z.string().min(1).max(50).optional(),
  shortDescription: z.string().max(500).optional(),
  description: z.string().min(1),
  basePrice: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  costPrice: z.number().nonnegative().optional(),
  taxRate: z.number().min(0).max(1).default(0.19),
  weight: z.number().nonnegative().optional(),
  width: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
  length: z.number().nonnegative().optional(),
  isFeatured: z.boolean().default(false),
  isMadeToOrder: z.boolean().default(false),
  productionDays: z.number().int().positive().optional(),
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  attributes: z.record(z.unknown()).optional(),

  // Digital fields
  isInstantDelivery: z.boolean().default(false),
  maxDownloads: z.number().int().positive().optional(),
  downloadExpiryDays: z.number().int().positive().optional(),
  licenseType: z.string().optional(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = productCreateSchema.partial().extend({
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
});

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const productListSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  type: z.enum(['PHYSICAL', 'DIGITAL', 'PERSONALIZED']).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  categoryId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'price', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ProductListInput = z.infer<typeof productListSchema>;

export const variantCreateSchema = z.object({
  productId: z.string(),
  name: z.string().min(1),
  sku: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  costPrice: z.number().nonnegative().optional(),
  weight: z.number().nonnegative().optional(),
  options: z.record(z.string()),
  isActive: z.boolean().default(true),
});

export type VariantCreateInput = z.infer<typeof variantCreateSchema>;
