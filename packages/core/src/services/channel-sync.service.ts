import { db } from '@vee/db';
import type { ExternalOrder } from '@vee/shared';
import { getConnector } from '../connectors/connector-factory';
import { orderService } from './order.service';

type SyncJobType =
  | 'PRODUCT_PUSH'
  | 'INVENTORY_SYNC'
  | 'PRICE_SYNC'
  | 'ORDER_IMPORT'
  | 'FULFILLMENT_PUSH'
  | 'FULL_RECONCILIATION';

type SyncJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';

/** Create a SyncJob record and return its ID. */
async function createSyncJob(
  marketplaceId: string,
  type: SyncJobType,
  direction: 'push' | 'pull' = 'push',
): Promise<string> {
  const job = await db.syncJob.create({
    data: {
      marketplaceId,
      type,
      direction,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });
  return job.id;
}

/** Update a SyncJob record with the result. */
async function finishSyncJob(
  jobId: string,
  status: SyncJobStatus,
  itemsProcessed: number,
  itemsFailed: number,
  errorLog?: unknown,
): Promise<void> {
  await db.syncJob.update({
    where: { id: jobId },
    data: {
      status,
      itemsProcessed,
      itemsFailed,
      completedAt: new Date(),
      ...(errorLog != null && { errorLog: errorLog as object }),
    },
  });
}

export class ChannelSyncService {
  /**
   * Push current inventory quantities for all active listings of a marketplace.
   */
  async syncInventoryToChannel(marketplaceId: string): Promise<void> {
    const marketplace = await db.marketplace.findUniqueOrThrow({
      where: { id: marketplaceId },
    });

    const connector = getConnector(marketplace);
    const jobId = await createSyncJob(marketplaceId, 'INVENTORY_SYNC', 'push');

    let processed = 0;
    let failed = 0;
    const errors: Array<{ sku: string; error: string }> = [];

    try {
      // Fetch all active listings with their variant inventory
      const listings = await db.marketplaceListing.findMany({
        where: {
          marketplaceId,
          status: 'active',
          externalListingId: { not: null },
        },
        include: {
          variant: {
            include: { inventory: true },
          },
        },
      });

      for (const listing of listings) {
        const sku = listing.variant?.sku;
        const qty = listing.variant?.inventory?.quantity ?? 0;

        if (!sku) {
          failed++;
          errors.push({ sku: listing.id, error: 'Listing has no associated variant SKU' });
          continue;
        }

        try {
          await connector.pushInventory(sku, qty);
          await db.marketplaceListing.update({
            where: { id: listing.id },
            data: { lastSyncedAt: new Date(), syncError: null },
          });
          processed++;
        } catch (err) {
          failed++;
          const message = err instanceof Error ? err.message : String(err);
          errors.push({ sku, error: message });
          await db.marketplaceListing.update({
            where: { id: listing.id },
            data: { syncError: message },
          });
        }
      }

      await db.marketplace.update({
        where: { id: marketplaceId },
        data: { lastSyncAt: new Date() },
      });

      const status: SyncJobStatus = failed === 0 ? 'COMPLETED' : processed > 0 ? 'PARTIAL' : 'FAILED';
      await finishSyncJob(jobId, status, processed, failed, errors.length > 0 ? errors : undefined);
    } catch (err) {
      await finishSyncJob(jobId, 'FAILED', processed, failed, {
        fatal: err instanceof Error ? err.message : String(err),
        errors,
      });
      throw err;
    }
  }

  /**
   * Import new orders from a channel since a given date.
   * Creates internal orders via OrderService and acknowledges each one.
   */
  async importOrdersFromChannel(marketplaceId: string, since?: Date): Promise<void> {
    const marketplace = await db.marketplace.findUniqueOrThrow({
      where: { id: marketplaceId },
    });

    const connector = getConnector(marketplace);
    const jobId = await createSyncJob(marketplaceId, 'ORDER_IMPORT', 'pull');

    let processed = 0;
    let failed = 0;
    const errors: Array<{ externalOrderId: string; error: string }> = [];

    try {
      // Default to last 24 hours if no since date provided
      const sinceDate = since ?? new Date(Date.now() - 24 * 60 * 60 * 1000);

      const externalOrders: ExternalOrder[] = await connector.importOrders(sinceDate);

      for (const externalOrder of externalOrders) {
        try {
          const nameParts = (externalOrder.externalCustomerName ?? '').split(' ');
          const firstName = nameParts[0] ?? '';
          const lastName = nameParts.slice(1).join(' ') || firstName;

          const source = marketplace.type === 'ETSY' ? 'ETSY' : 'AMAZON';

          await orderService.createFromMarketplace({
            marketplaceId,
            marketplaceOrderId: externalOrder.externalOrderId,
            customerEmail:
              externalOrder.externalCustomerEmail ??
              `${externalOrder.externalOrderId}@marketplace.noreply`,
            items: externalOrder.items.map((item) => ({
              sku: item.externalSku,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
            shippingAddress: {
              firstName,
              lastName,
              street1: externalOrder.shippingAddress.street1,
              city: externalOrder.shippingAddress.city,
              postalCode: externalOrder.shippingAddress.postalCode,
              country: externalOrder.shippingAddress.country,
            },
            total: externalOrder.total,
            paidAt: new Date(externalOrder.paidAt),
            source: source as 'ETSY' | 'AMAZON',
          });

          await connector.acknowledgeOrder(externalOrder.externalOrderId);
          processed++;
        } catch (err) {
          failed++;
          const message = err instanceof Error ? err.message : String(err);
          errors.push({ externalOrderId: externalOrder.externalOrderId, error: message });
        }
      }

      await db.marketplace.update({
        where: { id: marketplaceId },
        data: { lastSyncAt: new Date() },
      });

      const status: SyncJobStatus = failed === 0 ? 'COMPLETED' : processed > 0 ? 'PARTIAL' : 'FAILED';
      await finishSyncJob(jobId, status, processed, failed, errors.length > 0 ? errors : undefined);
    } catch (err) {
      await finishSyncJob(jobId, 'FAILED', processed, failed, {
        fatal: err instanceof Error ? err.message : String(err),
        errors,
      });
      throw err;
    }
  }

  /**
   * Push tracking/fulfillment info for a shipped order to its originating channel.
   */
  async pushFulfillmentToChannel(orderId: string): Promise<void> {
    const order = await db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        shipments: { orderBy: { createdAt: 'desc' }, take: 1 },
        marketplace: true,
      },
    });

    if (!order.marketplaceId || !order.marketplace) {
      throw new Error(`Order ${orderId} has no associated marketplace`);
    }

    if (!order.marketplaceOrderId) {
      throw new Error(`Order ${orderId} has no marketplaceOrderId`);
    }

    const shipment = order.shipments[0];
    if (!shipment?.trackingNumber) {
      throw new Error(`Order ${orderId} has no shipment with a tracking number`);
    }

    const connector = getConnector(order.marketplace);
    const jobId = await createSyncJob(order.marketplaceId, 'FULFILLMENT_PUSH', 'push');

    try {
      await connector.pushFulfillment(order.marketplaceOrderId, {
        carrier: shipment.carrier,
        trackingNumber: shipment.trackingNumber,
        trackingUrl: shipment.trackingUrl ?? undefined,
      });

      await finishSyncJob(jobId, 'COMPLETED', 1, 0);
    } catch (err) {
      await finishSyncJob(jobId, 'FAILED', 0, 1, {
        fatal: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Full reconciliation: sync inventory then import orders.
   */
  async reconcile(marketplaceId: string): Promise<void> {
    const marketplace = await db.marketplace.findUniqueOrThrow({
      where: { id: marketplaceId },
    });

    const jobId = await createSyncJob(marketplaceId, 'FULL_RECONCILIATION', 'push');

    try {
      // Run both directions
      await this.syncInventoryToChannel(marketplaceId);

      // Import orders from the last 7 days for a full reconcile
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await this.importOrdersFromChannel(marketplaceId, sevenDaysAgo);

      await db.marketplace.update({
        where: { id: marketplace.id },
        data: { lastSyncAt: new Date() },
      });

      await finishSyncJob(jobId, 'COMPLETED', 1, 0);
    } catch (err) {
      await finishSyncJob(jobId, 'FAILED', 0, 1, {
        fatal: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Push (or update) a single product to a marketplace channel.
   * Creates a MarketplaceListing record if one does not already exist.
   */
  async pushProductToChannel(productId: string, marketplaceId: string): Promise<void> {
    const marketplace = await db.marketplace.findUniqueOrThrow({
      where: { id: marketplaceId },
    });

    const product = await db.product.findUniqueOrThrow({
      where: { id: productId },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        variants: { where: { isActive: true }, include: { inventory: true } },
      },
    });

    const connector = getConnector(marketplace);
    const jobId = await createSyncJob(marketplaceId, 'PRODUCT_PUSH', 'push');

    try {
      // Find or initialise the listing record (product-level, no variantId)
      let listing = await db.marketplaceListing.findFirst({
        where: { marketplaceId, productId, variantId: null },
      });

      if (!listing) {
        listing = await db.marketplaceListing.create({
          data: {
            marketplaceId,
            productId,
            status: 'pending',
          },
        });
      }

      const channelListing = {
        externalListingId: listing.externalListingId,
        channelPrice: listing.channelPrice ? Number(listing.channelPrice) : null,
        channelTitle: listing.channelTitle,
        channelDescription: listing.channelDescription,
        channelData: listing.channelData as Record<string, unknown> | null,
      };

      const channelProduct = {
        sku: product.sku,
        name: product.name,
        description: product.description,
        price: Number(product.basePrice),
        currency: 'EUR',
        images: product.images.map((img) => ({ url: img.url, altText: img.altText })),
        weight: product.weight ? Number(product.weight) : null,
        variants: product.variants.map((v) => ({
          sku: v.sku,
          name: v.name,
          price: v.price ? Number(v.price) : null,
          options: v.options as Record<string, string>,
        })),
      };

      if (listing.externalListingId) {
        await connector.updateProduct(channelListing, channelProduct);
        await db.marketplaceListing.update({
          where: { id: listing.id },
          data: { status: 'active', lastSyncedAt: new Date(), syncError: null },
        });
      } else {
        const { externalId } = await connector.pushProduct(channelListing, channelProduct);
        await db.marketplaceListing.update({
          where: { id: listing.id },
          data: {
            externalListingId: externalId,
            status: 'active',
            lastSyncedAt: new Date(),
            syncError: null,
          },
        });
      }

      await finishSyncJob(jobId, 'COMPLETED', 1, 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await finishSyncJob(jobId, 'FAILED', 0, 1, { fatal: message });
      throw err;
    }
  }
}

export const channelSyncService = new ChannelSyncService();
