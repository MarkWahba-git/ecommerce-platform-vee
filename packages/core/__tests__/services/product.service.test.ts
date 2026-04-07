import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../mocks/db';
import '../mocks/meilisearch';
import { mockDb } from '../mocks/db';
import { mockMeili, mockMeiliIndex } from '../mocks/meilisearch';

// Import the service after mocks are set up
import { ProductService } from '../../src/services/product.service';

const service = new ProductService();

const baseProduct = {
  id: 'prod-1',
  name: 'Test Product',
  slug: 'test-product',
  sku: 'VEE-PHY-001',
  type: 'PHYSICAL' as const,
  status: 'ACTIVE' as const,
  basePrice: '29.99',
  description: 'A test product',
  shortDescription: null,
  taxRate: '0.19',
  weight: null,
  isFeatured: false,
  isMadeToOrder: false,
  productionDays: null,
  compareAtPrice: null,
  costPrice: null,
  attributes: null,
  isInstantDelivery: false,
  maxDownloads: null,
  downloadExpiryDays: null,
  licenseType: null,
  publishedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  images: [],
  categories: [],
  tags: [],
};

beforeEach(() => {
  vi.resetAllMocks();
  // Default: mockMeili.index returns mockMeiliIndex
  mockMeili.index.mockReturnValue(mockMeiliIndex);
  // Default: addDocuments resolves ok
  mockMeiliIndex.addDocuments.mockResolvedValue({ taskUid: 1 });
  mockMeiliIndex.deleteDocument.mockResolvedValue({ taskUid: 2 });
});

describe('ProductService.list()', () => {
  const defaultInput = {
    page: 1,
    limit: 20,
    sortBy: 'createdAt' as const,
    sortOrder: 'desc' as const,
  };

  it('should return paginated product list', async () => {
    mockDb.product.findMany.mockResolvedValue([baseProduct]);
    mockDb.product.count.mockResolvedValue(1);

    const result = await service.list(defaultInput);

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.totalPages).toBe(1);
  });

  it('should filter by type', async () => {
    mockDb.product.findMany.mockResolvedValue([]);
    mockDb.product.count.mockResolvedValue(0);

    await service.list({ ...defaultInput, type: 'DIGITAL' });

    expect(mockDb.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'DIGITAL' }),
      }),
    );
  });

  it('should filter by status', async () => {
    mockDb.product.findMany.mockResolvedValue([]);
    mockDb.product.count.mockResolvedValue(0);

    await service.list({ ...defaultInput, status: 'ACTIVE' });

    expect(mockDb.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ACTIVE' }),
      }),
    );
  });

  it('should filter by search query', async () => {
    mockDb.product.findMany.mockResolvedValue([]);
    mockDb.product.count.mockResolvedValue(0);

    await service.list({ ...defaultInput, search: 'handmade' });

    expect(mockDb.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { name: { contains: 'handmade', mode: 'insensitive' } },
            { sku: { contains: 'handmade', mode: 'insensitive' } },
          ],
        }),
      }),
    );
  });

  it('should filter by categoryId', async () => {
    mockDb.product.findMany.mockResolvedValue([]);
    mockDb.product.count.mockResolvedValue(0);

    await service.list({ ...defaultInput, categoryId: 'cat-1' });

    expect(mockDb.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categories: { some: { categoryId: 'cat-1' } },
        }),
      }),
    );
  });

  it('should apply correct pagination skip', async () => {
    mockDb.product.findMany.mockResolvedValue([]);
    mockDb.product.count.mockResolvedValue(0);

    await service.list({ ...defaultInput, page: 3, limit: 10 });

    expect(mockDb.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });

  it('should calculate totalPages correctly', async () => {
    mockDb.product.findMany.mockResolvedValue([]);
    mockDb.product.count.mockResolvedValue(55);

    const result = await service.list({ ...defaultInput, limit: 20 });

    expect(result.totalPages).toBe(3);
  });
});

describe('ProductService.getBySlug()', () => {
  it('should return product with all relations', async () => {
    mockDb.product.findUnique.mockResolvedValue(baseProduct);

    const result = await service.getBySlug('test-product');

    expect(mockDb.product.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'test-product' },
      }),
    );
    expect(result).toEqual(baseProduct);
  });

  it('should return null when product not found', async () => {
    mockDb.product.findUnique.mockResolvedValue(null);

    const result = await service.getBySlug('nonexistent');

    expect(result).toBeNull();
  });
});

describe('ProductService.getById()', () => {
  it('should return product by ID with all relations', async () => {
    mockDb.product.findUnique.mockResolvedValue(baseProduct);

    const result = await service.getById('prod-1');

    expect(mockDb.product.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prod-1' },
      }),
    );
    expect(result).toEqual(baseProduct);
  });

  it('should return null when product not found', async () => {
    mockDb.product.findUnique.mockResolvedValue(null);

    const result = await service.getById('nonexistent');

    expect(result).toBeNull();
  });
});

