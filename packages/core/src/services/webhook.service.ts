import { db } from '@vee/db';
import { ETSY_API_BASE, refreshToken as etsyRefreshToken } from '../connectors/etsy-auth';
import { SP_API_BASE, refreshAccessToken as amazonRefreshToken } from '../connectors/amazon-auth';

// ─── Shared credential types ─────────────────────────────────────────────────

interface EtsyCredentials {
  shop_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  webhook_secret?: string;
}

interface AmazonCredentials {
  sellerId: string;
  marketplaceId: string;
  refresh_token: string;
  access_token: string;
  expires_at: string;
  clientId: string;
  clientSecret: string;
}

// ─── Etsy webhook shapes ──────────────────────────────────────────────────────

export interface EtsyWebhook {
  webhook_id: number;
  event: string;
  user_id: number;
  shop_id: number;
  active: boolean;
  create_timestamp: number;
  update_timestamp: number;
}

export interface EtsyWebhookCreateResult extends EtsyWebhook {
  secret?: string;
}

// ─── Amazon subscription shapes ───────────────────────────────────────────────

export interface AmazonNotificationSubscription {
  subscriptionId: string;
  notificationType: string;
  destinationId: string;
  processingDirective?: Record<string, unknown>;
}

export interface AmazonDestination {
  destinationId: string;
  name: string;
  resource?: Record<string, unknown>;
}

// ─── Marketplace settings stored in Marketplace.settings ──────────────────────

interface MarketplaceSettings {
  etsy_webhook_ids?: number[];
  amazon_subscription_ids?: string[];
  [key: string]: unknown;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getFreshEtsyCredentials(marketplaceId: string): Promise<EtsyCredentials> {
  const marketplace = await db.marketplace.findUniqueOrThrow({
    where: { id: marketplaceId },
  });

  const creds = marketplace.credentials as EtsyCredentials;
  const expiresAt = new Date(creds.expires_at).getTime();

  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    const refreshed = await etsyRefreshToken(creds.refresh_token);
    const updated: EtsyCredentials = {
      ...creds,
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    };
    await db.marketplace.update({
      where: { id: marketplaceId },
      data: { credentials: updated as unknown as Record<string, unknown> },
    });
    return updated;
  }

  return creds;
}

async function getFreshAmazonCredentials(marketplaceId: string): Promise<AmazonCredentials> {
  const marketplace = await db.marketplace.findUniqueOrThrow({
    where: { id: marketplaceId },
  });

  const creds = marketplace.credentials as AmazonCredentials;
  const expiresAt = new Date(creds.expires_at).getTime();

  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    const refreshed = await amazonRefreshToken(creds.refresh_token);
    const updated: AmazonCredentials = {
      ...creds,
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? creds.refresh_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    };
    await db.marketplace.update({
      where: { id: marketplaceId },
      data: { credentials: updated as unknown as Record<string, unknown> },
    });
    return updated;
  }

  return creds;
}

