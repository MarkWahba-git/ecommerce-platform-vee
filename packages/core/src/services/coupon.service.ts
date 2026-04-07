import { db } from '@vee/db';
import type { Coupon } from '@vee/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  categoryId?: string;
  productType?: string;
}

export interface CartData {
  customerId?: string;
  items: CartItem[];
  subtotal: number;
}

export type ValidateResult =
  | { valid: true; coupon: Coupon }
  | { valid: false; reason: string };

export interface ApplicableTo {
  productIds?: string[];
  categoryIds?: string[];
  productTypes?: string[];
  // BUY_X_GET_Y specific
  buyQuantity?: number;
  getQuantity?: number;
  getProductId?: string;
}

export interface CouponListFilters {
  isActive?: boolean;
  type?: string;
  page?: number;
  limit?: number;
}

export interface CouponCreateInput {
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING' | 'BUY_X_GET_Y';
  value: number;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  applicableTo?: ApplicableTo | null;
  startsAt?: Date | string | null;
  expiresAt?: Date | string | null;
  isActive?: boolean;
}

export interface CouponUpdateInput extends Partial<CouponCreateInput> {}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CouponService {
  /**
   * Full coupon validation against cart context.
   * Returns { valid: true, coupon } or { valid: false, reason }.
   */
  async validate(code: string, cartData: CartData): Promise<ValidateResult> {
    const coupon = await db.coupon.findUnique({ where: { code } });

    if (!coupon || !coupon.isActive) {
      return { valid: false, reason: 'Invalid or inactive coupon code.' };
    }

    const now = new Date();

    if (coupon.startsAt && coupon.startsAt > now) {
      return { valid: false, reason: 'This coupon is not yet valid.' };
    }

    if (coupon.expiresAt && coupon.expiresAt < now) {
      return { valid: false, reason: 'This coupon has expired.' };
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, reason: 'This coupon has reached its usage limit.' };
    }

    // Per-customer limit check
    if (cartData.customerId && coupon.perCustomerLimit !== null) {
      const customerUsageCount = await db.order.count({
        where: {
          customerId: cartData.customerId,
          couponCode: code,
        },
      });
      if (customerUsageCount >= coupon.perCustomerLimit) {
        return {
          valid: false,
          reason: `You have already used this coupon the maximum number of times (${coupon.perCustomerLimit}).`,
        };
      }
    }

    // Minimum order amount
    if (coupon.minOrderAmount !== null && cartData.subtotal < Number(coupon.minOrderAmount)) {
      const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
      return {
        valid: false,
        reason: `Minimum order amount of ${EUR.format(Number(coupon.minOrderAmount))} required.`,
      };
    }

    // Applicable-to check
    if (coupon.applicableTo) {
      const applicable = coupon.applicableTo as ApplicableTo;
      const hasProductIds = applicable.productIds && applicable.productIds.length > 0;
      const hasCategoryIds = applicable.categoryIds && applicable.categoryIds.length > 0;
      const hasProductTypes = applicable.productTypes && applicable.productTypes.length > 0;

      if (hasProductIds || hasCategoryIds || hasProductTypes) {
        const matchingItem = cartData.items.find((item) => {
          if (hasProductIds && applicable.productIds!.includes(item.productId)) return true;
          if (hasCategoryIds && item.categoryId && applicable.categoryIds!.includes(item.categoryId))
            return true;
          if (hasProductTypes && item.productType && applicable.productTypes!.includes(item.productType))
            return true;
          return false;
        });

        if (!matchingItem) {
          return {
            valid: false,
            reason: 'This coupon is not applicable to the items in your cart.',
          };
        }
      }
    }

