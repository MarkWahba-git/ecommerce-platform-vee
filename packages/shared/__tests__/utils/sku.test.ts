import { describe, it, expect } from 'vitest';
import { generateMasterSku, generateVariantSku } from '../../src/utils/sku';

describe('generateMasterSku()', () => {
  it('should generate SKU in VEE-TYPE-SEQ format for PHYSICAL', () => {
    expect(generateMasterSku('PHYSICAL', 1)).toBe('VEE-PHY-001');
  });

  it('should generate SKU for DIGITAL type', () => {
    expect(generateMasterSku('DIGITAL', 5)).toBe('VEE-DIG-005');
  });

  it('should generate SKU for PERSONALIZED type', () => {
    expect(generateMasterSku('PERSONALIZED', 42)).toBe('VEE-PER-042');
  });

  it('should pad sequential number to 3 digits', () => {
    expect(generateMasterSku('PHYSICAL', 1)).toBe('VEE-PHY-001');
    expect(generateMasterSku('PHYSICAL', 9)).toBe('VEE-PHY-009');
  });

  it('should handle sequential numbers >= 100 without truncation', () => {
    expect(generateMasterSku('PHYSICAL', 100)).toBe('VEE-PHY-100');
    expect(generateMasterSku('PHYSICAL', 999)).toBe('VEE-PHY-999');
  });

  it('should handle large sequential numbers beyond 3 digits', () => {
    expect(generateMasterSku('PHYSICAL', 1000)).toBe('VEE-PHY-1000');
  });
});

describe('generateVariantSku()', () => {
  it('should append option codes to master SKU', () => {
    expect(generateVariantSku('VEE-PHY-001', ['BLU', 'M'])).toBe('VEE-PHY-001-BLU-M');
  });

  it('should convert option codes to uppercase', () => {
    expect(generateVariantSku('VEE-PHY-001', ['blue', 'medium'])).toBe('VEE-PHY-001-BLU-MED');
  });

  it('should truncate option codes to 3 characters', () => {
    expect(generateVariantSku('VEE-PHY-001', ['BLUE', 'MEDIUM'])).toBe('VEE-PHY-001-BLU-MED');
  });

  it('should handle single option code', () => {
    expect(generateVariantSku('VEE-DIG-005', ['PDF'])).toBe('VEE-DIG-005-PDF');
  });

  it('should handle multiple option codes', () => {
    expect(generateVariantSku('VEE-PER-010', ['RED', 'LRG', 'MAT'])).toBe(
      'VEE-PER-010-RED-LRG-MAT',
    );
  });

  it('should handle short option codes without padding', () => {
    expect(generateVariantSku('VEE-PHY-001', ['XL'])).toBe('VEE-PHY-001-XL');
  });
});
