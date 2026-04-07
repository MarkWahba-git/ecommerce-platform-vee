import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { render } from '@react-email/render';
import { channelSyncService, resend, EMAIL_FROM, initSentry, captureException, createLogger } from '@vee/core';
import { db } from '@vee/db';
import {
  OrderConfirmationEmail,
  ShippingNotificationEmail,
  DownloadReadyEmail,
  AbandonedCartEmail,
} from '@vee/email-templates';
import { startHealthServer, registerHealthTargets } from './health';

// Initialise Sentry and structured logger before anything else
initSentry();
const logger = createLogger('Worker');

const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const STORE_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'https://vee-handmade.de';

logger.info('Starting Vee workers...');

// ─── Sync Inventory Worker ────────────────────────────────────────────────────
// Job data: { marketplaceId: string }
const syncInventoryWorker = new Worker(
  'sync-inventory',
  async (job) => {
    const { marketplaceId } = job.data as { marketplaceId: string };
    logger.info('Job started', { queue: 'sync-inventory', jobId: job.id, marketplaceId });

    if (!marketplaceId) {
      throw new Error('sync-inventory job missing marketplaceId');
    }

    await channelSyncService.syncInventoryToChannel(marketplaceId);
    logger.info('Job completed', { queue: 'sync-inventory', jobId: job.id });
  },
  {
    connection,
    concurrency: 5,
    limiter: { max: 10, duration: 1000 },
  },
);

// ─── Import Orders Worker ─────────────────────────────────────────────────────
// Job data: { marketplaceId: string; since?: string } (since is ISO date string)
const importOrdersWorker = new Worker(
  'import-orders',
  async (job) => {
    const { marketplaceId, since } = job.data as { marketplaceId: string; since?: string };
    logger.info('Job started', { queue: 'import-orders', jobId: job.id, marketplaceId, since });

    if (!marketplaceId) {
      throw new Error('import-orders job missing marketplaceId');
    }

    const sinceDate = since ? new Date(since) : undefined;
    await channelSyncService.importOrdersFromChannel(marketplaceId, sinceDate);
    logger.info('Job completed', { queue: 'import-orders', jobId: job.id });
  },
  {
    connection,
    concurrency: 2,
  },
);

// ─── Push Fulfillment Worker ──────────────────────────────────────────────────
// Job data: { orderId: string }
const pushFulfillmentWorker = new Worker(
  'push-fulfillment',
  async (job) => {
    const { orderId } = job.data as { orderId: string };
    console.log(`[push-fulfillment] job=${job.id} orderId=${orderId}`);

    if (!orderId) {
      throw new Error('push-fulfillment job missing orderId');
    }

    await channelSyncService.pushFulfillmentToChannel(orderId);
    console.log(`[push-fulfillment] job=${job.id} completed`);
  },
  {
    connection,
    concurrency: 5,
  },
);

// ─── Email Worker ─────────────────────────────────────────────────────────────
// Job data: { type, to, ... } — see switch cases below
const emailWorker = new Worker(
  'email',
  async (job) => {
    const { type, to } = job.data as { type: string; to: string };
    console.log(`[email] job=${job.id} type=${type} to=${to}`);

    if (!type || !to) {
      throw new Error('email job missing required fields: type, to');
    }

    switch (type) {
      case 'order-confirmation': {
        const {
          orderNumber,
          customerName,
          items,
          subtotal,
          shipping,
          total,
          shippingAddress,
        } = job.data as {
          orderNumber: string;
          customerName: string;
          items: { name: string; quantity: number; unitPrice: string; totalPrice: string }[];
          subtotal: string;
          shipping: string;
          total: string;
          shippingAddress: string;
        };

        const html = await render(
          OrderConfirmationEmail({
            orderNumber,
            customerName,
            items,
            subtotal,
            shipping,
            total,
            shippingAddress,
          }),
        );

        await resend.emails.send({
          from: EMAIL_FROM,
          to,
          subject: `Bestellbestätigung ${orderNumber} – Vee Handmade`,
          html,
        });
        break;
      }

      case 'shipping-notification': {
        const { orderNumber, customerName, trackingNumber, trackingUrl, carrierName, estimatedDelivery } =
          job.data as {
            orderNumber: string;
            customerName: string;
            trackingNumber: string;
            trackingUrl: string;
            carrierName: string;
            estimatedDelivery?: string;
          };

        const html = await render(
          ShippingNotificationEmail({
            orderNumber,
            customerName,
            trackingNumber,
            trackingUrl,
            carrierName,
            estimatedDelivery,
          }),
        );

        await resend.emails.send({
          from: EMAIL_FROM,
          to,
          subject: `Deine Bestellung ${orderNumber} ist unterwegs! – Vee Handmade`,
          html,
        });
        break;
      }

      case 'download-ready': {
        const { customerName, productName, downloadUrl, expiresAt, downloadLimit, downloadsUsed } =
          job.data as {
            customerName: string;
            productName: string;
            downloadUrl: string;
            expiresAt?: string;
            downloadLimit?: number;
            downloadsUsed?: number;
          };

        const html = await render(
          DownloadReadyEmail({
            customerName,
            productName,
            downloadUrl,
            expiresAt,
            downloadLimit,
            downloadsUsed,
          }),
        );

        await resend.emails.send({
          from: EMAIL_FROM,
          to,
          subject: `Dein Download ist bereit: ${productName} – Vee Handmade`,
          html,
        });
        break;
      }

      case 'abandoned-cart': {
        const { customerName, cartUrl, items, total, unsubscribeUrl } = job.data as {
          customerName: string;
          cartUrl: string;
          items: { name: string; quantity: number; price: string; imageUrl?: string; variantName?: string }[];
          total?: string;
          unsubscribeUrl: string;
        };

        const html = await render(
          AbandonedCartEmail({
            customerName,
            cartUrl,
            items,
            total,
            unsubscribeUrl,
          }),
        );

        await resend.emails.send({
          from: EMAIL_FROM,
          to,
          subject: 'Hast du etwas vergessen? Dein Warenkorb wartet! – Vee Handmade',
          html,
        });
        break;
      }

      case 'contact-form': {
        const { senderName, senderEmail, message } = job.data as {
          senderName: string;
          senderEmail: string;
          message: string;
        };

        await resend.emails.send({
          from: EMAIL_FROM,
          to,
          replyTo: senderEmail,
          subject: `Neue Kontaktanfrage von ${senderName}`,
          html: `
            <p><strong>Von:</strong> ${senderName} (${senderEmail})</p>
            <p><strong>Nachricht:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
          `,
        });
        break;
      }

      default:
        throw new Error(`Unknown email type: "${type}"`);
    }

    console.log(`[email] job=${job.id} type=${type} sent`);
  },
  {
    connection,
    concurrency: 10,
  },
);

