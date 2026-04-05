import { z } from 'zod';

export const customerRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  marketingConsent: z.boolean().default(false),
});

export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>;

export const customerUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  marketingConsent: z.boolean().optional(),
});

export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

export const customerListSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'email', 'lastName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CustomerListInput = z.infer<typeof customerListSchema>;
