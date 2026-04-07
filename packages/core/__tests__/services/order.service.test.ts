import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../mocks/db';
import { mockDb } from '../mocks/db';

import { OrderService } from '../../src/services/order.service';

// Mock the inventory service dependency
vi.mock('../../src/services/inventory.service', () => ({
  inventoryService: {
    reserve: vi.fn().mockResolvedValue(undefined),
  },
}));

import { inventoryService } from '../../src/services/inventory.service';

const service = new OrderService();

const shippingAddress = {
  firstName: 'Anna',
  lastName: 'Müller',
  street1: 'Hauptstraße 1',
  city: 'Berlin',
  postalCode: '10115',
  country: 'DE',
};

const baseAddress = {
  id: 'addr-1',
  customerId: 'cust-1',
  type: 'SHIPPING' as const,
  ...shippingAddress,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseOrder = {
  id: 'order-1',
  orderNumber: `VEE-${new Date().getFullYear()}-00001`,
  customerId: 'cust-1',
  status: 'PENDING' as const,
  source: 'WEBSITE' as const,
  subtotal: 59.98,
  taxAmount: 9.56,
  total: 59.98,
  shippingAddressId: 'addr-1',
  billingAddressId: 'addr-1',
  couponCode: null,
  customerNote: null,
  internalNote: null,
  marketplaceId: null,
  marketplaceOrderId: null,
  paidAt: null,
  shippedAt: null,
  deliveredAt: null,
  cancelledAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(inventoryService.reserve).mockResolvedValue(undefined);
});

describe('OrderService.generateOrderNumber()', () => {
  it('should generate order number in VEE-YYYY-NNNNN format', async () => {
    const year = new Date().getFullYear();
    mockDb.order.count.mockResolvedValue(0);

    // Access private method via cast
    const orderNumber = await (service as unknown as { generateOrderNumber: () => Promise<string> }).generateOrderNumber();

    expect(orderNumber).toMatch(/^VEE-\d{4}-\d{5}$/);
    expect(orderNumber).toBe(`VEE-${year}-00001`);
  });

  it('should pad the sequential number to 5 digits', async () => {
    const year = new Date().getFullYear();
    mockDb.order.count.mockResolvedValue(99);

    const orderNumber = await (service as unknown as { generateOrderNumber: () => Promise<string> }).generateOrderNumber();

    expect(orderNumber).toBe(`VEE-${year}-00100`);
  });

  it('should use current year in the order number', async () => {
    const year = new Date().getFullYear();
    mockDb.order.count.mockResolvedValue(0);

    const orderNumber = await (service as unknown as { generateOrderNumber: () => Promise<string> }).generateOrderNumber();

    expect(orderNumber).toContain(`VEE-${year}-`);
  });
});

