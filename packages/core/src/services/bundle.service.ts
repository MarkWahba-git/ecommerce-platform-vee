import { db } from '@vee/db';
import { generateSlug } from '@vee/shared';
import { inventoryService } from './inventory.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BundleItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface BundleCreateInput {
  name: string;
  slug?: string;
  sku: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  items: BundleItem[];
}

interface ExpandedBundleItem {
  product: {
    id: string;
    name: string;
    sku: string;
    slug: string;
    basePrice: string;
    images: { url: string; altText: string | null; isPrimary: boolean }[];
  };
  variant: {
    id: string;
    name: string;
    sku: string;
    price: string | null;
  } | null;
  quantity: number;
  individualPrice: number;
}

export interface BundleDetail {
  product: {
    id: string;
    name: string;
    sku: string;
    slug: string;
    basePrice: string;
    description: string;
    shortDescription: string | null;
    status: string;
    attributes: unknown;
    createdAt: Date;
    updatedAt: Date;
  };
  items: ExpandedBundleItem[];
  totalIndividualPrice: number;
  savings: number;
  savingsPercent: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Attribute shape stored on the Product.attributes JSON column */
interface BundleAttributes {
  isBundle: true;
  bundleItems: BundleItem[];
}

function isBundleAttributes(val: unknown): val is BundleAttributes {
  if (!val || typeof val !== 'object') return false;
  const v = val as Record<string, unknown>;
  return v.isBundle === true && Array.isArray(v.bundleItems);
}

// ---------------------------------------------------------------------------
// Bundle Service
// ---------------------------------------------------------------------------

export class BundleService {
  /**
   * Create a product that represents a bundle.
   * Validates all referenced products and their variants exist before persisting.
   */
  async create(data: BundleCreateInput) {
    // Validate all referenced products/variants exist
    await this.validateItemsExist(data.items);

    const slug = data.slug ?? generateSlug(data.name);

    const attributes: BundleAttributes = {
      isBundle: true,
      bundleItems: data.items,
    };

    return db.product.create({
      data: {
        type: 'PHYSICAL',
        name: data.name,
        slug,
        sku: data.sku,
        description: data.description,
        shortDescription: data.shortDescription ?? null,
        basePrice: data.price,
        compareAtPrice: data.compareAtPrice ?? null,
        attributes: attributes as unknown as Record<string, unknown>,
        status: 'DRAFT',
      },
    });
  }

  /**
   * Get a single bundle with fully expanded item details.
   */
  async getBundle(productId: string): Promise<BundleDetail | null> {
    const product = await db.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        sku: true,
        slug: true,
        basePrice: true,
        description: true,
        shortDescription: true,
        status: true,
        attributes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!product) return null;
    if (!isBundleAttributes(product.attributes)) return null;

    const items = await this.expandItems(product.attributes.bundleItems);

    const totalIndividualPrice = items.reduce(
      (sum, item) => sum + item.individualPrice * item.quantity,
      0,
    );
    const bundlePrice = Number(product.basePrice);
    const savings = Math.max(0, totalIndividualPrice - bundlePrice);
    const savingsPercent =
      totalIndividualPrice > 0 ? (savings / totalIndividualPrice) * 100 : 0;

    return {
      product: {
        ...product,
        basePrice: product.basePrice.toString(),
      },
      items,
      totalIndividualPrice,
      savings,
      savingsPercent,
    };
  }

  /**
   * List all products that are bundles (attributes.isBundle = true).
   */
  async listBundles() {
    // PostgreSQL JSON operator to filter on the isBundle flag
    const bundles = await db.$queryRaw<
      {
        id: string;
        name: string;
        sku: string;
        slug: string;
        base_price: unknown;
        status: string;
        attributes: unknown;
        created_at: Date;
        updated_at: Date;
      }[]
    >`
      SELECT id, name, sku, slug, base_price, status, attributes, created_at, updated_at
      FROM products
      WHERE (attributes->>'isBundle')::boolean = true
      ORDER BY created_at DESC
    `;

    return bundles.map((b) => {
      const attrs = b.attributes as unknown;
      const bundleItems: BundleItem[] = isBundleAttributes(attrs)
        ? attrs.bundleItems
        : [];

      return {
        id: b.id,
        name: b.name,
        sku: b.sku,
        slug: b.slug,
        basePrice: Number(b.base_price),
        status: b.status,
        itemCount: bundleItems.length,
        attributes: b.attributes,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      };
    });
  }