// ─── Reconciliation Worker ────────────────────────────────────────────────────
// Job data: { marketplaceId: string }
const reconciliationWorker = new Worker(
  'reconciliation',
  async (job) => {
    const { marketplaceId } = job.data as { marketplaceId: string };
    console.log(`[reconciliation] job=${job.id} marketplaceId=${marketplaceId}`);

    if (!marketplaceId) {
      throw new Error('reconciliation job missing marketplaceId');
    }

    await channelSyncService.reconcile(marketplaceId);
    console.log(`[reconciliation] job=${job.id} completed`);
  },
  {
    connection,
    concurrency: 1,
  },
);

// ─── Abandoned Cart Worker ────────────────────────────────────────────────────
// Job data: {} (scans DB for stale carts)
const abandonedCartWorker = new Worker(
  'abandoned-cart',
  async (job) => {
    console.log(`[abandoned-cart] job=${job.id} scanning for stale carts`);

    // Find carts that have been idle for more than 2 hours and have items
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const staleCarts = await db.cart.findMany({
      where: {
        updatedAt: { lte: twoHoursAgo },
        customerId: { not: null },
        items: { some: {} },
      },
      include: {
        customer: {
          select: { id: true, email: true, firstName: true, lastName: true, marketingConsent: true },
        },
        items: {
          include: {
            product: { select: { name: true, basePrice: true } },
            variant: { select: { name: true, price: true } },
          },
        },
      },
      take: 100,
    });

    let sent = 0;

    for (const cart of staleCarts) {
      // Only send to customers who have consented to marketing emails
      if (!cart.customer?.email || !cart.customer.marketingConsent) continue;

      const customerName =
        cart.customer.firstName
          ? `${cart.customer.firstName} ${cart.customer.lastName ?? ''}`.trim()
          : 'Kunde';

      const cartItems = cart.items.map((item) => {
        const unitPrice = item.variant?.price
          ? Number(item.variant.price)
          : Number(item.product.basePrice);
        return {
          name: item.product.name,
          quantity: item.quantity,
          price: `${(unitPrice * item.quantity).toFixed(2).replace('.', ',')} EUR`,
          variantName: item.variant?.name ?? undefined,
        };
      });

      const cartTotal = cart.items.reduce((sum, item) => {
        const unitPrice = item.variant?.price
          ? Number(item.variant.price)
          : Number(item.product.basePrice);
        return sum + unitPrice * item.quantity;
      }, 0);

      const html = await render(
        AbandonedCartEmail({
          customerName,
          cartUrl: `${STORE_URL}/cart`,
          items: cartItems,
          total: `${cartTotal.toFixed(2).replace('.', ',')} EUR`,
          unsubscribeUrl: `${STORE_URL}/newsletter/unsubscribe`,
        }),
      );

      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: cart.customer.email,
          subject: 'Hast du etwas vergessen? Dein Warenkorb wartet! – Vee Handmade',
          html,
        });
        sent++;
      } catch (err) {
        console.error(
          `[abandoned-cart] Failed to send reminder to ${cart.customer.email}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    console.log(
      `[abandoned-cart] job=${job.id} processed ${staleCarts.length} stale carts, sent ${sent} reminders`,
    );
  },
  {
    connection,
    concurrency: 5,
  },
);

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const workers = [
  syncInventoryWorker,
  importOrdersWorker,
  pushFulfillmentWorker,
  emailWorker,
  reconciliationWorker,
  abandonedCartWorker,
];

// Register workers + Redis with health server, then start it
registerHealthTargets(workers, connection);
const healthServer = startHealthServer();

async function shutdown() {
  logger.info('Shutting down workers...');
  healthServer.close();
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Worker error logging
for (const worker of workers) {
  worker.on('failed', (job, err) => {
    logger.error(`Job failed`, err, { queue: worker.name, jobId: job?.id });
    captureException(err, { queue: worker.name, jobId: job?.id });
  });
}

logger.info('All workers started successfully.');
