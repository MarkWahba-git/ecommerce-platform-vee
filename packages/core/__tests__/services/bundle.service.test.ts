import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../mocks/db';
import { mockDb } from '../mocks/db';

import { BundleService } from '../../src/services/bundle.service';

// Mock inventory service used by bundle service
vi.mock('../../src/services/inventory.service', () => ({
  inventoryService: {
    reserve: vi.fn().mockResolvedValue(undefined),
  },
}));

const service = new BundleService();

const bundleAttributes = {
  isBundle: true,
  bundleItems: [
    { productId: 'prod-1', variantId: 'var-1', quantity: 1 },
    { productId: 'prod-2', variantId: 'var-2', quantity: 2 },
  ],
};

const baseProduct = {
  id: 'prod-1',
  name: 'Product 1',
  sku: 'VEE-PHY-001',
  slug: 'product-1',
  basePrice: '29.99',
  type: 'PHYSICAL' as const,
  status: 'DRAFT' as const,
  description: 'A product',
  shortDescription: null,
  attributes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const bundleProduct = {
  ...baseProduct,
  id: 'bundle-1',
  name: 'Bundle Pack',
  sku: 'VEE-BUNDLE-001',
  slug: 'bundle-pack',
  basePrice: '49.99',
  attributes: bundleAttributes,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('BundleService.create()', () => {
  const createInput = {
    name: 'Starter Bundle',
    sku: 'VEE-BUNDLE-001',
    description: 'Everything you need to get started',
    price: 49.99,
    items: [
      { productId: 'prod-1', variantId: 'var-1', quantity: 1 },
      { productId: 'prod-2', quantity: 2 },
    ],
  };

  it('should create product with isBundle attribute', async () => {
    // validateItemsExist calls
    mockDb.product.findUnique
      .mockResolvedValueOnce({ ...baseProduct, id: 'prod-1' })
      .mockResolvedValueOnce({ ...baseProduct, id: 'prod-2' });
    mockDb.productVariant.findUnique.mockResolvedValue({ id: 'var-1', productId: 'prod-1' });
    mockDb.product.create.mockResolvedValue(bundleProduct);

    const result = await service.create(createInput);

    expect(mockDb.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attributes: expect.objectContaining({ isBundle: true }),
          status: 'DRAFT',
        }),
      }),
    );
    expect(result).toEqual(bundleProduct);
  });

  it('should store bundleItems in attributes', async () => {
    mockDb.product.findUnique
      .mockResolvedValueOnce({ ...baseProduct, id: 'prod-1' })
      .mockResolvedValueOnce({ ...baseProduct, id: 'prod-2' });
    mockDb.productVariant.findUnique.mockResolvedValue({ id: 'var-1', productId: 'prod-1' });
    mockDb.product.create.mockResolvedValue(bundleProduct);

    await service.create(createInput);

    expect(mockDb.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attributes: expect.objectContaining({
            bundleItems: createInput.items,
          }),
        }),
      }),
    );
  });

  it('should generate slug from name when not provided', async () => {
    mockDb.product.findUnique.mockResolvedValue({ ...baseProduct, id: 'prod-1' });
    mockDb.product.create.mockResolvedValue(bundleProduct);

    await service.create({ ...createInput, items: [{ productId: 'prod-1', quantity: 1 }] });

    expect(mockDb.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'starter-bundle' }),
      }),
    );
  });

  it('should use provided slug when given', async () => {
    mockDb.product.findUnique.mockResolvedValue({ ...baseProduct, id: 'prod-1' });
    mockDb.product.create.mockResolvedValue(bundleProduct);

    await service.create({
      ...createInput,
      slug: 'custom-bundle-slug',
      items: [{ productId: 'prod-1', quantity: 1 }],
    });

    expect(mockDb.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'custom-bundle-slug' }),
      }),
    );
  });

  it('should throw when a referenced product does not exist', async () => {
    mockDb.product.findUnique.mockResolvedValue(null);

    await expect(service.create(createInput)).rejects.toThrow('Product prod-1 not found');
    expect(mockDb.product.create).not.toHaveBeenCalled();
  });

  it('should throw when variant does not belong to the product', async () => {
    mockDb.product.findUnique.mockResolvedValue({ ...baseProduct, id: 'prod-1' });
    mockDb.productVariant.findUnique.mockResolvedValue({ id: 'var-1', productId: 'prod-OTHER' });

    await expect(
      service.create({
        ...createInput,
        items: [{ productId: 'prod-1', variantId: 'var-1', quantity: 1 }],
      }),
    ).rejects.toThrow('Variant var-1 not found or does not belong to product prod-1');
  });
});

