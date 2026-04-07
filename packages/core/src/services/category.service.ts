import { db } from '@vee/db';
import { cache } from '../lib/cache';

const CATEGORY_TTL = 10 * 60; // 10 minutes

const CATEGORY_TREE_KEY = 'categories:tree';

export class CategoryService {
  /**
   * Return the full active category tree (top-level categories with their
   * immediate children), cached for 10 minutes.
   */
  async getTree() {
    return cache.getOrSet(
      CATEGORY_TREE_KEY,
      () =>
        db.category.findMany({
          where: { isActive: true, parentId: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            seoMeta: true,
            children: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        }),
      CATEGORY_TTL,
    );
  }

  /** Get a single category by slug, with SEO meta. */
  async getBySlug(slug: string) {
    return cache.getOrSet(
      `category:slug:${slug}`,
      () =>
        db.category.findUnique({
          where: { slug },
          include: {
            seoMeta: true,
            children: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        }),
      CATEGORY_TTL,
    );
  }

  /** Invalidate category tree cache (call after any category mutation). */
  async invalidateTree(): Promise<void> {
    await cache.del(CATEGORY_TREE_KEY);
  }
}

export const categoryService = new CategoryService();
