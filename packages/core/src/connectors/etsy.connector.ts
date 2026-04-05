import crypto from 'crypto';
import { db } from '@vee/db';
import type { ExternalOrder, TrackingInfo } from '@vee/shared';
import type { ChannelConnector, ChannelListing, ChannelProduct } from './channel-connector.interface';
import { ETSY_API_BASE, refreshToken as etsyRefreshToken } from './etsy-auth';

/** Shape stored in Marketplace.credentials */
interface EtsyCredentials {
  shop_id: string;
  access_token: string;
  refresh_token: string;
  /** ISO timestamp */
  expires_at: string;
  webhook_secret?: string;
}

/** Etsy receipt (order) from the API */
interface EtsyReceipt {
  receipt_id: number;
  buyer_email: string | null;
  name: string | null;
  total_price: { amount: number; divisor: number; currency_code: string };
  create_timestamp: number;
  transactions: EtsyTransaction[];
  shipments: { tracking_code: string | null; carrier_name: string | null; tracking_url: string | null }[];
  destinations: EtsyDestination[];
}

interface EtsyTransaction {
  listing_id: number;
  sku: string | null;
  title: string;
  quantity: number;
  price: { amount: number; divisor: number; currency_code: string };
  variations: { formatted_name: string; formatted_value: string }[];
}

interface EtsyDestination {
  name: string;
  first_line: string;
  second_line: string | null;
  city: string;
  state: string | null;
  zip: string;
  country_iso: string;
}

class EtsyApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(`Etsy API Error ${status}: ${message}`);
    this.name = 'EtsyApiError';
  }
}

/**
 * Simple token bucket for Etsy's 10 req/sec limit.
 * Shared across all connector instances in the same process.
 */
const rateLimiter = (() => {
  const MAX_TOKENS = 10;
  const REFILL_INTERVAL_MS = 1000;
  let tokens = MAX_TOKENS;
  let lastRefill = Date.now();

  return {
    async acquire(): Promise<void> {
      const now = Date.now();
      const elapsed = now - lastRefill;
      if (elapsed >= REFILL_INTERVAL_MS) {
        tokens = MAX_TOKENS;
        lastRefill = now;
      }

      if (tokens > 0) {
        tokens -= 1;
        return;
      }

      // Wait until next refill window
      const waitMs = REFILL_INTERVAL_MS - elapsed;
      await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
      tokens = MAX_TOKENS - 1;
      lastRefill = Date.now();
    },
  };
})();

export class EtsyConnector implements ChannelConnector {
  readonly channelType = 'ETSY' as const;

  constructor(private readonly marketplaceId: string) {}

  // ─── Private helpers ───────────────────────────────────────────────────────

