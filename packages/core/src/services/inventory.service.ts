import { db } from '@vee/db';

export class InventoryService {
  /** Get inventory for a variant */
  async getByVariantId(variantId: string) {
    return db.inventory.findUnique({ where: { variantId } });
  }

  /** Update stock quantity */
  async updateQuantity(variantId: string, quantity: number) {
    return db.inventory.upsert({
      where: { variantId },
      update: { quantity },
      create: { variantId, quantity },
    });
  }

  /** Reserve stock (e.g., when adding to cart or creating order) */
  async reserve(variantId: string, quantity: number) {
    return db.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { variantId },
      });

      if (!inventory || !inventory.trackInventory) return;

      const available = inventory.quantity - inventory.reservedQuantity;
      if (available < quantity) {
        throw new Error(`Insufficient stock: ${available} available, ${quantity} requested`);
      }

      return tx.inventory.update({
        where: { variantId },
        data: { reservedQuantity: { increment: quantity } },
      });
    });
  }

  /** Release reserved stock (e.g., cart expiry, order cancellation) */
  async release(variantId: string, quantity: number) {
    return db.inventory.update({
      where: { variantId },
      data: { reservedQuantity: { decrement: quantity } },
    });
  }

  /** Confirm stock deduction (order confirmed — move from reserved to sold) */
  async confirmDeduction(variantId: string, quantity: number) {
    return db.inventory.update({
      where: { variantId },
      data: {
        quantity: { decrement: quantity },
        reservedQuantity: { decrement: quantity },
      },
    });
  }

  /** Get low stock items */
  async getLowStockItems() {
    return db.inventory.findMany({
      where: {
        trackInventory: true,
        quantity: { lte: db.inventory.fields.lowStockThreshold as unknown as number },
      },
      include: {
        variant: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
      },
    });
  }

  /** Bulk update inventory */
  async bulkUpdate(updates: { variantId: string; quantity: number }[]) {
    return db.$transaction(
      updates.map(({ variantId, quantity }) =>
        db.inventory.upsert({
          where: { variantId },
          update: { quantity },
          create: { variantId, quantity },
        }),
      ),
    );
  }
}

export const inventoryService = new InventoryService();
