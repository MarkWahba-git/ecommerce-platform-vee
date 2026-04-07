import { describe, it, expect } from 'vitest';
import { checkoutSchema, addressSchema, orderListSchema } from '../../src/schemas/order.schema';

describe('addressSchema', () => {
  const validAddress = {
    firstName: 'Anna',
    lastName: 'Müller',
    street1: 'Hauptstraße 1',
    city: 'Berlin',
    postalCode: '10115',
    country: 'DE',
  };

  it('should accept a valid address', () => {
    const result = addressSchema.safeParse(validAddress);
    expect(result.success).toBe(true);
  });

  it('should accept a full address with optional fields', () => {
    const full = {
      ...validAddress,
      company: 'Acme GmbH',
      street2: 'Apartment 5',
      state: 'Berlin',
      phone: '+49 30 12345678',
    };
    const result = addressSchema.safeParse(full);
    expect(result.success).toBe(true);
  });

  it('should default country to DE when not provided', () => {
    const { country: _c, ...withoutCountry } = validAddress;
    const result = addressSchema.safeParse(withoutCountry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.country).toBe('DE');
    }
  });

  it('should reject when firstName is missing', () => {
    const { firstName: _f, ...withoutFirst } = validAddress;
    const result = addressSchema.safeParse(withoutFirst);
    expect(result.success).toBe(false);
  });

  it('should reject when firstName is empty', () => {
    const result = addressSchema.safeParse({ ...validAddress, firstName: '' });
    expect(result.success).toBe(false);
  });

  it('should reject when lastName is missing', () => {
    const { lastName: _l, ...withoutLast } = validAddress;
    const result = addressSchema.safeParse(withoutLast);
    expect(result.success).toBe(false);
  });

  it('should reject when street1 is missing', () => {
    const { street1: _s, ...withoutStreet } = validAddress;
    const result = addressSchema.safeParse(withoutStreet);
    expect(result.success).toBe(false);
  });

  it('should reject when street1 is empty', () => {
    const result = addressSchema.safeParse({ ...validAddress, street1: '' });
    expect(result.success).toBe(false);
  });

  it('should reject when city is missing', () => {
    const { city: _c, ...withoutCity } = validAddress;
    const result = addressSchema.safeParse(withoutCity);
    expect(result.success).toBe(false);
  });

  it('should reject when postalCode is missing', () => {
    const { postalCode: _p, ...withoutPostal } = validAddress;
    const result = addressSchema.safeParse(withoutPostal);
    expect(result.success).toBe(false);
  });

  it('should reject when postalCode is empty', () => {
    const result = addressSchema.safeParse({ ...validAddress, postalCode: '' });
    expect(result.success).toBe(false);
  });
});

describe('checkoutSchema', () => {
  const validAddress = {
    firstName: 'Anna',
    lastName: 'Müller',
    street1: 'Hauptstraße 1',
    city: 'Berlin',
    postalCode: '10115',
    country: 'DE',
  };

  const validCheckout = {
    cartId: 'cart-abc-123',
    shippingAddress: validAddress,
  };

  it('should accept a valid checkout input', () => {
    const result = checkoutSchema.safeParse(validCheckout);
    expect(result.success).toBe(true);
  });

  it('should accept checkout with billing address', () => {
    const result = checkoutSchema.safeParse({
      ...validCheckout,
      billingAddress: validAddress,
    });
    expect(result.success).toBe(true);
  });

  it('should accept checkout with customer note', () => {
    const result = checkoutSchema.safeParse({
      ...validCheckout,
      customerNote: 'Please gift wrap',
    });
    expect(result.success).toBe(true);
  });

  it('should accept checkout with coupon code', () => {
    const result = checkoutSchema.safeParse({
      ...validCheckout,
      couponCode: 'SAVE10',
    });
    expect(result.success).toBe(true);
  });

  it('should reject when cartId is missing', () => {
    const { cartId: _c, ...withoutCart } = validCheckout;
    const result = checkoutSchema.safeParse(withoutCart);
    expect(result.success).toBe(false);
  });

  it('should reject when shippingAddress is missing', () => {
    const { shippingAddress: _s, ...withoutAddress } = validCheckout;
    const result = checkoutSchema.safeParse(withoutAddress);
    expect(result.success).toBe(false);
  });

  it('should reject when shippingAddress is invalid', () => {
    const result = checkoutSchema.safeParse({
      ...validCheckout,
      shippingAddress: { firstName: 'Anna' }, // missing required fields
    });
    expect(result.success).toBe(false);
  });

  it('should reject customerNote exceeding 1000 characters', () => {
    const result = checkoutSchema.safeParse({
      ...validCheckout,
      customerNote: 'x'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it('should allow billingAddress to be omitted (uses shipping address)', () => {
    const result = checkoutSchema.safeParse(validCheckout);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.billingAddress).toBeUndefined();
    }
  });
});

describe('orderListSchema', () => {
  it('should use defaults when no input provided', () => {
    const result = orderListSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sortBy).toBe('createdAt');
      expect(result.data.sortOrder).toBe('desc');
    }
  });

  it('should accept valid status filter', () => {
    const statuses = [
      'PENDING', 'CONFIRMED', 'PROCESSING', 'AWAITING_APPROVAL',
      'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED',
    ];
    for (const status of statuses) {
      const result = orderListSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('should accept valid source filter', () => {
    for (const source of ['WEBSITE', 'ETSY', 'AMAZON', 'MANUAL']) {
      const result = orderListSchema.safeParse({ source });
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid status', () => {
    const result = orderListSchema.safeParse({ status: 'OPEN' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid source', () => {
    const result = orderListSchema.safeParse({ source: 'EBAY' });
    expect(result.success).toBe(false);
  });

  it('should reject page < 1', () => {
    const result = orderListSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject limit > 100', () => {
    const result = orderListSchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('should accept search term', () => {
    const result = orderListSchema.safeParse({ search: 'VEE-2026-00001' });
    expect(result.success).toBe(true);
  });
});