describe('OrderService.createFromCart()', () => {
  const checkoutInput = {
    cartId: 'cart-1',
    shippingAddress,
  };

  const physicalProduct = {
    id: 'prod-1',
    name: 'Handmade Mug',
    sku: 'VEE-PHY-001',
    type: 'PHYSICAL' as const,
    basePrice: '29.99',
    taxRate: '0.19',
  };

  const cartWithItems = {
    id: 'cart-1',
    customerId: 'cust-1',
    items: [
      {
        id: 'ci-1',
        productId: 'prod-1',
        variantId: 'var-1',
        quantity: 2,
        unitPrice: '29.99',
        personalization: null,
        product: physicalProduct,
        variant: { id: 'var-1', name: 'Blue', sku: 'VEE-PHY-001-BLU' },
      },
    ],
  };

  it('should create an order from a cart', async () => {
    mockDb.cart.findUniqueOrThrow.mockResolvedValue(cartWithItems);
    mockDb.order.count.mockResolvedValue(0);
    mockDb.address.create.mockResolvedValue(baseAddress);
    mockDb.order.create.mockResolvedValue(baseOrder);
    mockDb.cart.delete.mockResolvedValue(cartWithItems);

    const result = await service.createFromCart(checkoutInput, 'cust-1');

    expect(mockDb.order.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(baseOrder);
  });

  it('should throw when cart is empty', async () => {
    mockDb.cart.findUniqueOrThrow.mockResolvedValue({ ...cartWithItems, items: [] });

    await expect(service.createFromCart(checkoutInput, 'cust-1')).rejects.toThrow('Cart is empty');
  });

  it('should reserve inventory for physical items with variants', async () => {
    mockDb.cart.findUniqueOrThrow.mockResolvedValue(cartWithItems);
    mockDb.order.count.mockResolvedValue(0);
    mockDb.address.create.mockResolvedValue(baseAddress);
    mockDb.order.create.mockResolvedValue(baseOrder);
    mockDb.cart.delete.mockResolvedValue(cartWithItems);

    await service.createFromCart(checkoutInput, 'cust-1');

    expect(inventoryService.reserve).toHaveBeenCalledWith('var-1', 2);
  });

  it('should not reserve inventory for digital items', async () => {
    const digitalCart = {
      ...cartWithItems,
      items: [
        {
          ...cartWithItems.items[0],
          product: { ...physicalProduct, type: 'DIGITAL' as const },
        },
      ],
    };
    mockDb.cart.findUniqueOrThrow.mockResolvedValue(digitalCart);
    mockDb.order.count.mockResolvedValue(0);
    mockDb.address.create.mockResolvedValue(baseAddress);
    mockDb.order.create.mockResolvedValue(baseOrder);
    mockDb.cart.delete.mockResolvedValue(digitalCart);

    await service.createFromCart(checkoutInput, 'cust-1');

    expect(inventoryService.reserve).not.toHaveBeenCalled();
  });

  it('should delete the cart after successful order creation', async () => {
    mockDb.cart.findUniqueOrThrow.mockResolvedValue(cartWithItems);
    mockDb.order.count.mockResolvedValue(0);
    mockDb.address.create.mockResolvedValue(baseAddress);
    mockDb.order.create.mockResolvedValue(baseOrder);
    mockDb.cart.delete.mockResolvedValue(cartWithItems);

    await service.createFromCart(checkoutInput, 'cust-1');

    expect(mockDb.cart.delete).toHaveBeenCalledWith({ where: { id: 'cart-1' } });
  });

  it('should create shipping address with customer ID', async () => {
    mockDb.cart.findUniqueOrThrow.mockResolvedValue(cartWithItems);
    mockDb.order.count.mockResolvedValue(0);
    mockDb.address.create.mockResolvedValue(baseAddress);
    mockDb.order.create.mockResolvedValue(baseOrder);
    mockDb.cart.delete.mockResolvedValue(cartWithItems);

    await service.createFromCart(checkoutInput, 'cust-1');

    expect(mockDb.address.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: 'cust-1',
          type: 'SHIPPING',
        }),
      }),
    );
  });
});

describe('OrderService.createFromMarketplace()', () => {
  const marketplaceData = {
    marketplaceId: 'etsy-shop-1',
    marketplaceOrderId: 'etsy-order-999',
    customerEmail: 'buyer@example.com',
    items: [{ sku: 'VEE-PHY-001', name: 'Handmade Mug', quantity: 1, unitPrice: 35.00 }],
    shippingAddress: {
      firstName: 'John',
      lastName: 'Doe',
      street1: '123 Main St',
      city: 'Munich',
      postalCode: '80331',
      country: 'DE',
    },
    total: 35.00,
    paidAt: new Date(),
    source: 'ETSY' as const,
  };

  it('should create a marketplace order', async () => {
    mockDb.order.findFirst.mockResolvedValue(null);
    mockDb.order.count.mockResolvedValue(0);
    mockDb.customer.findUnique.mockResolvedValue({ id: 'cust-2', email: 'buyer@example.com', firstName: 'John', lastName: 'Doe' });
    mockDb.address.create.mockResolvedValue(baseAddress);
    mockDb.productVariant.findUnique.mockResolvedValue(null);
    mockDb.order.create.mockResolvedValue({ ...baseOrder, source: 'ETSY', status: 'CONFIRMED' });

    const result = await service.createFromMarketplace(marketplaceData);

    expect(mockDb.order.create).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
  });

  it('should be idempotent — return existing order when marketplaceOrderId already exists', async () => {
    const existingOrder = { ...baseOrder, marketplaceOrderId: 'etsy-order-999' };
    mockDb.order.findFirst.mockResolvedValue(existingOrder);

    const result = await service.createFromMarketplace(marketplaceData);

    expect(result).toEqual(existingOrder);
    expect(mockDb.order.create).not.toHaveBeenCalled();
    expect(mockDb.customer.findUnique).not.toHaveBeenCalled();
  });

  it('should create a new customer when none exists', async () => {
    mockDb.order.findFirst.mockResolvedValue(null);
    mockDb.order.count.mockResolvedValue(0);
    mockDb.customer.findUnique.mockResolvedValue(null);
    mockDb.customer.create.mockResolvedValue({ id: 'cust-new', email: 'buyer@example.com', firstName: 'John', lastName: 'Doe' });
    mockDb.address.create.mockResolvedValue(baseAddress);
    mockDb.productVariant.findUnique.mockResolvedValue(null);
    mockDb.order.create.mockResolvedValue({ ...baseOrder, source: 'ETSY' });

    await service.createFromMarketplace(marketplaceData);

    expect(mockDb.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'buyer@example.com' }),
      }),
    );
  });

  it('should use existing customer when email already registered', async () => {
    const existingCustomer = { id: 'cust-2', email: 'buyer@example.com', firstName: 'John', lastName: 'Doe' };
    mockDb.order.findFirst.mockResolvedValue(null);
    mockDb.order.count.mockResolvedValue(0);
    mockDb.customer.findUnique.mockResolvedValue(existingCustomer);
    mockDb.address.create.mockResolvedValue(baseAddress);
    mockDb.productVariant.findUnique.mockResolvedValue(null);
    mockDb.order.create.mockResolvedValue({ ...baseOrder, source: 'ETSY' });

    await service.createFromMarketplace(marketplaceData);

    expect(mockDb.customer.create).not.toHaveBeenCalled();
  });
});

