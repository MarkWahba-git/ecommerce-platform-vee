import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../mocks/db';
import '../mocks/s3';
import { mockDb } from '../mocks/db';
import { mockGetDownloadUrl } from '../mocks/s3';

import { DigitalDeliveryService } from '../../src/services/digital-delivery.service';

const service = new DigitalDeliveryService();

const baseAccess = {
  id: 'access-1',
  customerId: 'cust-1',
  orderItemId: 'item-1',
  fileKey: 'digital/product-guide.pdf',
  fileName: 'product-guide.pdf',
  maxDownloads: 5,
  downloadCount: 0,
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days from now
  lastDownloadAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseOrderForDigital = {
  id: 'order-1',
  customerId: 'cust-1',
  items: [
    {
      id: 'item-1',
      productId: 'prod-1',
      isDigital: true,
      product: {
        id: 'prod-1',
        name: 'Digital Guide',
        downloadExpiryDays: 30,
        maxDownloads: 5,
        files: [
          {
            id: 'file-1',
            fileKey: 'digital/product-guide.pdf',
            fileName: 'product-guide.pdf',
            isPreview: false,
          },
        ],
      },
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  mockGetDownloadUrl.mockResolvedValue('https://s3.example.com/download-signed-url');
});

describe('DigitalDeliveryService.grantAccess()', () => {
  it('should create DownloadAccess records for digital items', async () => {
    mockDb.order.findUniqueOrThrow.mockResolvedValue(baseOrderForDigital);
    mockDb.downloadAccess.findFirst.mockResolvedValue(null);
    mockDb.downloadAccess.create.mockResolvedValue(baseAccess);

    const result = await service.grantAccess('order-1');

    expect(mockDb.downloadAccess.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: 'cust-1',
          orderItemId: 'item-1',
          fileKey: 'digital/product-guide.pdf',
          fileName: 'product-guide.pdf',
          maxDownloads: 5,
        }),
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(baseAccess);
  });

  it('should set expiresAt based on product downloadExpiryDays', async () => {
    mockDb.order.findUniqueOrThrow.mockResolvedValue(baseOrderForDigital);
    mockDb.downloadAccess.findFirst.mockResolvedValue(null);
    mockDb.downloadAccess.create.mockResolvedValue(baseAccess);

    await service.grantAccess('order-1');

    const createCall = mockDb.downloadAccess.create.mock.calls[0][0];
    expect(createCall.data.expiresAt).toBeInstanceOf(Date);
    // Should be approximately 30 days from now
    const expectedExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const diff = Math.abs(createCall.data.expiresAt.getTime() - expectedExpiry.getTime());
    expect(diff).toBeLessThan(5000); // within 5 seconds
  });

  it('should set expiresAt to null when no downloadExpiryDays on product', async () => {
    const orderNoExpiry = {
      ...baseOrderForDigital,
      items: [
        {
          ...baseOrderForDigital.items[0],
          product: { ...baseOrderForDigital.items[0].product, downloadExpiryDays: null },
        },
      ],
    };
    mockDb.order.findUniqueOrThrow.mockResolvedValue(orderNoExpiry);
    mockDb.downloadAccess.findFirst.mockResolvedValue(null);
    mockDb.downloadAccess.create.mockResolvedValue({ ...baseAccess, expiresAt: null });

    await service.grantAccess('order-1');

    const createCall = mockDb.downloadAccess.create.mock.calls[0][0];
    expect(createCall.data.expiresAt).toBeNull();
  });

  it('should be idempotent — return existing access without creating duplicate', async () => {
    mockDb.order.findUniqueOrThrow.mockResolvedValue(baseOrderForDigital);
    mockDb.downloadAccess.findFirst.mockResolvedValue(baseAccess); // Already exists

    const result = await service.grantAccess('order-1');

    expect(mockDb.downloadAccess.create).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(baseAccess);
  });

  it('should return empty array when order has no digital items', async () => {
    mockDb.order.findUniqueOrThrow.mockResolvedValue({ ...baseOrderForDigital, items: [] });

    const result = await service.grantAccess('order-1');

    expect(result).toHaveLength(0);
    expect(mockDb.downloadAccess.create).not.toHaveBeenCalled();
  });
});

describe('DigitalDeliveryService.getDownloadUrl()', () => {
  it('should validate ownership and return presigned S3 URL', async () => {
    mockDb.downloadAccess.findUnique.mockResolvedValue(baseAccess);
    mockDb.downloadAccess.update.mockResolvedValue({ ...baseAccess, downloadCount: 1 });

    const url = await service.getDownloadUrl('access-1', 'cust-1');

    expect(url).toBe('https://s3.example.com/download-signed-url');
    expect(mockGetDownloadUrl).toHaveBeenCalledWith('digital/product-guide.pdf', 900);
  });

  it('should increment download count on success', async () => {
    mockDb.downloadAccess.findUnique.mockResolvedValue(baseAccess);
    mockDb.downloadAccess.update.mockResolvedValue({ ...baseAccess, downloadCount: 1 });

    await service.getDownloadUrl('access-1', 'cust-1');

    expect(mockDb.downloadAccess.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'access-1' },
        data: expect.objectContaining({
          downloadCount: { increment: 1 },
          lastDownloadAt: expect.any(Date),
        }),
      }),
    );
  });

  it('should throw when access record not found', async () => {
    mockDb.downloadAccess.findUnique.mockResolvedValue(null);

    await expect(service.getDownloadUrl('access-999', 'cust-1')).rejects.toThrow(
      'Download not found',
    );
  });

  it('should throw when customerId does not match', async () => {
    mockDb.downloadAccess.findUnique.mockResolvedValue({ ...baseAccess, customerId: 'cust-2' });

    await expect(service.getDownloadUrl('access-1', 'cust-1')).rejects.toThrow(
      'Download not found',
    );
  });

  it('should throw when download count has reached the limit', async () => {
    mockDb.downloadAccess.findUnique.mockResolvedValue({
      ...baseAccess,
      maxDownloads: 5,
      downloadCount: 5,
    });

    await expect(service.getDownloadUrl('access-1', 'cust-1')).rejects.toThrow(
      'Download limit reached',
    );
    expect(mockDb.downloadAccess.update).not.toHaveBeenCalled();
  });

  it('should throw when download access has expired', async () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
    mockDb.downloadAccess.findUnique.mockResolvedValue({
      ...baseAccess,
      expiresAt: pastDate,
    });

    await expect(service.getDownloadUrl('access-1', 'cust-1')).rejects.toThrow(
      'Download link has expired',
    );
    expect(mockDb.downloadAccess.update).not.toHaveBeenCalled();
  });

  it('should allow download when no limit set (maxDownloads is null)', async () => {
    mockDb.downloadAccess.findUnique.mockResolvedValue({
      ...baseAccess,
      maxDownloads: null,
      downloadCount: 999,
    });
    mockDb.downloadAccess.update.mockResolvedValue({ ...baseAccess, downloadCount: 1000 });

    const url = await service.getDownloadUrl('access-1', 'cust-1');

    expect(url).toBe('https://s3.example.com/download-signed-url');
  });

  it('should allow download when no expiry set (expiresAt is null)', async () => {
    mockDb.downloadAccess.findUnique.mockResolvedValue({
      ...baseAccess,
      expiresAt: null,
    });
    mockDb.downloadAccess.update.mockResolvedValue({ ...baseAccess, downloadCount: 1 });

    const url = await service.getDownloadUrl('access-1', 'cust-1');

    expect(url).toBe('https://s3.example.com/download-signed-url');
  });
});
