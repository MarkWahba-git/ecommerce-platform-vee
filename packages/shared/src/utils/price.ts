/**
 * Format a price in EUR.
 */
export function formatPrice(amount: number, currency = 'EUR', locale = 'de-DE'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Calculate total price with personalization surcharges.
 */
export function calculatePersonalizedPrice(
  basePrice: number,
  surcharges: { amount: number; quantity?: number }[],
): number {
  const totalSurcharge = surcharges.reduce(
    (sum, s) => sum + s.amount * (s.quantity ?? 1),
    0,
  );
  return basePrice + totalSurcharge;
}

/**
 * Calculate tax amount from gross price (German tax-inclusive pricing).
 */
export function calculateTaxFromGross(grossPrice: number, taxRate: number): number {
  return grossPrice - grossPrice / (1 + taxRate);
}

/**
 * Calculate net price from gross.
 */
export function calculateNetFromGross(grossPrice: number, taxRate: number): number {
  return grossPrice / (1 + taxRate);
}
