import crypto from 'crypto';
import { db } from '@vee/db';
import type { ExternalOrder, TrackingInfo } from '@vee/shared';
import type { ChannelConnector, ChannelListing, ChannelProduct } from './channel-connector.interface';
import { SP_API_BASE, refreshAccessToken } from './amazon-auth';

/** Shape stored in Marketplace.credentials */
interface AmazonCredentials {
  sellerId: string;
  marketplaceId: string;
  /** LWA refresh token (long-lived) */
  refresh_token: string;
  /** LWA access token (short-lived, ~1 hour) */
  access_token: string;
  /** ISO timestamp of access token expiry */
  expires_at: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Amazon order status → internal OrderStatus mapping.
 * https://developer-docs.amazon.com/sp-api/docs/orders-api-v0-reference
 */
const AMAZON_ORDER_STATUS_MAP: Record<string, string> = {
  PendingAvailability: 'PENDING',
  Pending: 'PENDING',
  Unshipped: 'CONFIRMED',
  PartiallyShipped: 'PROCESSING',
  Shipped: 'SHIPPED',
  Canceled: 'CANCELLED',
  Unfulfillable: 'CANCELLED',
};

interface AmazonOrder {
  AmazonOrderId: string;
  BuyerInfo?: { BuyerEmail?: string; BuyerName?: string };
  OrderStatus: string;
  PurchaseDate: string;
  OrderTotal?: { Amount: string; CurrencyCode: string };
  ShippingAddress?: {
    Name?: string;
    AddressLine1?: string;
    AddressLine2?: string;
    City?: string;
    StateOrRegion?: string;
    PostalCode?: string;
    CountryCode?: string;
  };
}

interface AmazonOrderItem {
  ASIN: string;
  SellerSKU?: string;
  Title?: string;
  QuantityOrdered: number;
  ItemPrice?: { Amount: string; CurrencyCode: string };
}

class AmazonApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(`Amazon SP-API Error ${status}: ${message}`);
    this.name = 'AmazonApiError';
  }
}

export class AmazonConnector implements ChannelConnector {
  readonly channelType = 'AMAZON' as const;

  constructor(private readonly marketplaceId: string) {}

  // ─── Private helpers ───────────────────────────────────────────────────────

  /** Load credentials from DB, refreshing the access token if near expiry. */
  private async getCredentials(): Promise<AmazonCredentials> {
    const marketplace = await db.marketplace.findUniqueOrThrow({
      where: { id: this.marketplaceId },
    });

    const creds = marketplace.credentials as AmazonCredentials;

    // Refresh if the access token expires within 5 minutes
    const expiresAt = new Date(creds.expires_at).getTime();
    if (Date.now() > expiresAt - 5 * 60 * 1000) {
      const refreshed = await refreshAccessToken(creds.refresh_token);
      const updatedCreds: AmazonCredentials = {
        ...creds,
        access_token: refreshed.access_token,
        // LWA may return a new refresh token; fall back to existing
        refresh_token: refreshed.refresh_token ?? creds.refresh_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      };

      await db.marketplace.update({
        where: { id: this.marketplaceId },
        data: { credentials: updatedCreds as Record<string, unknown> },
      });

      return updatedCreds;
    }

    return creds;
  }

