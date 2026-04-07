import { db } from '@vee/db';
import { cache } from './cache';
import { createLogger } from './logger';

const logger = createLogger('CacheWarmer');

const PRODUCT_TTL = 5 * 60;    // 5 minutes
const CATEGORY_TTL = 10 * 60;  // 10 minutes
const WARM_PRODUCT_LIMIT = 50;

/**
 * Pre-fetch and cache the top 50 active products ordered by featured status.
 */
export async function warmProductCache(): Promise<void> {
  logger.info('Warming product cache...');
  const start = Date.now();

  try {
    const products = await db.product.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: WARM_PRODUCT_LIMIT,
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
    });

    await Promise.all(
      products.flatMap((product) => [
        cache.set(`product:${product.id}`, product, PRODUCT_TTL),
        cache.set(`product:slug:${product.slug}`, product, PRODUCT_TTL),
      ]),
    );

    logger.info('Product cache warmed', {
      count: products.length,
      durationMs: Date.now() - start,
    });
  } catch (error) {
    logger.error('Failed to warm product cache', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Pre-fetch and cache the active category tree.
 */
export async function warmCategoryCache(): Promise<void> {
  logger.info('Warming category cache...');
  const start = Date.now();

  try {
    const categories = await db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        seoMeta: true,
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    await cache.set('categories:tree', categories, CATEGORY_TTL);

    logger.info('Category cache warmed', {
      count: categories.length,
      durationMs: Date.now() - start,
    });
  } catch (error) {
    logger.error('Failed to warm category cache', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Run all cache warming tasks in parallel.
 * Call this on application/worker startup.
 */
export async function warmCaches(): Promise<void> {
  logger.info('Starting cache warm-up...');
  await Promise.all([warmProductCache(), warmCategoryCache()]);
  logger.info('Cache warm-up complete.');
}