async function etsyRequest<T>(
  method: string,
  path: string,
  accessToken: string,
  body?: unknown,
): Promise<T> {
  const url = `${ETSY_API_BASE}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      'x-api-key': process.env.ETSY_CLIENT_ID ?? '',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Etsy API ${method} ${path} failed ${response.status}: ${text}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function amazonRequest<T>(
  method: string,
  path: string,
  accessToken: string,
  body?: unknown,
): Promise<T> {
  const url = `${SP_API_BASE}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Amazon SP-API ${method} ${path} failed ${response.status}: ${text}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

// ─── WebhookService ──────────────────────────────────────────────────────────

export class WebhookService {
  // ── Etsy ──────────────────────────────────────────────────────────────────

  /**
   * Register a webhook with Etsy for the given marketplace.
   * The webhook_id is stored in Marketplace.settings.etsy_webhook_ids.
   *
   * @param marketplaceId Internal Marketplace record ID
   * @param callbackUrl   Publicly accessible HTTPS URL for Etsy to POST events to
   * @param event         Etsy event type, e.g. "receipt.created"
   */
  async registerEtsyWebhook(
    marketplaceId: string,
    callbackUrl: string,
    event = 'receipt.created',
  ): Promise<EtsyWebhookCreateResult> {
    const creds = await getFreshEtsyCredentials(marketplaceId);

    const result = await etsyRequest<EtsyWebhookCreateResult>(
      'POST',
      `/v3/application/shops/${creds.shop_id}/webhooks`,
      creds.access_token,
      { event, url: callbackUrl },
    );

    // Persist the webhook_id and optional secret in Marketplace.settings
    const marketplace = await db.marketplace.findUniqueOrThrow({
      where: { id: marketplaceId },
      select: { settings: true },
    });

    const settings = (marketplace.settings ?? {}) as MarketplaceSettings;
    const existingIds = settings.etsy_webhook_ids ?? [];
    const newSettings: MarketplaceSettings = {
      ...settings,
      etsy_webhook_ids: [...existingIds, result.webhook_id],
      ...(result.secret && { etsy_webhook_secret: result.secret }),
    };

    await db.marketplace.update({
      where: { id: marketplaceId },
      data: { settings: newSettings as Record<string, unknown> },
    });

    return result;
  }

  /**
   * List all registered webhooks for an Etsy shop.
   */
  async listEtsyWebhooks(marketplaceId: string): Promise<EtsyWebhook[]> {
    const creds = await getFreshEtsyCredentials(marketplaceId);

    const result = await etsyRequest<{ results: EtsyWebhook[] }>(
      'GET',
      `/v3/application/shops/${creds.shop_id}/webhooks`,
      creds.access_token,
    );

    return result.results ?? [];
  }

  /**
   * Delete a specific Etsy webhook.
   */
  async deleteEtsyWebhook(marketplaceId: string, webhookId: string): Promise<void> {
    const creds = await getFreshEtsyCredentials(marketplaceId);

    await etsyRequest<void>(
      'DELETE',
      `/v3/application/shops/${creds.shop_id}/webhooks/${webhookId}`,
      creds.access_token,
    );

    // Remove from stored settings
    const marketplace = await db.marketplace.findUniqueOrThrow({
      where: { id: marketplaceId },
      select: { settings: true },
    });

    const settings = (marketplace.settings ?? {}) as MarketplaceSettings;
    const updatedIds = (settings.etsy_webhook_ids ?? []).filter(
      (id) => String(id) !== webhookId,
    );

    await db.marketplace.update({
      where: { id: marketplaceId },
      data: {
        settings: { ...settings, etsy_webhook_ids: updatedIds } as Record<string, unknown>,
      },
    });
  }

  // ── Amazon ────────────────────────────────────────────────────────────────

  /**
   * Create an SP-API notification subscription.
   *
   * @param marketplaceId   Internal Marketplace record ID
   * @param notificationType  e.g. "ORDER_CHANGE"
   * @param destinationArn   ARN of the pre-created EventBridge or SQS destination
   */
  async registerAmazonNotification(
    marketplaceId: string,
    notificationType: string,
    destinationArn: string,
  ): Promise<AmazonNotificationSubscription> {
    const creds = await getFreshAmazonCredentials(marketplaceId);

    const result = await amazonRequest<{ payload: AmazonNotificationSubscription }>(
      'POST',
      `/notifications/v1/subscriptions/${notificationType}`,
      creds.access_token,
      {
        payloadVersion: '1.0',
        destinationId: destinationArn,
      },
    );

    const subscription = result.payload;

    // Store subscription ID in Marketplace.settings
    const marketplace = await db.marketplace.findUniqueOrThrow({
      where: { id: marketplaceId },
      select: { settings: true },
    });

    const settings = (marketplace.settings ?? {}) as MarketplaceSettings;
    const existingIds = settings.amazon_subscription_ids ?? [];

    await db.marketplace.update({
      where: { id: marketplaceId },
      data: {
        settings: {
          ...settings,
          amazon_subscription_ids: [...existingIds, subscription.subscriptionId],
        } as Record<string, unknown>,
      },
    });

    return subscription;
  }

  /**
   * List all active SP-API notification subscriptions.
   */
  async listAmazonSubscriptions(marketplaceId: string): Promise<AmazonNotificationSubscription[]> {
    const creds = await getFreshAmazonCredentials(marketplaceId);

    // Fetch subscriptions for all known notification types
    const notificationTypes = [
      'ORDER_CHANGE',
      'LISTINGS_ITEM_STATUS_CHANGE',
      'LISTINGS_ITEM_ISSUES_CHANGE',
      'FULFILLMENT_ORDER_STATUS',
      'REPORT_PROCESSING_FINISHED',
      'ITEM_INVENTORY_EVENT_CHANGE',
    ];

    const results: AmazonNotificationSubscription[] = [];

    for (const type of notificationTypes) {
      try {
        const response = await amazonRequest<{
          payload: { subscriptions: AmazonNotificationSubscription[] };
        }>(
          'GET',
          `/notifications/v1/subscriptions/${type}`,
          creds.access_token,
        );
        const subs = response.payload?.subscriptions ?? [];
        results.push(...subs);
      } catch {
        // A 404 just means no subscriptions of this type — continue
      }
    }

    return results;
  }

  /**
   * List available SP-API notification destinations.
   */
  async listAmazonDestinations(marketplaceId: string): Promise<AmazonDestination[]> {
    const creds = await getFreshAmazonCredentials(marketplaceId);

    const response = await amazonRequest<{ payload: { destinations: AmazonDestination[] } }>(
      'GET',
      '/notifications/v1/destinations',
      creds.access_token,
    );

    return response.payload?.destinations ?? [];
  }
}

export const webhookService = new WebhookService();