    return { valid: true, coupon };
  }

  /**
   * Calculate the actual discount amount for a validated coupon.
   * Returns the discount in the same currency unit as subtotal.
   */
  calculateDiscount(
    coupon: Coupon,
    cartData: { items: CartItem[]; subtotal: number },
  ): number {
    const value = Number(coupon.value);
    const { subtotal, items } = cartData;

    switch (coupon.type) {
      case 'PERCENTAGE': {
        const discount = (subtotal * value) / 100;
        const max = coupon.maxDiscountAmount !== null ? Number(coupon.maxDiscountAmount) : Infinity;
        return Math.min(discount, max);
      }

      case 'FIXED_AMOUNT': {
        return Math.min(value, subtotal);
      }

      case 'FREE_SHIPPING': {
        // Shipping cost is computed at checkout; return 0 as sentinel — the
        // caller is responsible for zeroing out the shipping line.
        return 0;
      }

      case 'BUY_X_GET_Y': {
        if (!coupon.applicableTo) return 0;

        const applicable = coupon.applicableTo as ApplicableTo;
        const buyQty = applicable.buyQuantity ?? 1;
        const getQty = applicable.getQuantity ?? 1;
        const getProductId = applicable.getProductId;

        // Determine qualifying items (those listed in productIds, or all if not specified)
        let qualifyingItems = items;
        if (applicable.productIds && applicable.productIds.length > 0) {
          qualifyingItems = items.filter((i) => applicable.productIds!.includes(i.productId));
        }

        const totalQualifyingQty = qualifyingItems.reduce((s, i) => s + i.quantity, 0);
        if (totalQualifyingQty < buyQty) return 0;

        // Items that can be given for free
        let freeItems = qualifyingItems;
        if (getProductId) {
          freeItems = items.filter((i) => i.productId === getProductId);
        }

        // Sort by unit price ascending to give cheapest ones free
        const expandedFreeItems = freeItems
          .flatMap((i) => Array.from({ length: i.quantity }, () => i.unitPrice))
          .sort((a, b) => a - b);

        return expandedFreeItems.slice(0, getQty).reduce((s, p) => s + p, 0);
      }

      default:
        return 0;
    }
  }

  /** Increment the global usageCount for a coupon code. */
  async incrementUsage(code: string) {
    return db.coupon.update({
      where: { code },
      data: { usageCount: { increment: 1 } },
    });
  }

  /** List coupons for admin with optional filters. */
  async list(filters: CouponListFilters = {}) {
    const { isActive, type, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      db.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.coupon.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Create a new coupon with basic validation. */
  async create(data: CouponCreateInput) {
    const existing = await db.coupon.findUnique({ where: { code: data.code } });
    if (existing) {
      throw new Error(`Coupon code "${data.code}" already exists.`);
    }

    return db.coupon.create({
      data: {
        code: data.code.toUpperCase().trim(),
        type: data.type,
        value: data.value,
        minOrderAmount: data.minOrderAmount ?? null,
        maxDiscountAmount: data.maxDiscountAmount ?? null,
        usageLimit: data.usageLimit ?? null,
        perCustomerLimit: data.perCustomerLimit ?? 1,
        applicableTo: data.applicableTo ?? undefined,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: data.isActive ?? true,
      },
    });
  }

  /** Update an existing coupon. */
  async update(id: string, data: CouponUpdateInput) {
    const updateData: Record<string, unknown> = {};

    if (data.code !== undefined) updateData.code = data.code.toUpperCase().trim();
    if (data.type !== undefined) updateData.type = data.type;
    if (data.value !== undefined) updateData.value = data.value;
    if ('minOrderAmount' in data) updateData.minOrderAmount = data.minOrderAmount ?? null;
    if ('maxDiscountAmount' in data) updateData.maxDiscountAmount = data.maxDiscountAmount ?? null;
    if ('usageLimit' in data) updateData.usageLimit = data.usageLimit ?? null;
    if ('perCustomerLimit' in data) updateData.perCustomerLimit = data.perCustomerLimit ?? 1;
    if ('applicableTo' in data) updateData.applicableTo = data.applicableTo ?? undefined;
    if ('startsAt' in data) updateData.startsAt = data.startsAt ? new Date(data.startsAt) : null;
    if ('expiresAt' in data) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return db.coupon.update({ where: { id }, data: updateData });
  }

  /** Deactivate a coupon (soft-disable). */
  async deactivate(id: string) {
    return db.coupon.update({ where: { id }, data: { isActive: false } });
  }
}

export const couponService = new CouponService();
