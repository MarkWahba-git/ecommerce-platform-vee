import type { ProductType } from '../constants/product-types';

const TYPE_PREFIX: Record<ProductType, string> = {
  PHYSICAL: 'PHY',
  DIGITAL: 'DIG',
  PERSONALIZED: 'PER',
};

/**
 * Generate a master SKU for a product.
 * Format: VEE-{TYPE}-{SEQUENTIAL}
 * Example: VEE-PHY-001
 */
export function generateMasterSku(type: ProductType, sequentialNumber: number): string {
  const prefix = TYPE_PREFIX[type];
  const padded = String(sequentialNumber).padStart(3, '0');
  return `VEE-${prefix}-${padded}`;
}

/**
 * Generate a variant SKU by appending option codes to the master SKU.
 * Format: VEE-{TYPE}-{SEQ}-{OPTION1}-{OPTION2}
 * Example: VEE-PHY-001-BLU-M
 */
export function generateVariantSku(masterSku: string, optionCodes: string[]): string {
  const suffix = optionCodes.map((code) => code.toUpperCase().slice(0, 3)).join('-');
  return `${masterSku}-${suffix}`;
}
