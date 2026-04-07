import { db, type Prisma } from '@vee/db';
import type { ProductListInput, ProductCreateInput } from '@vee/shared';
import { generateSlug } from '@vee/shared';
import { meili, PRODUCT_INDEX } from '../lib/meilisearch';
import { cache, hashObject } from '../lib/cache';

const PRODUCT_TTL = 5 * 60;  // 5 minutes
const LIST_TTL = 2 * 60;     // 2 minutes

function productKey(id: string) {
  return `product:${id}`;
}

function productSlugKey(slug: string) {
  return `product:slug:${slug}`;
}

function productListKey(input: ProductListInput) {
  return `products:list:${hashObject(input)}`;
}

export class ProductService {
  /** List products with filters and pagination */
  async list(input: ProductListInput) {
    const cacheKey = productListKey(input);
    return cache.getOrSet(
      cacheKey,
      async () => {
        const { page, limit, type, status, categoryId, search, sortBy, sortOrder } = input;
        const skip = (page - 1) * limit;

        const where: Prisma.ProductWhereInput = {
          ...(type && { type }),
          ...(status && { status }),
          ...(categoryId && {
            categories: { some: { categoryId } },
          }),
          ...(search && {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
            ],
          }),
        };

        const [items, total] = await Promise.all([
          db.product.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: {
              images: { where: { isPrimary: true }, take: 1 },
              categories: { include: { category: { select: { slug: true } } }, take: 1 },
              _count: { select: { variants: true, reviews: true } },
            },
          }),
          db.product.count({ where }),
        ]);

        return {
          items,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      },
      LIST_TTL,
    );
  }

  /** Get a single product by slug with all relations */
  async getBySlug(slug: string) {
    const cacheKey = productSlugKey(slug);
    return cache.getOrSet(
      cacheKey,
      () =>
        db.product.findUnique({
          where: { slug },
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            variants: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              include: { inventory: true },
            },
            files: { where: { isPreview: true } },
            personalizationFields: { orderBy: { sortOrder: 'asc' } },
            categories: { include: { category: true } },
            tags: { include: { tag: true } },
            reviews: { where: { isApproved: true }, orderBy: { createdAt: 'desc' }, take: 10 },
            seoMeta: true,
          },
        }),
      PRODUCT_TTL,
    );
  }

  /** Get a product by ID */
  async getById(id: string) {
    const cacheKey = productKey(id);
    return cache.getOrSet(
      cacheKey,
      () =>
        db.product.findUnique({
          where: { id },
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            variants: { orderBy: { sortOrder: 'asc' }, include: { inventory: true } },
            files: true,
            personalizationFields: { orderBy: { sortOrder: 'asc' } },
            categories: { include: { category: true } },
            tags: { include: { tag: true } },
            seoMeta: true,
          },
        }),
      PRODUCT_TTL,
    );
  }

  /** Create a new product */
  async create(input: ProductCreateInput) {
    const slug = input.slug ?? generateSlug(input.name);

    const product = await db.product.create({
      data: {
        type: input.type,
        name: input.name,
        slug,
        sku: input.sku ?? `VEE-TEMP-${Date.now()}`,
        description: input.description,
        shortDescription: input.shortDescription,
        basePrice: input.basePrice,
        compareAtPrice: input.compareAtPrice,
        costPrice: input.costPrice,
        taxRate: input.taxRate,
        weight: input.weight,
        width: input.width,
        height: input.height,
        length: input.length,
        isFeatured: input.isFeatured,
        isMadeToOrder: input.isMadeToOrder,
        productionDays: input.productionDays,
        attributes: input.attributes ?? undefined,
        isInstantDelivery: input.isInstantDelivery,
        maxDownloads: input.maxDownloads,
        downloadExpiryDays: input.downloadExpiryDays,
        licenseType: input.licenseType,
        ...(input.categoryIds && {
          categories: {
            create: input.categoryIds.map((categoryId, i) => ({
              categoryId,
              sortOrder: i,
            })),
          },
        }),
      },
    });

    // Index in Meilisearch
    await this.indexProduct(product.id);

    // Invalidate list caches so new product appears
    await cache.delPattern('products:list:*');

    return product;
  }

  /** Update a product */
  async update(id: string, input: Partial<ProductCreateInput> & { status?: string }) {
    const product = await db.product.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.slug && { slug: input.slug }),
        ...(input.description && { description: input.description }),
        ...(input.shortDescription !== undefined && { shortDescription: input.shortDescription }),
        ...(input.basePrice && { basePrice: input.basePrice }),
        ...(input.compareAtPrice !== undefined && { compareAtPrice: input.compareAtPrice }),
        ...(input.costPrice !== undefined && { costPrice: input.costPrice }),
        ...(input.taxRate !== undefined && { taxRate: input.taxRate }),
        ...(input.weight !== undefined && { weight: input.weight }),
        ...(input.isFeatured !== undefined && { isFeatured: input.isFeatured }),
        ...(input.isMadeToOrder !== undefined && { isMadeToOrder: input.isMadeToOrder }),
        ...(input.productionDays !== undefined && { productionDays: input.productionDays }),
        ...(input.status && { status: input.status as 'DRAFT' | 'ACTIVE' | 'ARCHIVED' }),
        ...(input.status === 'ACTIVE' && { publishedAt: new Date() }),
      },
    });

    await this.indexProduct(product.id);

    // Invalidate specific product caches + all list caches
    await cache.invalidate(productKey(product.id), productSlugKey(product.slug));
    await cache.delPattern('products:list:*');

    return product;
  }

  /** Delete a product */
  async delete(id: string) {
    // Fetch slug before deletion so we can invalidate the slug cache
    const existing = await db.product.findUnique({ where: { id }, select: { slug: true } });

    await db.product.delete({ where: { id } });
    try {
      await meili.index(PRODUCT_INDEX).deleteDocument(id);
    } catch {
      // Ignore if not indexed
    }

    // Invalidate caches
    await cache.invalidate(productKey(id));
    if (existing) await cache.invalidate(productSlugKey(existing.slug));
    await cache.delPattern('products:list:*');
  }

  /** Index a product in Meilisearch */
  private async indexProduct(productId: string) {
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        categories: { include: { category: { select: { name: true, slug: true } } } },
        tags: { include: { tag: { select: { name: true } } } },
      },
    });

    if (!product || product.status !== 'ACTIVE') return;

    await meili.index(PRODUCT_INDEX).addDocuments([
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        type: product.type,
        description: product.shortDescription ?? product.description.slice(0, 500),
        price: Number(product.basePrice),
        categories: product.categories.map((c) => c.category.name),
        tags: product.tags.map((t) => t.tag.name),
        imageUrl: product.images[0]?.url ?? null,
        isFeatured: product.isFeatured,
        createdAt: product.createdAt.getTime(),
      },
    ]);
  }
}

export const productService = new ProductService();