describe('OrderService.updateStatus()', () => {
  const pendingOrder = { ...baseOrder, status: 'PENDING' as const };

  it('should update status when transition is valid', async () => {
    mockDb.order.findUniqueOrThrow.mockResolvedValue(pendingOrder);
    mockDb.order.update.mockResolvedValue({ ...pendingOrder, status: 'CONFIRMED' });

    const result = await service.updateStatus('order-1', 'CONFIRMED');

    expect(mockDb.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1' },
        data: expect.objectContaining({ status: 'CONFIRMED' }),
      }),
    );
    expect(result).toMatchObject({ status: 'CONFIRMED' });
  });

  it('should reject invalid status transitions', async () => {
    mockDb.order.findUniqueOrThrow.mockResolvedValue(pendingOrder);

    // PENDING cannot go to SHIPPED directly
    await expect(service.updateStatus('order-1', 'SHIPPED')).rejects.toThrow(
      'Cannot transition from PENDING to SHIPPED',
    );
    expect(mockDb.order.update).not.toHaveBeenCalled();
  });

  it('should set shippedAt when transitioning to SHIPPED', async () => {
    const confirmedOrder = { ...baseOrder, status: 'PROCESSING' as const };
    mockDb.order.findUniqueOrThrow.mockResolvedValue(confirmedOrder);
    mockDb.order.update.mockResolvedValue({ ...confirmedOrder, status: 'SHIPPED', shippedAt: new Date() });

    await service.updateStatus('order-1', 'SHIPPED');

    expect(mockDb.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ shippedAt: expect.any(Date) }),
      }),
    );
  });

  it('should set deliveredAt when transitioning to DELIVERED', async () => {
    const shippedOrder = { ...baseOrder, status: 'SHIPPED' as const };
    mockDb.order.findUniqueOrThrow.mockResolvedValue(shippedOrder);
    mockDb.order.update.mockResolvedValue({ ...shippedOrder, status: 'DELIVERED', deliveredAt: new Date() });

    await service.updateStatus('order-1', 'DELIVERED');

    expect(mockDb.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deliveredAt: expect.any(Date) }),
      }),
    );
  });

  it('should set cancelledAt when transitioning to CANCELLED', async () => {
    mockDb.order.findUniqueOrThrow.mockResolvedValue(pendingOrder);
    mockDb.order.update.mockResolvedValue({ ...pendingOrder, status: 'CANCELLED', cancelledAt: new Date() });

    await service.updateStatus('order-1', 'CANCELLED');

    expect(mockDb.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cancelledAt: expect.any(Date) }),
      }),
    );
  });

  it('should set paidAt when transitioning to CONFIRMED', async () => {
    mockDb.order.findUniqueOrThrow.mockResolvedValue(pendingOrder);
    mockDb.order.update.mockResolvedValue({ ...pendingOrder, status: 'CONFIRMED', paidAt: new Date() });

    await service.updateStatus('order-1', 'CONFIRMED');

    expect(mockDb.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paidAt: expect.any(Date) }),
      }),
    );
  });

  it('should store internalNote when provided', async () => {
    mockDb.order.findUniqueOrThrow.mockResolvedValue(pendingOrder);
    mockDb.order.update.mockResolvedValue({ ...pendingOrder, status: 'CONFIRMED' });

    await service.updateStatus('order-1', 'CONFIRMED', 'Payment confirmed via Stripe');

    expect(mockDb.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ internalNote: 'Payment confirmed via Stripe' }),
      }),
    );
  });

  it('should reject transition from CANCELLED (terminal state)', async () => {
    const cancelledOrder = { ...baseOrder, status: 'CANCELLED' as const };
    mockDb.order.findUniqueOrThrow.mockResolvedValue(cancelledOrder);

    await expect(service.updateStatus('order-1', 'PENDING')).rejects.toThrow(
      'Cannot transition from CANCELLED to PENDING',
    );
  });
});