describe('ProductService.create()', () => {
  const createInput = {
    type: 'PHYSICAL' as const,
    name: 'New Product',
    description: 'A brand new product',
    basePrice: 49.99,
    taxRate: 0.19,
    isFeatured: false,
    isMadeToOrder: false,
    isInstantDelivery: false,
  };

  it('should generate a slug from the name when not provided', async () => {
    mockDb.product.create.mockResolvedValue({ ...baseProduct, id: 'new-prod', name: 'New Product', slug: 'new-product' });
    // indexProduct calls findUnique which returns null (inactive) so no meilisearch call
    mockDb.product.findUnique.mockResolvedValue(null);

    await service.create(createInput);

    expect(mockDb.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'new-product' }),
      }),
    );
  });

  it('should use provided slug when given', async () => {
    mockDb.product.create.mockResolvedValue({ ...baseProduct, slug: 'custom-slug' });
    mockDb.product.findUnique.mockResolvedValue(null);

    await service.create({ ...createInput, slug: 'custom-slug' });

    expect(mockDb.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'custom-slug' }),
      }),
    );
  });

  it('should call db.product.create with correct data', async () => {
    const createdProduct = { ...baseProduct, id: 'new-prod' };
    mockDb.product.create.mockResolvedValue(createdProduct);
    mockDb.product.findUnique.mockResolvedValue(null);

    const result = await service.create(createInput);

    expect(mockDb.product.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(createdProduct);
  });

  it('should index active product in Meilisearch after creation', async () => {
    const createdProduct = { ...baseProduct, status: 'ACTIVE' as const };
    mockDb.product.create.mockResolvedValue(createdProduct);
    // findUnique for indexProduct returns an active product
    mockDb.product.findUnique.mockResolvedValue({
      ...createdProduct,
      images: [{ url: 'img.jpg', isPrimary: true }],
      categories: [],
      tags: [],
    });

    await service.create(createInput);

    expect(mockMeili.index).toHaveBeenCalledWith('products');
    expect(mockMeiliIndex.addDocuments).toHaveBeenCalledTimes(1);
  });

  it('should not index a DRAFT product in Meilisearch', async () => {
    const draftProduct = { ...baseProduct, status: 'DRAFT' as const };
    mockDb.product.create.mockResolvedValue(draftProduct);
    mockDb.product.findUnique.mockResolvedValue({ ...draftProduct, images: [], categories: [], tags: [] });

    await service.create(createInput);

    expect(mockMeiliIndex.addDocuments).not.toHaveBeenCalled();
  });

  it('should create categories when categoryIds provided', async () => {
    mockDb.product.create.mockResolvedValue(baseProduct);
    mockDb.product.findUnique.mockResolvedValue(null);

    await service.create({ ...createInput, categoryIds: ['cat-1', 'cat-2'] });

    expect(mockDb.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categories: {
            create: [
              { categoryId: 'cat-1', sortOrder: 0 },
              { categoryId: 'cat-2', sortOrder: 1 },
            ],
          },
        }),
      }),
    );
  });
});

describe('ProductService.update()', () => {
  it('should call db.product.update with correct data', async () => {
    const updatedProduct = { ...baseProduct, name: 'Updated Name' };
    mockDb.product.update.mockResolvedValue(updatedProduct);
    mockDb.product.findUnique.mockResolvedValue(null);

    await service.update('prod-1', { name: 'Updated Name' });

    expect(mockDb.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prod-1' },
        data: expect.objectContaining({ name: 'Updated Name' }),
      }),
    );
  });

  it('should set publishedAt when status changes to ACTIVE', async () => {
    mockDb.product.update.mockResolvedValue(baseProduct);
    mockDb.product.findUnique.mockResolvedValue(null);

    await service.update('prod-1', { status: 'ACTIVE' });

    expect(mockDb.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ publishedAt: expect.any(Date) }),
      }),
    );
  });

  it('should re-index product in Meilisearch after update', async () => {
    const updatedProduct = { ...baseProduct, status: 'ACTIVE' as const };
    mockDb.product.update.mockResolvedValue(updatedProduct);
    mockDb.product.findUnique.mockResolvedValue({
      ...updatedProduct,
      images: [],
      categories: [],
      tags: [],
    });

    await service.update('prod-1', { name: 'New Name' });

    expect(mockMeiliIndex.addDocuments).toHaveBeenCalledTimes(1);
  });
});

describe('ProductService.delete()', () => {
  it('should remove product from database', async () => {
    mockDb.product.delete.mockResolvedValue(baseProduct);
    mockMeiliIndex.deleteDocument.mockResolvedValue({ taskUid: 2 });

    await service.delete('prod-1');

    expect(mockDb.product.delete).toHaveBeenCalledWith({ where: { id: 'prod-1' } });
  });

  it('should remove product from Meilisearch index', async () => {
    mockDb.product.delete.mockResolvedValue(baseProduct);
    mockMeiliIndex.deleteDocument.mockResolvedValue({ taskUid: 2 });

    await service.delete('prod-1');

    expect(mockMeili.index).toHaveBeenCalledWith('products');
    expect(mockMeiliIndex.deleteDocument).toHaveBeenCalledWith('prod-1');
  });

  it('should not throw if Meilisearch delete fails', async () => {
    mockDb.product.delete.mockResolvedValue(baseProduct);
    mockMeiliIndex.deleteDocument.mockRejectedValue(new Error('Meili error'));

    await expect(service.delete('prod-1')).resolves.toBeUndefined();
  });
});
