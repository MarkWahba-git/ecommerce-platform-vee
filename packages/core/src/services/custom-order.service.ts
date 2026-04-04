import { db, type CustomOrderStatus } from '@vee/db';

// Valid status transitions for custom order requests
const CUSTOM_ORDER_TRANSITIONS: Record<CustomOrderStatus, CustomOrderStatus[]> = {
  SUBMITTED: ['REVIEWING', 'DECLINED', 'CANCELLED'],
  REVIEWING: ['QUOTED', 'DECLINED', 'CANCELLED'],
  QUOTED: ['ACCEPTED', 'DECLINED', 'CANCELLED'],
  ACCEPTED: ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['PROOF_SENT', 'CANCELLED'],
  PROOF_SENT: ['APPROVED', 'IN_PRODUCTION', 'CANCELLED'],
  APPROVED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  DECLINED: [],
  CANCELLED: [],
};

export interface CustomOrderListFilters {
  status?: string;
  customerId?: string;
  page?: number;
  limit?: number;
}

export class CustomOrderService {
  /** Submit a new custom order request. */
  async submit(customerId: string, data: { description: string; attachments?: string[] }) {
    return db.customOrderRequest.create({
      data: {
        customerId,
        status: 'SUBMITTED',
        description: data.description,
        attachments: data.attachments ?? [],
      },
      include: {
        customer: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  /** List custom order requests with optional filters and pagination. */
  async list(filters: CustomOrderListFilters = {}) {
    const { status, customerId, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status: status as CustomOrderStatus }),
      ...(customerId && { customerId }),
    };

    const [items, total] = await Promise.all([
      db.customOrderRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      db.customOrderRequest.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Get a single custom order request with full customer info. */
  async getById(id: string) {
    return db.customOrderRequest.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });
  }

  /** Update status and optional quote/admin fields with transition validation. */
  async updateStatus(
    id: string,
    status: string,
    data?: {
      quotedPrice?: number;
      quotedDays?: number;
      adminNotes?: string;
    },
  ) {
    const request = await db.customOrderRequest.findUniqueOrThrow({ where: { id } });
    const currentStatus = request.status as CustomOrderStatus;
    const allowed = CUSTOM_ORDER_TRANSITIONS[currentStatus];

    if (!allowed.includes(status as CustomOrderStatus)) {
      throw new Error(
        `Cannot transition from ${currentStatus} to ${status}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    return db.customOrderRequest.update({
      where: { id },
      data: {
        status: status as CustomOrderStatus,
        ...(data?.quotedPrice !== undefined && { quotedPrice: data.quotedPrice }),
        ...(data?.quotedDays !== undefined && { quotedDays: data.quotedDays }),
        ...(data?.adminNotes !== undefined && { adminNotes: data.adminNotes }),
      },
    });
  }

  /** Set the proof file key and transition status to PROOF_SENT. */
  async uploadProof(id: string, fileKey: string) {
    const request = await db.customOrderRequest.findUniqueOrThrow({ where: { id } });
    const allowed = CUSTOM_ORDER_TRANSITIONS[request.status as CustomOrderStatus];

    if (!allowed.includes('PROOF_SENT')) {
      throw new Error(
        `Cannot send proof from status ${request.status}. Must be IN_PRODUCTION.`,
      );
    }

    return db.customOrderRequest.update({
      where: { id },
      data: {
        proofFileKey: fileKey,
        status: 'PROOF_SENT',
      },
    });
  }

  /** Customer approves the proof — transitions status to APPROVED. */
  async approveProof(id: string) {
    const request = await db.customOrderRequest.findUniqueOrThrow({ where: { id } });

    if (request.status !== 'PROOF_SENT') {
      throw new Error(`Cannot approve proof: current status is ${request.status}, expected PROOF_SENT`);
    }

    return db.customOrderRequest.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  /**
   * Convert an APPROVED custom order request into a regular Order.
   * Uses the quoted price as the order total.
   */
  async convertToOrder(id: string) {
    const request = await db.customOrderRequest.findUniqueOrThrow({
      where: { id },
      include: {
        customer: true,
      },
    });

    if (request.status !== 'APPROVED') {
      throw new Error(`Cannot convert to order: status is ${request.status}, expected APPROVED`);
    }

    if (!request.quotedPrice) {
      throw new Error('Cannot convert to order: no quoted price set');
    }

    const year = new Date().getFullYear();
    const count = await db.order.count({
      where: { createdAt: { gte: new Date(`${year}-01-01`) } },
    });
    const orderNumber = `VEE-${year}-${String(count + 1).padStart(5, '0')}`;

    const quotedPrice = Number(request.quotedPrice);

    const order = await db.order.create({
      data: {
        orderNumber,
        customerId: request.customerId,
        source: 'MANUAL',
        status: 'CONFIRMED',
        subtotal: quotedPrice,
        taxAmount: 0,
        total: quotedPrice,
        customerNote: request.description,
        items: {
          create: [
            {
              productId: '', // custom order — no product SKU
              sku: `CUSTOM-${id.slice(0, 8).toUpperCase()}`,
              name: `Custom Order – ${id.slice(0, 8).toUpperCase()}`,
              quantity: 1,
              unitPrice: quotedPrice,
              totalPrice: quotedPrice,
              taxRate: 0,
              isDigital: false,
            },
          ],
        },
      },
    });

    // Link the order to the request and mark as COMPLETED
    await db.customOrderRequest.update({
      where: { id },
      data: {
        orderId: order.id,
        status: 'COMPLETED',
      },
    });

    return order;
  }
}

export const customOrderService = new CustomOrderService();
