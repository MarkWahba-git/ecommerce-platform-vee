import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@vee/db';
import { webhookService } from '@vee/core';

/**
 * GET /api/channels/[id]/webhooks
 * List all registered webhooks / subscriptions for the given marketplace.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: marketplaceId } = await params;

  try {
    const marketplace = await db.marketplace.findUnique({
      where: { id: marketplaceId },
      select: { id: true, type: true, name: true, isActive: true, settings: true },
    });

    if (!marketplace) {
      return NextResponse.json({ error: 'Marketplace not found' }, { status: 404 });
    }

    if (marketplace.type === 'ETSY') {
      const webhooks = await webhookService.listEtsyWebhooks(marketplaceId);
      return NextResponse.json({ type: 'ETSY', webhooks });
    }

    if (marketplace.type === 'AMAZON') {
      const [subscriptions, destinations] = await Promise.all([
        webhookService.listAmazonSubscriptions(marketplaceId),
        webhookService.listAmazonDestinations(marketplaceId),
      ]);
      return NextResponse.json({ type: 'AMAZON', subscriptions, destinations });
    }

    return NextResponse.json(
      { error: `Webhook management is not supported for marketplace type: ${marketplace.type}` },
      { status: 422 },
    );
  } catch (err) {
    console.error(`[GET /api/channels/${marketplaceId}/webhooks]`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list webhooks' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/channels/[id]/webhooks
 * Register a new webhook or notification subscription.
 *
 * For Etsy:   { callbackUrl: string; event?: string }
 * For Amazon: { notificationType: string; destinationArn: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: marketplaceId } = await params;

  try {
    const marketplace = await db.marketplace.findUnique({
      where: { id: marketplaceId },
      select: { id: true, type: true, isActive: true },
    });

    if (!marketplace) {
      return NextResponse.json({ error: 'Marketplace not found' }, { status: 404 });
    }

    if (!marketplace.isActive) {
      return NextResponse.json({ error: 'Marketplace is not active' }, { status: 422 });
    }

    const body = await req.json() as Record<string, unknown>;

    if (marketplace.type === 'ETSY') {
      const callbackUrl = body.callbackUrl as string | undefined;
      if (!callbackUrl) {
        return NextResponse.json({ error: 'callbackUrl is required for Etsy webhooks' }, { status: 400 });
      }

      const event = (body.event as string | undefined) ?? 'receipt.created';
      const webhook = await webhookService.registerEtsyWebhook(marketplaceId, callbackUrl, event);

      return NextResponse.json({ registered: true, webhook }, { status: 201 });
    }

    if (marketplace.type === 'AMAZON') {
      const notificationType = body.notificationType as string | undefined;
      const destinationArn = body.destinationArn as string | undefined;

      if (!notificationType || !destinationArn) {
        return NextResponse.json(
          { error: 'notificationType and destinationArn are required for Amazon subscriptions' },
          { status: 400 },
        );
      }

      const subscription = await webhookService.registerAmazonNotification(
        marketplaceId,
        notificationType,
        destinationArn,
      );

      return NextResponse.json({ registered: true, subscription }, { status: 201 });
    }

    return NextResponse.json(
      { error: `Webhook management is not supported for marketplace type: ${marketplace.type}` },
      { status: 422 },
    );
  } catch (err) {
    console.error(`[POST /api/channels/${marketplaceId}/webhooks]`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to register webhook' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/channels/[id]/webhooks
 * Remove a webhook or subscription.
 *
 * For Etsy:   { webhookId: string }
 * For Amazon: (future — Amazon subscriptions are not easily removed via SP-API)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: marketplaceId } = await params;

  try {
    const marketplace = await db.marketplace.findUnique({
      where: { id: marketplaceId },
      select: { id: true, type: true },
    });

    if (!marketplace) {
      return NextResponse.json({ error: 'Marketplace not found' }, { status: 404 });
    }

    const body = await req.json() as Record<string, unknown>;

    if (marketplace.type === 'ETSY') {
      const webhookId = body.webhookId as string | undefined;
      if (!webhookId) {
        return NextResponse.json({ error: 'webhookId is required' }, { status: 400 });
      }

      await webhookService.deleteEtsyWebhook(marketplaceId, webhookId);
      return NextResponse.json({ deleted: true, webhookId });
    }

    return NextResponse.json(
      { error: `DELETE webhooks is not supported for marketplace type: ${marketplace.type}` },
      { status: 422 },
    );
  } catch (err) {
    console.error(`[DELETE /api/channels/${marketplaceId}/webhooks]`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete webhook' },
      { status: 500 },
    );
  }
}
