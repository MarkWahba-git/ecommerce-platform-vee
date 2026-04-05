import { db, Prisma } from '@vee/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PeriodStats {
  revenue: number;
  orderCount: number;
  aov: number;
  /** % change vs previous period, null when no previous data */
  revenueChange: number | null;
  orderCountChange: number | null;
  aovChange: number | null;
}

export interface DailyRevenue {
  date: string; // ISO date string YYYY-MM-DD
  revenue: number;
  orderCount: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  sku: string;
  unitsSold: number;
  revenue: number;
}

export interface OrdersBySource {
  source: string;
  count: number;
  revenue: number;
}

export interface OrdersByStatus {
  status: string;
  count: number;
}

export interface CustomerStats {
  newCustomers: number;
  returningCustomers: number;
  totalCustomers: number;
}

export interface ConversionFunnel {
  cartsCreated: number;
  cartsWithItems: number;
  checkoutsInitiated: number;
  ordersCompleted: number;
}

export interface LowStockAlert {
  variantId: string;
  variantName: string;
  variantSku: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  reservedQuantity: number;
  available: number;
  lowStockThreshold: number;
}

export type ActivityType = 'order' | 'review' | 'custom_order';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: Date;
  meta: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

// ---------------------------------------------------------------------------
// Analytics Service
// ---------------------------------------------------------------------------

export class AnalyticsService {
  /**
   * Revenue stats for a period, with comparison to the previous period of
   * equal length.
   */
  async getRevenueStats(startDate: Date, endDate: Date): Promise<PeriodStats> {
    const periodMs = endDate.getTime() - startDate.getTime();
    const prevEnd = new Date(startDate);
    const prevStart = new Date(startDate.getTime() - periodMs);

    const completedStatuses: Prisma.EnumOrderStatusFilter = {
      notIn: ['CANCELLED', 'REFUNDED'],
    };

    const [current, previous] = await Promise.all([
      db.order.aggregate({
        where: {
          createdAt: { gte: startDate, lt: endDate },
          status: completedStatuses,
        },
        _sum: { total: true },
        _count: { _all: true },
        _avg: { total: true },
      }),
      db.order.aggregate({
        where: {
          createdAt: { gte: prevStart, lt: prevEnd },
          status: completedStatuses,
        },
        _sum: { total: true },
        _count: { _all: true },
        _avg: { total: true },
      }),
    ]);

    const curRevenue = Number(current._sum.total ?? 0);
    const curOrders = current._count._all;
    const curAov = Number(current._avg.total ?? 0);

    const prevRevenue = Number(previous._sum.total ?? 0);
    const prevOrders = previous._count._all;
    const prevAov = Number(previous._avg.total ?? 0);

    return {
      revenue: curRevenue,
      orderCount: curOrders,
      aov: curAov,
      revenueChange: pct(curRevenue, prevRevenue),
      orderCountChange: pct(curOrders, prevOrders),
      aovChange: pct(curAov, prevAov),
    };
  }

  /**
   * Daily revenue and order count for charting.
   * Uses $queryRaw to GROUP BY date efficiently in PostgreSQL.
   */
  async getRevenueByDay(startDate: Date, endDate: Date): Promise<DailyRevenue[]> {
    type RawRow = { day: Date; revenue: unknown; order_count: unknown };

    const rows = await db.$queryRaw<RawRow[]>`
      SELECT
        DATE_TRUNC('day', created_at) AS day,
        SUM(total)                    AS revenue,
        COUNT(*)                      AS order_count
      FROM orders
      WHERE created_at >= ${startDate}
        AND created_at <  ${endDate}
        AND status NOT IN ('CANCELLED', 'REFUNDED')
      GROUP BY day
      ORDER BY day ASC
    `;

    return rows.map((r) => ({
      date: r.day.toISOString().slice(0, 10),
      revenue: Number(r.revenue),
      orderCount: Number(r.order_count),
    }));
  }

