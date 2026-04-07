import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../mocks/db';
import { mockDb } from '../mocks/db';

import { CartService } from '../../src/services/cart.service';

const service = new CartService();

const baseCart = {
  id: 'cart-1',
  customerId: 'cust-1',
  sessionId: null,
  couponCode: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [],
};

const baseCartItem = {
  id: 'item-1',
  cartId: 'cart-1',
  productId: 'prod-1',
  variantId: null,
  quantity: 2,
  unitPrice: '29.99',
  personalization: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('CartService.getOrCreate()', () => {
  it('should return existing cart for customerId', async () => {
    mockDb.cart.findFirst.mockResolvedValue(baseCart);

    const result = await service.getOrCreate('cust-1');

    expect(mockDb.cart.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerId: 'cust-1' },
      }),
    );
    expect(result).toEqual(baseCart);
    expect(mockDb.cart.create).not.toHaveBeenCalled();
  });

  it('should return existing cart for sessionId', async () => {
    mockDb.cart.findFirst.mockResolvedValue({ ...baseCart, customerId: null, sessionId: 'sess-1' });

    const result = await service.getOrCreate(undefined, 'sess-1');

    expect(mockDb.cart.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: 'sess-1' },
      }),
    );
    expect(result).toBeDefined();
  });

  it('should create new cart when none exists', async () => {
    const newCart = { ...baseCart, items: [] };
    mockDb.cart.findFirst.mockResolvedValue(null);
    mockDb.cart.create.mockResolvedValue(newCart);

    const result = await service.getOrCreate('cust-1');

    expect(mockDb.cart.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { customerId: 'cust-1', sessionId: undefined },
      }),
    );
    expect(result).toEqual(newCart);
  });

  it('should throw when neither customerId nor sessionId provided', async () => {
    await expect(service.getOrCreate()).rejects.toThrow(
      'Either customerId or sessionId is required',
    );
  });
});

describe('CartService.addItem()', () => {
  const addInput = {
    productId: 'prod-1',
    quantity: 2,
  };

  it('should create new cart item when no existing item', async () => {
    mockDb.product.findUniqueOrThrow.mockResolvedValue({ basePrice: '29.99' });
    mockDb.cartItem.findFirst.mockResolvedValue(null);
    mockDb.cartItem.create.mockResolvedValue(baseCartItem);

    await service.addItem('cart-1', addInput);

    expect(mockDb.cartItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cartId: 'cart-1',
          productId: 'prod-1',
          quantity: 2,
          unitPrice: 29.99,
        }),
      }),
    );
  });

  it('should merge with existing item by incrementing quantity', async () => {
    mockDb.product.findUniqueOrThrow.mockResolvedValue({ basePrice: '29.99' });
    mockDb.cartItem.findFirst.mockResolvedValue(baseCartItem);
    mockDb.cartItem.update.mockResolvedValue({ ...baseCartItem, quantity: 4 });

    await service.addItem('cart-1', addInput);

    expect(mockDb.cartItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { quantity: { increment: 2 } },
    });
    expect(mockDb.cartItem.create).not.toHaveBeenCalled();
  });

  it('should use variant price when variant has a price override', async () => {
    mockDb.product.findUniqueOrThrow.mockResolvedValue({ basePrice: '29.99' });
    mockDb.productVariant.findUnique.mockResolvedValue({ price: '39.99' });
    mockDb.cartItem.findFirst.mockResolvedValue(null);
    mockDb.cartItem.create.mockResolvedValue({ ...baseCartItem, unitPrice: '39.99' });

    await service.addItem('cart-1', { ...addInput, variantId: 'var-1' });

    expect(mockDb.cartItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ unitPrice: 39.99 }),
      }),
    );
  });

  it('should use product base price when variant has no price override', async () => {
    mockDb.product.findUniqueOrThrow.mockResolvedValue({ basePrice: '29.99' });
    mockDb.productVariant.findUnique.mockResolvedValue({ price: null });
    mockDb.cartItem.findFirst.mockResolvedValue(null);
    mockDb.cartItem.create.mockResolvedValue(baseCartItem);

    await service.addItem('cart-1', { ...addInput, variantId: 'var-1' });

    expect(mockDb.cartItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ unitPrice: 29.99 }),
      }),
    );
  });

  it('should always create a new item when personalization is provided', async () => {
    const personalization = { name: 'John', message: 'Happy Birthday!' };
    mockDb.product.findUniqueOrThrow.mockResolvedValue({ basePrice: '29.99' });
    mockDb.cartItem.findFirst.mockResolvedValue(baseCartItem); // existing item
    mockDb.cartItem.create.mockResolvedValue({ ...baseCartItem, personalization });

    await service.addItem('cart-1', { ...addInput, personalization });

    // With personalization, should create new item even if one exists
    expect(mockDb.cartItem.create).toHaveBeenCalled();
  });
});

