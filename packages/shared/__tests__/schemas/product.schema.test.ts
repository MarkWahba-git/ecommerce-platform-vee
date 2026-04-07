import { describe, it, expect } from 'vitest';
import { productCreateSchema, productListSchema } from '../../src/schemas/product.schema';

describe('productCreateSchema', () => {
  const validProduct = {
    type: 'PHYSICAL' as const,
    name: 'Handmade Ceramic Mug',
    description: 'A beautiful handmade mug.',
    basePrice: 29.99,
  };

  it('should accept a valid minimal product input', () => {
    const result = productCreateSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it('should accept a full valid product input', () => {
    const full = {
      ...validProduct,
      slug: 'handmade-ceramic-mug',
      sku: 'VEE-PHY-001',
      shortDescription: 'Handmade with love.',
      compareAtPrice: 39.99,
      costPrice: 10.00,
      taxRate: 0.19,
      weight: 0.5,
      width: 10,
      height: 12,
      length: 10,
      isFeatured: true,
      isMadeToOrder: false,
      productionDays: 5,
      categoryIds: ['cat-1', 'cat-2'],
      tagIds: ['tag-1'],
      attributes: { color: 'blue' },
    };
    const result = productCreateSchema.safeParse(full);
    expect(result.success).toBe(true);
  });

  it('should reject when type is missing', () => {
    const { type: _type, ...withoutType } = validProduct;
    const result = productCreateSchema.safeParse(withoutType);
    expect(result.success).toBe(false);
  });

  it('should reject invalid type', () => {
    const result = productCreateSchema.safeParse({ ...validProduct, type: 'BUNDLE' });
    expect(result.success).toBe(false);
  });

  it('should reject when name is missing', () => {
    const { name: _name, ...withoutName } = validProduct;
    const result = productCreateSchema.safeParse(withoutName);
    expect(result.success).toBe(false);
  });

  it('should reject when name is empty string', () => {
    const result = productCreateSchema.safeParse({ ...validProduct, name: '' });
    expect(result.success).toBe(false);
  });

  it('should reject when name exceeds 255 characters', () => {
    const result = productCreateSchema.safeParse({ ...validProduct, name: 'a'.repeat(256) });
    expect(result.success).toBe(false);
  });

  it('should reject when description is missing', () => {
    const { description: _desc, ...withoutDesc } = validProduct;
    const result = productCreateSchema.safeParse(withoutDesc);
    expect(result.success).toBe(false);
  });

  it('should reject when basePrice is missing', () => {
    const { basePrice: _price, ...withoutPrice } = validProduct;
    const result = productCreateSchema.safeParse(withoutPrice);
    expect(result.success).toBe(false);
  });

  it('should reject when basePrice is zero or negative', () => {
    expect(productCreateSchema.safeParse({ ...validProduct, basePrice: 0 }).success).toBe(false);
    expect(productCreateSchema.safeParse({ ...validProduct, basePrice: -10 }).success).toBe(false);
  });

  it('should reject when taxRate is outside 0–1 range', () => {
    expect(productCreateSchema.safeParse({ ...validProduct, taxRate: -0.1 }).success).toBe(false);
    expect(productCreateSchema.safeParse({ ...validProduct, taxRate: 1.1 }).success).toBe(false);
  });

  it('should default taxRate to 0.19 when not provided', () => {
    const result = productCreateSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.taxRate).toBe(0.19);
    }
  });

  it('should default isFeatured to false', () => {
    const result = productCreateSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isFeatured).toBe(false);
    }
  });

  it('should default isMadeToOrder to false', () => {
    const result = productCreateSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isMadeToOrder).toBe(false);
    }
  });

  it('should default isInstantDelivery to false', () => {
    const result = productCreateSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isInstantDelivery).toBe(false);
    }
  });

  it('should reject negative weight', () => {
    const result = productCreateSchema.safeParse({ ...validProduct, weight: -1 });
    expect(result.success).toBe(false);
  });

  it('should reject shortDescription exceeding 500 characters', () => {
    const result = productCreateSchema.safeParse({
      ...validProduct,
      shortDescription: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('should accept DIGITAL type with download fields', () => {
    const result = productCreateSchema.safeParse({
      ...validProduct,
      type: 'DIGITAL',
      isInstantDelivery: true,
      maxDownloads: 10,
      downloadExpiryDays: 365,
      licenseType: 'PERSONAL',
    });
    expect(result.success).toBe(true);
  });
});

describe('productListSchema', () => {
  it('should use defaults when no input provided', () => {
    const result = productListSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sortBy).toBe('createdAt');
      expect(result.data.sortOrder).toBe('desc');
    }
  });

  it('should accept valid filter combinations', () => {
    const result = productListSchema.safeParse({
      page: 2,
      limit: 10,
      type: 'DIGITAL',
      status: 'ACTIVE',
      search: 'handmade',
      sortBy: 'name',
      sortOrder: 'asc',
    });
    expect(result.success).toBe(true);
  });

  it('should reject page < 1', () => {
    const result = productListSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject limit > 100', () => {
    const result = productListSchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('should reject limit < 1', () => {
    const result = productListSchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject invalid sortBy field', () => {
    const result = productListSchema.safeParse({ sortBy: 'id' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid sortOrder value', () => {
    const result = productListSchema.safeParse({ sortOrder: 'ascending' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid status', () => {
    const result = productListSchema.safeParse({ status: 'PUBLISHED' });
    expect(result.success).toBe(false);
  });
});
