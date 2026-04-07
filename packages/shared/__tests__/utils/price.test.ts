import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  calculatePersonalizedPrice,
  calculateTaxFromGross,
  calculateNetFromGross,
} from '../../src/utils/price';

describe('formatPrice()', () => {
  it('should format price in EUR with German locale', () => {
    // German locale uses . for thousands and , for decimals, e.g. "29,99 €"
    const result = formatPrice(29.99);
    expect(result).toContain('29');
    expect(result).toContain('99');
    expect(result).toContain('€');
  });

  it('should format zero', () => {
    const result = formatPrice(0);
    expect(result).toContain('0');
    expect(result).toContain('€');
  });

  it('should format large amounts', () => {
    const result = formatPrice(1999.99);
    expect(result).toContain('€');
    // German locale formats 1999.99 as "1.999,99 €"
    expect(result).toMatch(/1[\.,]?999/);
  });

  it('should support different currencies', () => {
    const result = formatPrice(10.00, 'USD', 'en-US');
    expect(result).toContain('$');
    expect(result).toContain('10');
  });

  it('should support different locales', () => {
    const result = formatPrice(29.99, 'EUR', 'en-US');
    expect(result).toContain('€');
    expect(result).toContain('29.99');
  });
});

describe('calculatePersonalizedPrice()', () => {
  it('should add surcharges to base price', () => {
    const result = calculatePersonalizedPrice(29.99, [{ amount: 5.00 }]);
    expect(result).toBeCloseTo(34.99, 2);
  });

  it('should handle multiple surcharges', () => {
    const result = calculatePersonalizedPrice(29.99, [
      { amount: 5.00 },
      { amount: 2.50 },
    ]);
    expect(result).toBeCloseTo(37.49, 2);
  });

  it('should multiply surcharge by quantity when provided', () => {
    const result = calculatePersonalizedPrice(29.99, [{ amount: 2.00, quantity: 3 }]);
    expect(result).toBeCloseTo(35.99, 2);
  });

  it('should default quantity to 1 when not specified', () => {
    const resultWithout = calculatePersonalizedPrice(29.99, [{ amount: 5.00 }]);
    const resultWithOne = calculatePersonalizedPrice(29.99, [{ amount: 5.00, quantity: 1 }]);
    expect(resultWithout).toBeCloseTo(resultWithOne, 5);
  });

  it('should return base price unchanged when no surcharges', () => {
    const result = calculatePersonalizedPrice(29.99, []);
    expect(result).toBeCloseTo(29.99, 2);
  });

  it('should handle mixed surcharges with and without quantity', () => {
    // 29.99 + (5.00 * 1) + (2.00 * 4) = 29.99 + 5.00 + 8.00 = 42.99
    const result = calculatePersonalizedPrice(29.99, [
      { amount: 5.00 },
      { amount: 2.00, quantity: 4 },
    ]);
    expect(result).toBeCloseTo(42.99, 2);
  });
});

describe('calculateTaxFromGross()', () => {
  it('should calculate tax at 19% correctly', () => {
    // Tax = gross - gross/(1+0.19) = 119 - 119/1.19 = 119 - 100 = 19
    const result = calculateTaxFromGross(119, 0.19);
    expect(result).toBeCloseTo(19, 2);
  });

  it('should calculate tax from a typical product price', () => {
    // gross = 29.99, tax = 29.99 - 29.99/1.19 ≈ 4.79
    const result = calculateTaxFromGross(29.99, 0.19);
    expect(result).toBeCloseTo(4.79, 2);
  });

  it('should return zero tax for 0% tax rate', () => {
    const result = calculateTaxFromGross(100, 0);
    expect(result).toBe(0);
  });

  it('should calculate tax at 7% correctly', () => {
    // gross = 107, tax = 107 - 107/1.07 = 107 - 100 = 7
    const result = calculateTaxFromGross(107, 0.07);
    expect(result).toBeCloseTo(7, 2);
  });
});

describe('calculateNetFromGross()', () => {
  it('should calculate net price at 19% correctly', () => {
    // net = 119 / 1.19 = 100
    const result = calculateNetFromGross(119, 0.19);
    expect(result).toBeCloseTo(100, 2);
  });

  it('should calculate net from a typical product price', () => {
    // net = 29.99 / 1.19 ≈ 25.20
    const result = calculateNetFromGross(29.99, 0.19);
    expect(result).toBeCloseTo(25.20, 1);
  });

  it('should return gross unchanged for 0% tax rate', () => {
    const result = calculateNetFromGross(100, 0);
    expect(result).toBe(100);
  });

  it('should calculate net at 7% correctly', () => {
    // net = 107 / 1.07 = 100
    const result = calculateNetFromGross(107, 0.07);
    expect(result).toBeCloseTo(100, 2);
  });

  it('net + tax should equal gross', () => {
    const gross = 49.99;
    const taxRate = 0.19;
    const net = calculateNetFromGross(gross, taxRate);
    const tax = calculateTaxFromGross(gross, taxRate);
    expect(net + tax).toBeCloseTo(gross, 5);
  });
});
