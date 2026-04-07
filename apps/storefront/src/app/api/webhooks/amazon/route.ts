import { NextRequest, NextResponse } from 'next/server';
import { db } from '@vee/db';
import { importOrdersQueue, syncInventoryQueue, AmazonConnector } from '@vee/core';
import type { AmazonSnsEnvelope, AmazonNotificationPayload } from '@vee/shared';

// Required for raw body access in Next.js App Router
export const runtime = 'nodejs';

const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5_000 },
};

/** Persist an AuditLog entry for every incoming webhook. */
async function auditWebhookEvent(
  action: string,
  entityId: string | undefined,
  changes: unknown,
  ipAddress: string | null,
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action,
        entityType: 'webhook',
        entityId: entityId ?? undefined,
        changes: changes as Record<string, unknown>,
        ipAddress: ipAddress ?? undefined,
      },
    });
  } catch (err) {
    // Non-fatal: audit logging must not block the 200 response
    console.error('[Amazon webhook] Failed to write audit log:', err);
  }
}

/**
 * GET /api/webhooks/amazon
 * Amazon SNS subscription confirmation: SNS performs a GET with the
 * SubscribeURL query parameter that we must fetch to confirm the subscription.
 * In practice SNS also delivers a SubscriptionConfirmation via POST, but
 * some integrations use GET-based confirmation.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subscribeUrl = searchParams.get('SubscribeURL');

  if (!subscribeUrl) {
    return NextResponse.json({ error: 'Missing SubscribeURL parameter' }, { status: 400 });
  }

  try {
    // Confirm the subscription by fetching the URL
    const response = await fetch(subscribeUrl);
    if (!response.ok) {
      throw new Error(`Failed to confirm subscription: HTTP ${response.status}`);
    }
    console.info('[Amazon webhook] SNS subscription confirmed via GET');
    return NextResponse.json({ confirmed: true });
  } catch (err) {
    console.error('[Amazon webhook] SNS GET confirmation failed:', err);
    return NextResponse.json({ error: 'Subscription confirmation failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // ── 1. Read raw body as Buffer ──────────────────────────────────────────────
  const rawBody = Buffer.from(await req.arrayBuffer());

  // ── 2. Extract and verify signature ───────────────────────────────────────
  const signature =
    req.headers.get('x-amz-sns-message-signature') ??
    req.headers.get('x-amazon-signature') ??
    '';

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature header' }, { status: 401 });
  }

  // Find the active Amazon marketplace
  const marketplace = await db.marketplace.findFirst({
    where: { type: 'AMAZON', isActive: true },
    select: { id: true },
  });

  if (!marketplace) {
    console.warn('[Amazon webhook] No active Amazon marketplace found');
    return NextResponse.json({ error: 'Amazon marketplace not configured' }, { status: 503 });
  }

  const connector = new AmazonConnector(marketplace.id);
  const isValid = connector.verifyWebhook(rawBody, signature);

  if (!isValid) {
    console.warn('[Amazon webhook] Signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // ── 3. Parse the SNS envelope ──────────────────────────────────────────────
  let envelope: AmazonSnsEnvelope;
  try {
    envelope = JSON.parse(rawBody.toString('utf-8')) as AmazonSnsEnvelope;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip');

  // ── 4. Handle SNS SubscriptionConfirmation ─────────────────────────────────
  if (envelope.Type === 'SubscriptionConfirmation') {
    if (!envelope.SubscribeURL) {
      return NextResponse.json({ error: 'Missing SubscribeURL in confirmation message' }, { status: 400 });
    }
    try {
      const confirmResp = await fetch(envelope.SubscribeURL);
      if (!confirmResp.ok) {
        throw new Error(`HTTP ${confirmResp.status}`);
      }
      console.info('[Amazon webhook] SNS subscription confirmed via POST');
      return NextResponse.json({ confirmed: true });
    } catch (err) {
      console.error('[Amazon webhook] SNS POST confirmation failed:', err);
      return NextResponse.json({ error: 'Subscription confirmation failed' }, { status: 500 });
    }
  }

  // ── 5. Parse the inner SP-API notification payload ─────────────────────────
  let notification: AmazonNotificationPayload;
  try {
    notification = JSON.parse(envelope.Message) as AmazonNotificationPayload;
  } catch {
    console.warn('[Amazon webhook] Could not parse SNS Message as JSON');
    return NextResponse.json({ received: true }); // Acknowledge anyway
  }

  const notificationType = notification.NotificationType ?? 'UNKNOWN';

  console.info(
    `[Amazon webhook] Received notification: ${notificationType} (messageId: ${envelope.MessageId})`,
  );

  // ── 6. Audit log (fire-and-forget) ────────────────────────────────────────
  void auditWebhookEvent(
    'amazon_webhook',
    envelope.MessageId,
    { notificationType, marketplaceId: marketplace.id, notification },
    ipAddress,
  );

  // ── 7. Dispatch based on notification type ─────────────────────────────────
  try {
    switch (notificationType) {
      case 'ORDER_CHANGE': {
        const orderChange = notification.Payload?.OrderChangeNotification;
        const amazonOrderId = orderChange?.AmazonOrderId;

        await importOrdersQueue.add(
          `amazon:ORDER_CHANGE:${amazonOrderId ?? envelope.MessageId}`,
          {
            marketplaceId: marketplace.id,
            since: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          },
          JOB_OPTIONS,
        );
        break;
      }

      case 'LISTINGS_ITEM_STATUS_CHANGE': {
        const listingChange = notification.Payload?.ListingsItemStatusChangeNotification;
        const sku = listingChange?.Sku ?? listingChange?.Asin;
        const newStatus = listingChange?.Status?.toLowerCase();

        if (sku && newStatus) {
          await db.marketplaceListing.updateMany({
            where: {
              marketplaceId: marketplace.id,
              externalListingId: sku,
            },
            data: {
              status: newStatus === 'active' ? 'active' : 'deactivated',
              lastSyncedAt: new Date(),
              syncError: null,
            },
          });
          console.info(
            `[Amazon webhook] LISTINGS_ITEM_STATUS_CHANGE: listing ${sku} → ${newStatus}`,
          );
        }
        break;
      }

      case 'LISTINGS_ITEM_ISSUES_CHANGE': {
        const issuesChange = notification.Payload?.ListingsItemIssuesChangeNotification;
        const sku = issuesChange?.Sku ?? issuesChange?.Asin;
        const issues = issuesChange?.Issues ?? [];

        if (sku) {
          const errorSummary = issues
            .map((i) => `[${i.severity}] ${i.code}: ${i.message}`)
            .join('; ');

          console.warn(
            `[Amazon webhook] LISTINGS_ITEM_ISSUES_CHANGE: listing ${sku} has ${issues.length} issue(s): ${errorSummary}`,
          );

          await db.marketplaceListing.updateMany({
            where: {
              marketplaceId: marketplace.id,
              externalListingId: sku,
            },
            data: {
              syncError: errorSummary || 'Amazon reported listing issues',
              lastSyncedAt: new Date(),
            },
          });
        }
        break;
      }

      case 'FULFILLMENT_ORDER_STATUS': {
        const fulfillment = notification.Payload?.FulfillmentOrderStatusNotification;
        const fulfillmentStatus = fulfillment?.FulfillmentOrderStatus?.toUpperCase();
        const fulfillmentOrderId = fulfillment?.AmazonFulfillmentOrderId;

        if (fulfillmentOrderId && fulfillmentStatus) {
          // Map FBA fulfillment statuses to internal order statuses
          const statusMap: Record<string, string> = {
            COMPLETE: 'SHIPPED',
            COMPLETE_PARTIALLED: 'SHIPPED',
            PLANNING: 'PROCESSING',
            PROCESSING: 'PROCESSING',
            INVALID: 'CANCELLED',
            CANCELLED: 'CANCELLED',
          };

          const internalStatus = statusMap[fulfillmentStatus];

          if (internalStatus) {
            const order = await db.order.findFirst({
              where: { marketplaceOrderId: fulfillmentOrderId },
            });

            if (order) {
              // Extract tracking info from the shipment packages if available
              const packages = fulfillment?.FulfillmentShipmentPackage ?? [];
              if (packages.length > 0 && internalStatus === 'SHIPPED') {
                const pkg = packages[0];
                if (pkg.TrackingNumber) {
                  await db.shipment.create({
                    data: {
                      orderId: order.id,
                      carrier: pkg.CarrierCode ?? 'AMAZON',
                      trackingNumber: pkg.TrackingNumber,
                      trackingUrl: pkg.TrackingURL ?? null,
                    },
                  });
                }
              }

              try {
                await db.order.update({
                  where: { id: order.id },
                  data: {
                    status: internalStatus as 'SHIPPED' | 'PROCESSING' | 'CANCELLED',
                    ...(internalStatus === 'SHIPPED' && { shippedAt: new Date() }),
                    ...(internalStatus === 'CANCELLED' && { cancelledAt: new Date() }),
                  },
                });
                console.info(
                  `[Amazon webhook] FULFILLMENT_ORDER_STATUS: order ${order.id} → ${internalStatus}`,
                );
              } catch (err) {
                console.warn(
                  `[Amazon webhook] Could not update order status for ${order.id}:`,
                  err instanceof Error ? err.message : err,
                );
              }
            } else {
              console.warn(
                `[Amazon webhook] FULFILLMENT_ORDER_STATUS: no order found for FBA ID ${fulfillmentOrderId}`,
              );
            }
          }
        }
        break;
      }

      case 'REPORT_PROCESSING_FINISHED': {
        const report = notification.Payload?.ReportProcessingFinishedNotification;
        console.info(
          `[Amazon webhook] REPORT_PROCESSING_FINISHED: reportId=${report?.ReportId ?? 'n/a'} ` +
          `type=${report?.ReportType ?? 'n/a'} status=${report?.ProcessingStatus ?? 'n/a'}`,
        );
        break;
      }

      case 'ITEM_INVENTORY_EVENT_CHANGE': {
        // Inventory changed on Amazon — queue a reconciliation sync
        await syncInventoryQueue.add(
          `amazon:ITEM_INVENTORY_EVENT_CHANGE:${envelope.MessageId}`,
          { marketplaceId: marketplace.id },
          JOB_OPTIONS,
        );
        break;
      }

      default: {
        console.info(`[Amazon webhook] Unhandled notification type: ${notificationType}`);
        break;
      }
    }
  } catch (err) {
    // Processing errors must not prevent the 200 — we already acknowledge receipt
    console.error(`[Amazon webhook] Error processing notification ${notificationType}:`, err);
  }

  // ── 8. Acknowledge immediately ────────────────────────────────────────────
  return NextResponse.json({ received: true });
}