describe('BundleService.validateStock()', () => {
  it('should return true when all bundle items have sufficient stock', async () => {
    mockDb.product.findUniqueOrThrow.mockResolvedValue(bundleProduct);
    mockDb.inventory.findMany.mockResolvedValue([
      { variantId: 'var-1', quantity: 50, reservedQuantity: 10, trackInventory: true },
      { variantId: 'var-2', quantity: 100, reservedQuantity: 20, trackInventory: true },
    ]);

    // Bundle has 1x prod-1/var-1, 2x prod-2/var-2; requesting 5 bundles
    // var-1: needs 1*5=5, available=50-10=40 ✓
    // var-2: needs 2*5=10, available=100-20=80 ✓
    const result = await service.validateStock('bundle-1', 5);

    expect(result).toBe(true);
  });

  it('should return false when any item has insufficient stock', async () => {
    mockDb.product.findUniqueOrThrow.mockResolvedValue(bundleProduct);
    mockDb.inventory.findMany.mockResolvedValue([
      { variantId: 'var-1', quantity: 10, reservedQuantity: 8, trackInventory: true }, // 2 available
      { variantId: 'var-2', quantity: 100, reservedQuantity: 0, trackInventory: true },
    ]);

    // var-1: needs 1*5=5, available=10-8=2 ✗
    const result = await service.validateStock('bundle-1', 5);

    expect(result).toBe(false);
  });

  it('should return true when no items have inventory tracking', async () => {
    const bundleNoVariants = {
      ...bundleProduct,
      attributes: {
        isBundle: true,
        bundleItems: [
          { productId: 'prod-1', quantity: 1 }, // no variantId
        ],
      },
    };
    mockDb.product.findUniqueOrThrow.mockResolvedValue(bundleNoVariants);

    const result = await service.validateStock('bundle-1', 5);

    expect(result).toBe(true);
    expect(mockDb.inventory.findMany).not.toHaveBeenCalled();
  });

  it('should throw when product is not a bundle', async () => {
    mockDb.product.findUniqueOrThrow.mockResolvedValue({ ...baseProduct, attributes: null });

    await expect(service.validateStock('prod-1', 1)).rejects.toThrow(
      'Product prod-1 is not a bundle',
    );
  });
});

describe('BundleService.calculateSavings()', () => {
  it('should return correct discount info', async () => {
    // Bundle price: 49.99
    // Item 1: 1x prod-1 at 29.99 = 29.99
    // Item 2: 2x prod-2 at 19.99 = 39.98
    // Total individual: 69.97, savings: 69.97 - 49.99 = 19.98
    const bundleWithSavings = {
      ...bundleProduct,
      basePrice: '49.99',
      attributes: {
        isBundle: true,
        bundleItems: [
          { productId: 'prod-1', quantity: 1 },
          { productId: 'prod-2', quantity: 2 },
        ],
      },
    };
    mockDb.product.findUnique
      .mockResolvedValueOnce(bundleWithSavings) // getBundle call
      .mockResolvedValueOnce({ ...baseProduct, id: 'prod-1', basePrice: '29.99', images: [] }) // expandItems
      .mockResolvedValueOnce({ ...baseProduct, id: 'prod-2', basePrice: '19.99', images: [] }); // expandItems

    const result = await service.calculateSavings('bundle-1');

    expect(result.totalIndividualPrice).toBeCloseTo(69.97, 1);
    expect(result.savings).toBeCloseTo(19.98, 1);
    expect(result.savingsPercent).toBeCloseTo(28.56, 1);
  });

  it('should return zero savings when bundle price equals individual price sum', async () => {
    const bundleNoSavings = {
      ...bundleProduct,
      basePrice: '29.99',
      attributes: {
        isBundle: true,
        bundleItems: [{ productId: 'prod-1', quantity: 1 }],
      },
    };
    mockDb.product.findUnique
      .mockResolvedValueOnce(bundleNoSavings)
      .mockResolvedValueOnce({ ...baseProduct, id: 'prod-1', basePrice: '29.99', images: [] });

    const result = await service.calculateSavings('bundle-1');

    expect(result.savings).toBe(0);
    expect(result.savingsPercent).toBe(0);
  });

  it('should throw when bundle product is not found', async () => {
    mockDb.product.findUnique.mockResolvedValue(null);

    await expect(service.calculateSavings('nonexistent')).rejects.toThrow(
      'Bundle nonexistent not found',
    );
  });
});