  /** Load credentials from DB, refreshing the access token if near expiry. */
  private async getCredentials(): Promise<EtsyCredentials> {
    const marketplace = await db.marketplace.findUniqueOrThrow({
      where: { id: this.marketplaceId },
    });

    const creds = marketplace.credentials as EtsyCredentials;

    // Refresh if the token expires within 5 minutes
    const expiresAt = new Date(creds.expires_at).getTime();
    if (Date.now() > expiresAt - 5 * 60 * 1000) {
      const refreshed = await etsyRefreshToken(creds.refresh_token);
      const updatedCreds: EtsyCredentials = {
        ...creds,
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
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

  /** Make an authenticated request to the Etsy v3 API with rate limiting. */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    await rateLimiter.acquire();

    const creds = await this.getCredentials();
    const url = `${ETSY_API_BASE}${path}`;

    const headers: Record<string, string> = {
      'x-api-key': process.env.ETSY_CLIENT_ID ?? '',
      Authorization: `Bearer ${creds.access_token}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new EtsyApiError(response.status, text);
    }

    // 204 No Content
    if (response.status === 204) return undefined as T;

    return response.json() as Promise<T>;
  }

  // ─── ChannelConnector ──────────────────────────────────────────────────────

  async testConnection(): Promise<boolean> {
    try {
      const creds = await this.getCredentials();
      await this.request<{ shop_id: number }>('GET', `/v3/application/shops/${creds.shop_id}`);
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

    const body = {
      quantity: 1,
      title: listing.channelTitle ?? product.name,
      description: listing.channelDescription ?? product.description,
      price: listing.channelPrice ?? product.price,
      who_made: 'i_did',
      when_made: 'made_to_order',
      taxonomy_id: (listing.channelData?.taxonomy_id as number | undefined) ?? 1,
      tags: (listing.channelData?.tags as string[] | undefined) ?? [],
      materials: (listing.channelData?.materials as string[] | undefined) ?? [],
      shipping_profile_id: listing.channelData?.shipping_profile_id as number | undefined,
      ...(listing.channelData?.section_id && { shop_section_id: listing.channelData.section_id }),
    };

    const result = await this.request<{ listing_id: number }>(
      'POST',
      `/v3/application/shops/${creds.shop_id}/listings`,
      body,
    );

    return { externalId: String(result.listing_id) };
  }

  async updateProduct(listing: ChannelListing, product: ChannelProduct): Promise<void> {
    if (!listing.externalListingId) {
      throw new Error('Cannot update product: missing externalListingId');
    }
    const creds = await this.getCredentials();

    const body = {
      title: listing.channelTitle ?? product.name,
      description: listing.channelDescription ?? product.description,
      price: listing.channelPrice ?? product.price,
    };

    await this.request<void>(
      'PUT',
      `/v3/application/shops/${creds.shop_id}/listings/${listing.externalListingId}`,
      body,
    );
  }

  async deactivateProduct(listing: ChannelListing): Promise<void> {
    if (!listing.externalListingId) {
      throw new Error('Cannot deactivate product: missing externalListingId');
    }
    const creds = await this.getCredentials();

    await this.request<void>(
      'PUT',
      `/v3/application/shops/${creds.shop_id}/listings/${listing.externalListingId}`,
      { state: 'inactive' },
    );
  }

  async pushInventory(sku: string, quantity: number): Promise<void> {
    // Find the listing by SKU across this marketplace's listings
    const marketplaceListing = await db.marketplaceListing.findFirst({
      where: {
        marketplaceId: this.marketplaceId,
        variant: { sku },
      },
    });

    if (!marketplaceListing?.externalListingId) return;

    const creds = await this.getCredentials();

    await this.request<void>(
      'PUT',
      `/v3/application/listings/${marketplaceListing.externalListingId}/inventory`,
      {
        products: [
          {
            sku,
            offerings: [
              { price: Number(marketplaceListing.channelPrice ?? 0), quantity, is_enabled: true },
            ],
          },
        ],
      },
    );
  }

  async pushPrice(externalListingId: string, price: number, _currency: string): Promise<void> {
    const creds = await this.getCredentials();

    await this.request<void>(
      'PUT',
      `/v3/application/shops/${creds.shop_id}/listings/${externalListingId}`,
      { price },
    );
  }

  async importOrders(since: Date): Promise<ExternalOrder[]> {
    const creds = await this.getCredentials();
    const minCreated = Math.floor(since.getTime() / 1000);

    const result = await this.request<{ results: EtsyReceipt[] }>(
      'GET',
      `/v3/application/shops/${creds.shop_id}/receipts?min_created=${minCreated}&was_paid=true&limit=100`,
    );

    return (result.results ?? []).map((receipt): ExternalOrder => {
      const dest = receipt.destinations?.[0];
      const nameParts = (dest?.name ?? receipt.name ?? '').split(' ');
      const firstName = nameParts[0] ?? '';
      const lastName = nameParts.slice(1).join(' ');

      const total =
        receipt.total_price.amount / receipt.total_price.divisor;

      return {
        externalOrderId: String(receipt.receipt_id),
        externalCustomerEmail: receipt.buyer_email ?? null,
        externalCustomerName: receipt.name ?? null,
        items: (receipt.transactions ?? []).map((t) => ({
          externalSku: t.sku ?? String(t.listing_id),
          name: t.title,
          quantity: t.quantity,
          unitPrice: t.price.amount / t.price.divisor,
          personalization:
            t.variations?.length > 0
              ? Object.fromEntries(t.variations.map((v) => [v.formatted_name, v.formatted_value]))
              : null,
        })),
        shippingAddress: {
          name: dest?.name ?? receipt.name ?? '',
          street1: dest?.first_line ?? '',
          street2: dest?.second_line ?? null,
          city: dest?.city ?? '',
          state: dest?.state ?? null,
          postalCode: dest?.zip ?? '',
          country: dest?.country_iso ?? '',
        },
        total,
        currency: receipt.total_price.currency_code,
        paidAt: new Date(receipt.create_timestamp * 1000).toISOString(),
        externalData: { receipt_id: receipt.receipt_id, firstName, lastName },
      };
    });
  }

  /** Etsy auto-acknowledges orders, so this is a no-op. */
  async acknowledgeOrder(_externalOrderId: string): Promise<void> {
    // No-op: Etsy does not require explicit acknowledgement
  }

  async pushFulfillment(externalOrderId: string, tracking: TrackingInfo): Promise<void> {
    const creds = await this.getCredentials();

    await this.request<void>(
      'POST',
      `/v3/application/shops/${creds.shop_id}/receipts/${externalOrderId}/tracking`,
      {
        tracking_code: tracking.trackingNumber,
        carrier_name: tracking.carrier,
        ...(tracking.trackingUrl && { tracking_url: tracking.trackingUrl }),
        send_bcc: true,
      },
    );
  }

  verifyWebhook(payload: Buffer, signature: string): boolean {
    const secret = process.env.ETSY_WEBHOOK_SECRET ?? '';
    if (!secret) return false;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
    } catch {
      return false;
    }
  }
}