describe('CartService.updateItem()', () => {
  it('should update quantity of cart item', async () => {
    mockDb.cartItem.update.mockResolvedValue({ ...baseCartItem, quantity: 5 });

    await service.updateItem('item-1', { quantity: 5 });

    expect(mockDb.cartItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { quantity: 5 },
    });
  });
});

describe('CartService.removeItem()', () => {
  it('should delete cart item', async () => {
    mockDb.cartItem.delete.mockResolvedValue(baseCartItem);

    await service.removeItem('item-1');

    expect(mockDb.cartItem.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
  });
});

describe('CartService.applyCoupon()', () => {
  const activeCoupon = {
    id: 'coupon-1',
    code: 'SAVE10',
    isActive: true,
    expiresAt: null,
    usageLimit: null,
    usageCount: 0,
    discountType: 'PERCENTAGE',
    discountValue: '10',
  };

  it('should apply a valid active coupon to the cart', async () => {
    mockDb.coupon.findUnique.mockResolvedValue(activeCoupon);
    mockDb.cart.update.mockResolvedValue({ ...baseCart, couponCode: 'SAVE10' });

    await service.applyCoupon('cart-1', 'SAVE10');

    expect(mockDb.cart.update).toHaveBeenCalledWith({
      where: { id: 'cart-1' },
      data: { couponCode: 'SAVE10' },
    });
  });

  it('should throw when coupon does not exist', async () => {
    mockDb.coupon.findUnique.mockResolvedValue(null);

    await expect(service.applyCoupon('cart-1', 'INVALID')).rejects.toThrow(
      'Invalid or inactive coupon code',
    );
  });

  it('should throw when coupon is inactive', async () => {
    mockDb.coupon.findUnique.mockResolvedValue({ ...activeCoupon, isActive: false });

    await expect(service.applyCoupon('cart-1', 'SAVE10')).rejects.toThrow(
      'Invalid or inactive coupon code',
    );
  });

  it('should throw when coupon has expired', async () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // yesterday
    mockDb.coupon.findUnique.mockResolvedValue({ ...activeCoupon, expiresAt: pastDate });

    await expect(service.applyCoupon('cart-1', 'SAVE10')).rejects.toThrow('Coupon has expired');
  });

  it('should throw when usage limit is reached', async () => {
    mockDb.coupon.findUnique.mockResolvedValue({
      ...activeCoupon,
      usageLimit: 100,
      usageCount: 100,
    });

    await expect(service.applyCoupon('cart-1', 'SAVE10')).rejects.toThrow(
      'Coupon usage limit reached',
    );
  });

  it('should allow coupon when usage count is below limit', async () => {
    mockDb.coupon.findUnique.mockResolvedValue({
      ...activeCoupon,
      usageLimit: 100,
      usageCount: 50,
    });
    mockDb.cart.update.mockResolvedValue({ ...baseCart, couponCode: 'SAVE10' });

    await expect(service.applyCoupon('cart-1', 'SAVE10')).resolves.toBeDefined();
  });
});

describe('CartService.removeCoupon()', () => {
  it('should clear couponCode from cart', async () => {
    mockDb.cart.update.mockResolvedValue({ ...baseCart, couponCode: null });

    await service.removeCoupon('cart-1');

    expect(mockDb.cart.update).toHaveBeenCalledWith({
      where: { id: 'cart-1' },
      data: { couponCode: null },
    });
  });
});