  /**
   * Replace the bundle item composition.
   */
  async updateItems(productId: string, items: BundleItem[]) {
    await this.validateItemsExist(items);

    const product = await db.product.findUniqueOrThrow({ where: { id: productId } });
    if (!isBundleAttributes(product.attributes)) {
      throw new Error(`Product ${productId} is not a bundle`);
    }

    const newAttributes: BundleAttributes = {
      isBundle: true,
      bundleItems: items,
    };

    return db.product.update({
      where: { id: productId },
      data: { attributes: newAttributes as unknown as Record<string, unknown> },
    });
  }

  /**
   * Verify all bundle items have sufficient stock to fulfil `quantity` bundles.
   */
  async validateStock(productId: string, quantity: number): Promise<boolean> {
    const product = await db.product.findUniqueOrThrow({ where: { id: productId } });
    if (!isBundleAttributes(product.attributes)) {
      throw new Error(`Product ${productId} is not a bundle`);
    }

    const variantIds = product.attributes.bundleItems
      .filter((item) => item.variantId)
      .map((item) => item.variantId!);

    if (variantIds.length === 0) return true; // no inventory-tracked items

    const inventories = await db.inventory.findMany({
      where: { variantId: { in: variantIds }, trackInventory: true },
    });

    for (const bundleItem of product.attributes.bundleItems) {
      if (!bundleItem.variantId) continue;
      const inv = inventories.find((i) => i.variantId === bundleItem.variantId);
      if (!inv) continue;
      const available = inv.quantity - inv.reservedQuantity;
      if (available < bundleItem.quantity * quantity) {
        return false;
      }
    }

    return true;
  }

  /**
   * Reserve inventory for all bundle items across all tracked variants.
   */
  async reserveStock(productId: string, quantity: number): Promise<void> {
    const product = await db.product.findUniqueOrThrow({ where: { id: productId } });
    if (!isBundleAttributes(product.attributes)) {
      throw new Error(`Product ${productId} is not a bundle`);
    }

    for (const bundleItem of product.attributes.bundleItems) {
      if (!bundleItem.variantId) continue;
      await inventoryService.reserve(bundleItem.variantId, bundleItem.quantity * quantity);
    }
  }

  /**
   * Compare bundle price to the sum of individual item prices.
   */
  async calculateSavings(
    productId: string,
  ): Promise<{ totalIndividualPrice: number; savings: number; savingsPercent: number }> {
    const detail = await this.getBundle(productId);
    if (!detail) throw new Error(`Bundle ${productId} not found`);

    return {
      totalIndividualPrice: detail.totalIndividualPrice,
      savings: detail.savings,
      savingsPercent: detail.savingsPercent,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async validateItemsExist(items: BundleItem[]): Promise<void> {
    for (const item of items) {
      const product = await db.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }
      if (item.variantId) {
        const variant = await db.productVariant.findUnique({
          where: { id: item.variantId },
        });
        if (!variant || variant.productId !== item.productId) {
          throw new Error(
            `Variant ${item.variantId} not found or does not belong to product ${item.productId}`,
          );
        }
      }
    }
  }

  private async expandItems(bundleItems: BundleItem[]): Promise<ExpandedBundleItem[]> {
    const results: ExpandedBundleItem[] = [];

    for (const item of bundleItems) {
      const [product, variant] = await Promise.all([
        db.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            sku: true,
            slug: true,
            basePrice: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true, altText: true, isPrimary: true },
            },
          },
        }),
        item.variantId
          ? db.productVariant.findUnique({
              where: { id: item.variantId },
              select: { id: true, name: true, sku: true, price: true },
            })
          : Promise.resolve(null),
      ]);

      if (!product) continue;

      const unitPrice = variant?.price
        ? Number(variant.price)
        : Number(product.basePrice);

      results.push({
        product: {
          ...product,
          basePrice: product.basePrice.toString(),
        },
        variant: variant
          ? { ...variant, price: variant.price?.toString() ?? null }
          : null,
        quantity: item.quantity,
        individualPrice: unitPrice,
      });
    }

    return results;
  }
}

export const bundleService = new BundleService();
