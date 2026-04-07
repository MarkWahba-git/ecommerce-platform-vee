import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../mocks/db';
import { mockDb } from '../mocks/db';

import { InventoryService } from '../../src/services/inventory.service';

const service = new InventoryService();

const baseInventory = {
  id: 'inv-1',
  variantId: 'var-1',
  quantity: 100,
  reservedQuantity: 10,
  trackInventory: true,
  lowStockThreshold: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('InventoryService.updateQuantity()', () => {
  it('should upsert inventory record with given quantity', async () => {
    mockDb.inventory.upsert.mockResolvedValue({ ...baseInventory, quantity: 50 });

    const result = await service.updateQuantity('var-1', 50);

    expect(mockDb.inventory.upsert).toHaveBeenCalledWith({
      where: { variantId: 'var-1' },
      update: { quantity: 50 },
      create: { variantId: 'var-1', quantity: 50 },
    });
    expect(result).toMatchObject({ quantity: 50 });
  });

  it('should create new inventory record when none exists', async () => {
    mockDb.inventory.upsert.mockResolvedValue({ ...baseInventory, quantity: 25 });

    await service.updateQuantity('var-new', 25);

    expect(mockDb.inventory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { variantId: 'var-new', quantity: 25 },
      }),
    );
  });
});

describe('InventoryService.reserve()', () => {
  it('should successfully reserve stock when sufficient quantity available', async () => {
    const inventory = { ...baseInventory, quantity: 100, reservedQuantity: 10 };
    const txMock = {
      inventory: {
        findUnique: vi.fn().mockResolvedValue(inventory),
        update: vi.fn().mockResolvedValue({ ...inventory, reservedQuantity: 15 }),
      },
    };
    mockDb.$transaction.mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) =>
      fn(txMock),
    );

    const result = await service.reserve('var-1', 5);

    expect(txMock.inventory.findUnique).toHaveBeenCalledWith({ where: { variantId: 'var-1' } });
    expect(txMock.inventory.update).toHaveBeenCalledWith({
      where: { variantId: 'var-1' },
      data: { reservedQuantity: { increment: 5 } },
    });
    expect(result).toMatchObject({ reservedQuantity: 15 });
  });

  it('should throw when insufficient stock', async () => {
    // available = 100 - 95 = 5, requesting 10
    const inventory = { ...baseInventory, quantity: 100, reservedQuantity: 95 };
    const txMock = {
      inventory: {
        findUnique: vi.fn().mockResolvedValue(inventory),
        update: vi.fn(),
      },
    };
    mockDb.$transaction.mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) =>
      fn(txMock),
    );

    await expect(service.reserve('var-1', 10)).rejects.toThrow(
      'Insufficient stock: 5 available, 10 requested',
    );
    expect(txMock.inventory.update).not.toHaveBeenCalled();
  });

  it('should return undefined when inventory tracking is disabled', async () => {
    const inventory = { ...baseInventory, trackInventory: false };
    const txMock = {
      inventory: {
        findUnique: vi.fn().mockResolvedValue(inventory),
        update: vi.fn(),
      },
    };
    mockDb.$transaction.mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) =>
      fn(txMock),
    );

    const result = await service.reserve('var-1', 5);

    expect(result).toBeUndefined();
    expect(txMock.inventory.update).not.toHaveBeenCalled();
  });

  it('should return undefined when inventory record not found', async () => {
    const txMock = {
      inventory: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };
    mockDb.$transaction.mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) =>
      fn(txMock),
    );

    const result = await service.reserve('var-1', 5);

    expect(result).toBeUndefined();
  });
});

describe('InventoryService.release()', () => {
  it('should decrement reservedQuantity', async () => {
    mockDb.inventory.update.mockResolvedValue({ ...baseInventory, reservedQuantity: 5 });

    await service.release('var-1', 5);

    expect(mockDb.inventory.update).toHaveBeenCalledWith({
      where: { variantId: 'var-1' },
      data: { reservedQuantity: { decrement: 5 } },
    });
  });
});

describe('InventoryService.confirmDeduction()', () => {
  it('should decrement both quantity and reservedQuantity', async () => {
    mockDb.inventory.update.mockResolvedValue({
      ...baseInventory,
      quantity: 90,
      reservedQuantity: 5,
    });

    await service.confirmDeduction('var-1', 10);

    expect(mockDb.inventory.update).toHaveBeenCalledWith({
      where: { variantId: 'var-1' },
      data: {
        quantity: { decrement: 10 },
        reservedQuantity: { decrement: 10 },
      },
    });
  });
});

describe('InventoryService.bulkUpdate()', () => {
  it('should process all items in a single transaction', async () => {
    const updates = [
      { variantId: 'var-1', quantity: 50 },
      { variantId: 'var-2', quantity: 75 },
      { variantId: 'var-3', quantity: 30 },
    ];

    mockDb.inventory.upsert.mockResolvedValue(baseInventory);
    mockDb.$transaction.mockResolvedValue([baseInventory, baseInventory, baseInventory]);

    await service.bulkUpdate(updates);

    expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
    // The array passed to $transaction should have 3 upsert operations
    expect(mockDb.inventory.upsert).toHaveBeenCalledTimes(3);
  });

  it('should upsert each variant with correct quantity', async () => {
    mockDb.inventory.upsert.mockResolvedValue(baseInventory);
    mockDb.$transaction.mockResolvedValue([]);

    await service.bulkUpdate([{ variantId: 'var-1', quantity: 42 }]);

    expect(mockDb.inventory.upsert).toHaveBeenCalledWith({
      where: { variantId: 'var-1' },
      update: { quantity: 42 },
      create: { variantId: 'var-1', quantity: 42 },
    });
  });

  it('should handle empty updates array', async () => {
    mockDb.$transaction.mockResolvedValue([]);

    await service.bulkUpdate([]);

    expect(mockDb.$transaction).toHaveBeenCalledWith([]);
  });
});
