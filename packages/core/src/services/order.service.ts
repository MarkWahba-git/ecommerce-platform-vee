import { db, type OrderStatus } from '@vee/db';
import type { OrderListInput, CheckoutInput } from '@vee/shared';
import { ORDER_STATUS_TRANSITIONS } from '@vee/shared';
import { inventoryService } from './inventory.service';
import { couponService } from './coupon.service';

export class OrderService {
  /** Generate order number: VEE-YYYY-NNNNN */
  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await db.order.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
        },
      },
    });
    return `VEE-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  /** Create order from cart (checkout) */
  async createFromCart(input: CheckoutInput, customerId: string) {
    const cart = await db.cart.findUniqueOrThrow({
      where: { id: input.cartId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    const orderNumber = await this.generateOrderNumber();

    // Create shipping address
    const shippingAddress = await db.address.create({
      data: {
        customerId,
        type: 'SHIPPING',
        ...input.shippingAddress,
      },
    });

    // Create billing address (use shipping if not provided)
    const billingAddress = input.billingAddress
      ? await db.address.create({
          data: {
            customerId,
            type: 'BILLING',
            ...input.billingAddress,
          },
        })
      : shippingAddress;

    // Calculate totals
    let subtotal = 0;
    const orderItems = cart.items.map((item) => {
      const unitPrice = Number(item.unitPrice);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      return {
        productId: item.productId,
        variantId: item.variantId,
        sku: item.variant?.sku ?? item.product.sku,
        name: item.variant ? `${item.product.name} - ${item.variant.name}` : item.product.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        taxRate: Number(item.product.taxRate),
        isDigital: item.product.type === 'DIGITAL',
        personalization: item.personalization ?? undefined,
      };
    });

    const taxAmount = orderItems.reduce(
      (sum, item) => sum + item.totalPrice - item.totalPrice / (1 + item.taxRate),
      0,
    );

    const order = await db.order.create({
      data: {
        orderNumber,
        customerId,
        source: 'WEBSITE',
        status: 'PENDING',
        subtotal,
        taxAmount,
        total: subtotal, // Shipping added separately after calculation
        shippingAddressId: shippingAddress.id,
        billingAddressId: billingAddress.id,
        customerNote: input.customerNote,
        couponCode: input.couponCode,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    // Reserve inventory for physical/personalized items
    for (const item of cart.items) {
      if (item.variantId && item.product.type !== 'DIGITAL') {
        await inventoryService.reserve(item.variantId, item.quantity);
      }
    }

    // Increment coupon usage if one was applied
    if (input.couponCode) {
      await couponService.incrementUsage(input.couponCode);
    }

    // Clear the cart
    await db.cart.delete({ where: { id: cart.id } });

    return order;
  }

  /** Create order from marketplace import */
  async createFromMarketplace(data: {
    marketplaceId: string;
    marketplaceOrderId: string;
    customerEmail: string;
    items: {
      sku: string;
      name: string;
      quantity: number;
      unitPrice: number;
    }[];
    shippingAddress: {
      firstName: string;
      lastName: string;
      street1: string;
      city: string;
      postalCode: string;
      country: string;
    };
    total: number;
    paidAt: Date;
    source: 'ETSY' | 'AMAZON';
  }) {
    // Idempotency check
    const existing = await db.order.findFirst({
      where: { marketplaceOrderId: data.marketplaceOrderId },
    });
    if (existing) return existing;

    const orderNumber = await this.generateOrderNumber();

    // Find or create customer
    let customer = await db.customer.findUnique({
      where: { email: data.customerEmail },
    });
    if (!customer) {
      customer = await db.customer.create({
        data: {
          email: data.customerEmail,
          firstName: data.shippingAddress.firstName,
          lastName: data.shippingAddress.lastName,
        },
      });
    }

    const shippingAddress = await db.address.create({
      data: {
        customerId: customer.id,
        type: 'SHIPPING',
        ...data.shippingAddress,
      },
    });

    // Map external SKUs to internal products
    const orderItems = await Promise.all(
      data.items.map(async (item) => {
        const variant = await db.productVariant.findUnique({
          where: { sku: item.sku },
          include: { product: true },
        });
        return {
          productId: variant?.productId ?? '',
          variantId: variant?.id,
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
          taxRate: variant ? Number(variant.product.taxRate) : 0.19,
          isDigital: variant?.product.type === 'DIGITAL',
        };
      }),
    );

    return db.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        source: data.source,
        status: 'CONFIRMED',
        subtotal: data.total,
        taxAmount: 0,
        total: data.total,
        shippingAddressId: shippingAddress.id,
        marketplaceId: data.marketplaceId,
        marketplaceOrderId: data.marketplaceOrderId,
        paidAt: data.paidAt,
        items: { create: orderItems },
      },
      include: { items: true },
    });
  }

  /** List orders */
  async list(input: OrderListInput) {
    const { page, limit, status, source, search, sortBy, sortOrder } = input;
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status: status as OrderStatus }),
      ...(source && { source }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' as const } },
          { customer: { email: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      db.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          customer: { select: { email: true, firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
      }),
      db.order.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Get order by ID */
  async getById(id: string) {
    return db.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: { select: { slug: true } },
            variant: { select: { name: true } },
          },
        },
        payments: true,
        refunds: true,
        shipments: true,
        shippingAddress: true,
        billingAddress: true,
      },
    });
  }

  /** Update order status with validation */
  async updateStatus(id: string, newStatus: OrderStatus, internalNote?: string) {
    const order = await db.order.findUniqueOrThrow({ where: { id } });
    const currentStatus = order.status as keyof typeof ORDER_STATUS_TRANSITIONS;
    const allowed = ORDER_STATUS_TRANSITIONS[currentStatus];

    if (!allowed.includes(newStatus as (typeof allowed)[number])) {
      throw new Error(
        `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed.join(', ')}`,
      );
    }

    return db.order.update({
      where: { id },
      data: {
        status: newStatus,
        ...(internalNote && { internalNote }),
        ...(newStatus === 'SHIPPED' && { shippedAt: new Date() }),
        ...(newStatus === 'DELIVERED' && { deliveredAt: new Date() }),
        ...(newStatus === 'CANCELLED' && { cancelledAt: new Date() }),
        ...(newStatus === 'CONFIRMED' && { paidAt: new Date() }),
      },
    });
  }
}

export const orderService = new OrderService();