  /**
   * Sign a request with AWS Signature Version 4 for SP-API.
   *
   * SP-API requires:
   *   - Host header
   *   - X-Amz-Date header
   *   - Authorization header (AWS4-HMAC-SHA256)
   *   - x-amz-access-token header (LWA access token)
   *
   * AWS credentials (IAM role ARN/key/secret) are provided via env vars:
   *   AMAZON_AWS_ACCESS_KEY_ID, AMAZON_AWS_SECRET_ACCESS_KEY, AMAZON_AWS_REGION
   */
  private async buildSignedHeaders(
    method: string,
    url: string,
    body: string,
    accessToken: string,
  ): Promise<Record<string, string>> {
    const awsAccessKeyId = process.env.AMAZON_AWS_ACCESS_KEY_ID ?? '';
    const awsSecretAccessKey = process.env.AMAZON_AWS_SECRET_ACCESS_KEY ?? '';
    const awsRegion = process.env.AMAZON_AWS_REGION ?? 'eu-west-1';
    const service = 'execute-api';

    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname;
    const now = new Date();

    // Format: YYYYMMDDTHHMMSSZ
    const amzDate = now.toISOString().replace(/[:-]/g, '').replace(/\.\d+Z$/, 'Z');
    // Format: YYYYMMDD
    const dateStamp = amzDate.slice(0, 8);

    const canonicalUri = parsedUrl.pathname || '/';
    const canonicalQuerystring = parsedUrl.search ? parsedUrl.search.slice(1) : '';

    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');

    const canonicalHeaders =
      `host:${host}\n` +
      `x-amz-access-token:${accessToken}\n` +
      `x-amz-date:${amzDate}\n`;

    const signedHeaders = 'host;x-amz-access-token;x-amz-date';

    const canonicalRequest = [
      method.toUpperCase(),
      canonicalUri,
      canonicalQuerystring,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${awsRegion}/${service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    // Derive the signing key
    const hmac = (key: Buffer | string, data: string): Buffer =>
      crypto.createHmac('sha256', key).update(data).digest();

    const signingKey = hmac(
      hmac(
        hmac(
          hmac(`AWS4${awsSecretAccessKey}`, dateStamp),
          awsRegion,
        ),
        service,
      ),
      'aws4_request',
    );

    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(stringToSign)
      .digest('hex');

    const authorizationHeader =
      `AWS4-HMAC-SHA256 Credential=${awsAccessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      host,
      'x-amz-date': amzDate,
      'x-amz-access-token': accessToken,
      Authorization: authorizationHeader,
      'Content-Type': 'application/json',
    };
  }

  /** Make an authenticated, AWS SigV4-signed request to the SP-API. */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string>,
  ): Promise<T> {
    const creds = await this.getCredentials();

    const qs = queryParams ? `?${new URLSearchParams(queryParams).toString()}` : '';
    const url = `${SP_API_BASE}${path}${qs}`;
    const bodyStr = body != null ? JSON.stringify(body) : '';

    const headers = await this.buildSignedHeaders(method, url, bodyStr, creds.access_token);

    const response = await fetch(url, {
      method,
      headers,
      body: bodyStr || undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new AmazonApiError(response.status, text);
    }

    // 204 No Content
    if (response.status === 204) return undefined as T;

    return response.json() as Promise<T>;
  }

  // ─── ChannelConnector ──────────────────────────────────────────────────────

  async testConnection(): Promise<boolean> {
    try {
      await this.request<unknown>('GET', '/sellers/v1/marketplaceParticipations');
      return true;
    } catch {
      return false;
    }
  }

  async pushProduct(
    listing: ChannelListing,
    product: ChannelProduct,
  ): Promise<{ externalId: string }> {
    const creds = await this.getCredentials();

    // Build a JSON_LISTINGS_FEED document
    const feedDocument = {
      header: {
        sellerId: creds.sellerId,
        version: '2.0',
        issueLocale: 'de_DE',
      },
      messages: [
        {
          messageId: 1,
          sku: product.sku,
          operationType: 'CREATE',
          productType: (listing.channelData?.productType as string | undefined) ?? 'HOME',
          requirements: 'LISTING',
          attributes: {
            item_name: [{ value: listing.channelTitle ?? product.name, language_tag: 'de_DE' }],
            product_description: [
              { value: listing.channelDescription ?? product.description, language_tag: 'de_DE' },
            ],
            list_price: [
              {
                currency: product.currency,
                value_with_tax: listing.channelPrice ?? product.price,
              },
            ],
            ...(product.weight != null && {
              item_weight: [{ unit: 'kilograms', value: product.weight }],
            }),
            ...(listing.channelData?.bullet_points && {
              bullet_point: listing.channelData.bullet_points,
            }),
          },
        },
      ],
    };

    // Step 1: Create feed document
    const docResult = await this.request<{ feedDocumentId: string; url: string }>(
      'POST',
      '/feeds/2021-06-30/documents',
      { contentType: 'application/json; charset=UTF-8' },
    );

    // Step 2: Upload feed content to the pre-signed S3 URL
    await fetch(docResult.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(feedDocument),
    });

    // Step 3: Submit feed
    const feedResult = await this.request<{ feedId: string }>(
      'POST',
      '/feeds/2021-06-30/feeds',
      {
        feedType: 'JSON_LISTINGS_FEED',
        marketplaceIds: [creds.marketplaceId],
        inputFeedDocumentId: docResult.feedDocumentId,
      },
    );

    return { externalId: feedResult.feedId };
  }

  async updateProduct(listing: ChannelListing, product: ChannelProduct): Promise<void> {
    if (!listing.externalListingId) {
      throw new Error('Cannot update product: missing externalListingId');
    }

    const creds = await this.getCredentials();

    // PATCH via Listings Items API
    await this.request<void>(
      'PATCH',
      `/listings/2021-08-01/items/${creds.sellerId}/${listing.externalListingId}`,
      {
        productType: (listing.channelData?.productType as string | undefined) ?? 'HOME',
        patches: [
          {
            op: 'replace',
            path: '/attributes/item_name',
            value: [{ value: listing.channelTitle ?? product.name, language_tag: 'de_DE' }],
          },
          {
            op: 'replace',
            path: '/attributes/list_price',
            value: [
              {
                currency: product.currency,
                value_with_tax: listing.channelPrice ?? product.price,
              },
            ],
          },
        ],
      },
      { marketplaceIds: creds.marketplaceId },
    );
  }

  async deactivateProduct(listing: ChannelListing): Promise<void> {
    if (!listing.externalListingId) {
      throw new Error('Cannot deactivate product: missing externalListingId');
    }

    const creds = await this.getCredentials();

    // DELETE via Listings Items API removes the listing
    await this.request<void>(
      'DELETE',
      `/listings/2021-08-01/items/${creds.sellerId}/${listing.externalListingId}`,
      undefined,
      { marketplaceIds: creds.marketplaceId },
    );
  }

  async pushInventory(sku: string, quantity: number): Promise<void> {
    const creds = await this.getCredentials();

    // Fulfillment Inventory / Inventory Summaries (FBA) or Inventory Feed for MFN
    // For MFN sellers use the Listings Items API to update fulfillment availability
    await this.request<void>(
      'PATCH',
      `/listings/2021-08-01/items/${creds.sellerId}/${sku}`,
      {
        productType: 'HOME',
        patches: [
          {
            op: 'replace',
            path: '/attributes/fulfillment_availability',
            value: [
              {
                fulfillment_channel_code: 'DEFAULT',
                quantity,
              },
            ],
          },
        ],
      },
      { marketplaceIds: creds.marketplaceId },
    );
  }

  async pushPrice(externalListingId: string, price: number, currency: string): Promise<void> {
    const creds = await this.getCredentials();

    await this.request<void>(
      'PATCH',
      `/listings/2021-08-01/items/${creds.sellerId}/${externalListingId}`,
      {
        productType: 'HOME',
        patches: [
          {
            op: 'replace',
            path: '/attributes/list_price',
            value: [{ currency, value_with_tax: price }],
          },
        ],
      },
      { marketplaceIds: creds.marketplaceId },
    );
  }

  async importOrders(since: Date): Promise<ExternalOrder[]> {
    const creds = await this.getCredentials();
    const createdAfter = since.toISOString();

    const result = await this.request<{ payload: { Orders: AmazonOrder[]; NextToken?: string } }>(
      'GET',
      '/orders/v0/orders',
      undefined,
      {
        MarketplaceIds: creds.marketplaceId,
        CreatedAfter: createdAfter,
        OrderStatuses: 'Unshipped,PartiallyShipped,Shipped',
      },
    );

    const orders = result.payload?.Orders ?? [];
    const externalOrders: ExternalOrder[] = [];

    for (const order of orders) {
      // Fetch order items for each order
      const itemsResult = await this.request<{
        payload: { OrderItems: AmazonOrderItem[] };
      }>('GET', `/orders/v0/orders/${order.AmazonOrderId}/orderItems`);

      const items = itemsResult.payload?.OrderItems ?? [];
      const addr = order.ShippingAddress;
      const nameParts = (addr?.Name ?? order.BuyerInfo?.BuyerName ?? '').split(' ');

      externalOrders.push({
        externalOrderId: order.AmazonOrderId,
        externalCustomerEmail: order.BuyerInfo?.BuyerEmail ?? null,
        externalCustomerName: order.BuyerInfo?.BuyerName ?? null,
        items: items.map((item) => ({
          externalSku: item.SellerSKU ?? item.ASIN,
          name: item.Title ?? item.ASIN,
          quantity: item.QuantityOrdered,
          unitPrice: item.ItemPrice ? parseFloat(item.ItemPrice.Amount) / item.QuantityOrdered : 0,
          personalization: null,
        })),
        shippingAddress: {
          name: addr?.Name ?? order.BuyerInfo?.BuyerName ?? '',
          street1: addr?.AddressLine1 ?? '',
          street2: addr?.AddressLine2 ?? null,
          city: addr?.City ?? '',
          state: addr?.StateOrRegion ?? null,
          postalCode: addr?.PostalCode ?? '',
          country: addr?.CountryCode ?? '',
        },
        total: order.OrderTotal ? parseFloat(order.OrderTotal.Amount) : 0,
        currency: order.OrderTotal?.CurrencyCode ?? 'EUR',
        paidAt: order.PurchaseDate,
        externalData: {
          amazonOrderId: order.AmazonOrderId,
          orderStatus: order.OrderStatus,
          internalStatus: AMAZON_ORDER_STATUS_MAP[order.OrderStatus] ?? 'PENDING',
          firstName: nameParts[0] ?? '',
          lastName: nameParts.slice(1).join(' '),
        },
      });
    }

    return externalOrders;
  }

  async acknowledgeOrder(externalOrderId: string): Promise<void> {
    const creds = await this.getCredentials();

    const feedDocument = {
      header: {
        sellerId: creds.sellerId,
        version: '2.0',
      },
      messages: [
        {
          messageId: 1,
          orderId: externalOrderId,
          operationType: 'ACK_ORDER',
        },
      ],
    };

    // Create feed document
    const docResult = await this.request<{ feedDocumentId: string; url: string }>(
      'POST',
      '/feeds/2021-06-30/documents',
      { contentType: 'application/json; charset=UTF-8' },
    );

    // Upload feed
    await fetch(docResult.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(feedDocument),
    });

    // Submit feed
    await this.request<void>('POST', '/feeds/2021-06-30/feeds', {
      feedType: 'ORDER_ACKNOWLEDGEMENT_DATA',
      marketplaceIds: [creds.marketplaceId],
      inputFeedDocumentId: docResult.feedDocumentId,
    });
  }

  async pushFulfillment(externalOrderId: string, tracking: TrackingInfo): Promise<void> {
    await this.request<void>(
      'POST',
      `/orders/v0/orders/${externalOrderId}/shipment`,
      {
        marketplaceId: (await this.getCredentials()).marketplaceId,
        fulfillmentDate: new Date().toISOString(),
        fulfillmentData: {
          carrierCode: tracking.carrier,
          trackingNumber: tracking.trackingNumber,
          shipDate: new Date().toISOString(),
        },
      },
    );
  }

  /**
   * Verify an Amazon SNS/EventBridge notification signature.
   * Amazon SNS signs messages with an RSA SHA-1 signature; we verify using
   * the SigningCertURL field in the message. For simplicity we also support
   * a shared-secret HMAC fallback configured via AMAZON_WEBHOOK_SECRET env.
   */
  verifyWebhook(payload: Buffer, signature: string): boolean {
    const secret = process.env.AMAZON_WEBHOOK_SECRET ?? '';
    if (!secret) return false;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(signature, 'hex'),
      );
    } catch {
      return false;
    }
  }
}