  /**
   * Top products by revenue within the date range.
   * Groups OrderItem rows and joins back to the product for sku.
   */
  async getTopProducts(
    limit: number,
    startDate: Date,
    endDate: Date,
  ): Promise<TopProduct[]> {
    type RawRow = {
      product_id: string;
      name: string;
      sku: string;
      units_sold: unknown;
      revenue: unknown;
    };

    const rows = await db.$queryRaw<RawRow[]>`
      SELECT
        oi.product_id,
        oi.name,
        p.sku,
        SUM(oi.quantity)    AS units_sold,
        SUM(oi.total_price) AS revenue
      FROM order_items oi
      JOIN orders    o ON o.id = oi.order_id
      JOIN products  p ON p.id = oi.product_id
      WHERE o.created_at >= ${startDate}
        AND o.created_at <  ${endDate}
        AND o.status NOT IN ('CANCELLED', 'REFUNDED')
      GROUP BY oi.product_id, oi.name, p.sku
      ORDER BY revenue DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      productId: r.product_id,
      name: r.name,
      sku: r.sku,
      unitsSold: Number(r.units_sold),
      revenue: Number(r.revenue),
    }));
  }

  /**
   * Order count and revenue grouped by OrderSource.
   */
  async getOrdersBySource(startDate: Date, endDate: Date): Promise<OrdersBySource[]> {
    const rows = await db.order.groupBy({
      by: ['source'],
      where: {
        createdAt: { gte: startDate, lt: endDate },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
      _count: { _all: true },
      _sum: { total: true },
      orderBy: { _count: { source: 'desc' } },
    });

    return rows.map((r) => ({
      source: r.source,
      count: r._count._all,
      revenue: Number(r._sum.total ?? 0),
    }));
  }

  /**
   * Order count grouped by OrderStatus.
   */
  async getOrdersByStatus(startDate: Date, endDate: Date): Promise<OrdersByStatus[]> {
    const rows = await db.order.groupBy({
      by: ['status'],
      where: { createdAt: { gte: startDate, lt: endDate } },
      _count: { _all: true },
      orderBy: { _count: { status: 'desc' } },
    });

    return rows.map((r) => ({
      status: r.status,
      count: r._count._all,
    }));
  }

  /**
   * New, returning, and total customers in the period.
   * "Returning" = customers who placed more than 1 order total.
   */
  async getCustomerStats(startDate: Date, endDate: Date): Promise<CustomerStats> {
    const [newCustomers, totalCustomers, returningCustomers] = await Promise.all([
      // Customers created in this period
      db.customer.count({
        where: { createdAt: { gte: startDate, lt: endDate } },
      }),
      // All customers
      db.customer.count(),
      // Customers with > 1 order total (all time)
      db.customer.count({
        where: { orders: { some: {} } },
      }),
    ]);

    // Returning = customers who have placed >1 order in this period's cohort
    type RawRow = { count: unknown };
    const [returningInPeriod] = await db.$queryRaw<RawRow[]>`
      SELECT COUNT(*) AS count
      FROM (
        SELECT customer_id
        FROM orders
        WHERE created_at >= ${startDate}
          AND created_at <  ${endDate}
          AND customer_id IS NOT NULL
        GROUP BY customer_id
        HAVING COUNT(*) > 1
      ) sub
    `;

    return {
      newCustomers,
      returningCustomers: Number(returningInPeriod?.count ?? 0),
      totalCustomers,
    };
  }

  /**
   * Simple conversion funnel using cart and order data.
   */
  async getConversionFunnel(startDate: Date, endDate: Date): Promise<ConversionFunnel> {
    const [cartsCreated, cartsWithItems, checkoutsInitiated, ordersCompleted] =
      await Promise.all([
        db.cart.count({
          where: { createdAt: { gte: startDate, lt: endDate } },
        }),
        db.cart.count({
          where: {
            createdAt: { gte: startDate, lt: endDate },
            items: { some: {} },
          },
        }),
        // Orders created = checkout initiated
        db.order.count({
          where: { createdAt: { gte: startDate, lt: endDate } },
        }),
        // Orders that reached COMPLETED or DELIVERED
        db.order.count({
          where: {
            createdAt: { gte: startDate, lt: endDate },
            status: { in: ['COMPLETED', 'DELIVERED'] },
          },
        }),
      ]);

    return { cartsCreated, cartsWithItems, checkoutsInitiated, ordersCompleted };
  }

  /**
   * Products whose available stock is at or below the low-stock threshold.
   * available = quantity - reservedQuantity
   */
  async getLowStockAlerts(): Promise<LowStockAlert[]> {
    // Prisma doesn't support computed column filters, so use raw SQL
    type RawRow = {
      variant_id: string;
      variant_name: string;
      variant_sku: string;
      product_id: string;
      product_name: string;
      product_sku: string;
      quantity: number;
      reserved_quantity: number;
      low_stock_threshold: number;
    };

    const rows = await db.$queryRaw<RawRow[]>`
      SELECT
        i.variant_id,
        pv.name             AS variant_name,
        pv.sku              AS variant_sku,
        p.id                AS product_id,
        p.name              AS product_name,
        p.sku               AS product_sku,
        i.quantity,
        i.reserved_quantity,
        i.low_stock_threshold
      FROM inventories i
      JOIN product_variants pv ON pv.id = i.variant_id
      JOIN products         p  ON p.id  = pv.product_id
      WHERE i.track_inventory = true
        AND (i.quantity - i.reserved_quantity) <= i.low_stock_threshold
        AND p.status != 'ARCHIVED'
      ORDER BY (i.quantity - i.reserved_quantity) ASC
    `;

    return rows.map((r) => ({
      variantId: r.variant_id,
      variantName: r.variant_name,
      variantSku: r.variant_sku,
      productId: r.product_id,
      productName: r.product_name,
      productSku: r.product_sku,
      quantity: Number(r.quantity),
      reservedQuantity: Number(r.reserved_quantity),
      available: Number(r.quantity) - Number(r.reserved_quantity),
      lowStockThreshold: Number(r.low_stock_threshold),
    }));
  }

  /**
   * Unified activity feed combining latest orders, reviews, and custom orders.
   */
  async getRecentActivity(limit: number): Promise<ActivityItem[]> {
    const perFeed = Math.ceil(limit * 1.5); // fetch a bit more, then slice

    const [orders, reviews, customOrders] = await Promise.all([
      db.order.findMany({
        take: perFeed,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          total: true,
          status: true,
          source: true,
          createdAt: true,
          customer: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      db.review.findMany({
        take: perFeed,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          rating: true,
          title: true,
          isApproved: true,
          createdAt: true,
          product: { select: { name: true } },
          customer: { select: { firstName: true, lastName: true } },
        },
      }),
      db.customOrderRequest.findMany({
        take: perFeed,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true,
          customer: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
    ]);

    const items: ActivityItem[] = [
      ...orders.map((o): ActivityItem => {
        const name = o.customer
          ? `${o.customer.firstName ?? ''} ${o.customer.lastName ?? ''}`.trim() ||
            o.customer.email
          : 'Guest';
        return {
          id: `order-${o.id}`,
          type: 'order',
          description: `Order #${o.orderNumber} by ${name} — €${Number(o.total).toFixed(2)} (${o.status})`,
          timestamp: o.createdAt,
          meta: {
            orderId: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            source: o.source,
            total: Number(o.total),
          },
        };
      }),
      ...reviews.map((r): ActivityItem => {
        const name = r.customer
          ? `${r.customer.firstName ?? ''} ${r.customer.lastName ?? ''}`.trim() || 'Customer'
          : 'Customer';
        return {
          id: `review-${r.id}`,
          type: 'review',
          description: `${name} reviewed "${r.product.name}" — ${r.rating}/5 stars${r.title ? `: "${r.title}"` : ''}`,
          timestamp: r.createdAt,
          meta: {
            reviewId: r.id,
            rating: r.rating,
            isApproved: r.isApproved,
            productName: r.product.name,
          },
        };
      }),
      ...customOrders.map((c): ActivityItem => {
        const name = c.customer
          ? `${c.customer.firstName ?? ''} ${c.customer.lastName ?? ''}`.trim() ||
            c.customer.email
          : 'Customer';
        return {
          id: `custom-order-${c.id}`,
          type: 'custom_order',
          description: `Custom order request from ${name} — ${c.status}`,
          timestamp: c.createdAt,
          meta: { customOrderId: c.id, status: c.status },
        };
      }),
    ];

    // Sort all feeds by timestamp desc and take top N
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return items.slice(0, limit);
  }
}

export const analyticsService = new AnalyticsService();
