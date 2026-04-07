import { db } from '@vee/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ReviewListFilters {
  status?: ReviewStatus;
  productId?: string;
  customerId?: string;
  page?: number;
  limit?: number;
}

export interface ReviewStats {
  total: number;
  pending: number;
  approved: number;
  averageRating: number;
}

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface ProductRatingStats {
  averageRating: number;
  totalReviews: number;
  distribution: RatingDistribution;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ReviewService {
  /** List reviews with optional filters. */
  async list(filters: ReviewListFilters = {}) {
    const { status, productId, customerId, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (productId) where.productId = productId;
    if (customerId) where.customerId = customerId;
    if (status === 'pending') where.isApproved = false;
    else if (status === 'approved') where.isApproved = true;
    // 'rejected' is surfaced as deleted records — not queryable here

    const [items, total] = await Promise.all([
      db.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, slug: true } },
          customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      db.review.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Get a single review with product and customer details. */
  async getById(id: string) {
    return db.review.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  /** Approve a review (set isApproved = true). */
  async approve(id: string) {
    return db.review.update({
      where: { id },
      data: { isApproved: true },
    });
  }

  /** Reject a review (set isApproved = false). */
  async reject(id: string) {
    return db.review.update({
      where: { id },
      data: { isApproved: false },
    });
  }

  /** Permanently delete a review. */
  async delete(id: string) {
    return db.review.delete({ where: { id } });
  }

  /** Bulk approve multiple reviews in one transaction. */
  async bulkApprove(ids: string[]) {
    return db.$transaction(
      ids.map((id) =>
        db.review.update({ where: { id }, data: { isApproved: true } }),
      ),
    );
  }

  /** Bulk reject multiple reviews in one transaction. */
  async bulkReject(ids: string[]) {
    return db.$transaction(
      ids.map((id) =>
        db.review.update({ where: { id }, data: { isApproved: false } }),
      ),
    );
  }

  /** Return aggregate stats for the review moderation dashboard. */
  async getStats(): Promise<ReviewStats> {
    const [total, pending, approved, avgResult] = await Promise.all([
      db.review.count(),
      db.review.count({ where: { isApproved: false } }),
      db.review.count({ where: { isApproved: true } }),
      db.review.aggregate({ _avg: { rating: true } }),
    ]);

    return {
      total,
      pending,
      approved,
      averageRating: Math.round((avgResult._avg.rating ?? 0) * 10) / 10,
    };
  }

  /** Rating distribution stats for a specific product. */
  async getProductRatingStats(productId: string): Promise<ProductRatingStats> {
    const reviews = await db.review.findMany({
      where: { productId, isApproved: true },
      select: { rating: true },
    });

    const distribution: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let ratingSum = 0;

    for (const r of reviews) {
      const star = r.rating as 1 | 2 | 3 | 4 | 5;
      if (star >= 1 && star <= 5) {
        distribution[star]++;
        ratingSum += star;
      }
    }

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0 ? Math.round((ratingSum / totalReviews) * 10) / 10 : 0;

    return { averageRating, totalReviews, distribution };
  }
}

export const reviewService = new ReviewService();
