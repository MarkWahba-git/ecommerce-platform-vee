import type {
  ExternalOrder,
  TrackingInfo,
} from '@vee/shared';

export interface ChannelConnector {
  readonly channelType: string;

  /** Test the connection credentials */
  testConnection(): Promise<boolean>;

  /** Push a product listing to the channel */
  pushProduct(listing: ChannelListing, product: ChannelProduct): Promise<{ externalId: string }>;

  /** Update an existing listing */
  updateProduct(listing: ChannelListing, product: ChannelProduct): Promise<void>;

  /** Deactivate/remove a listing */
  deactivateProduct(listing: ChannelListing): Promise<void>;

  /** Push inventory quantity to channel */
  pushInventory(sku: string, quantity: number): Promise<void>;

  /** Push price update to channel */
  pushPrice(externalListingId: string, price: number, currency: string): Promise<void>;

  /** Import new orders since a given date */
  importOrders(since: Date): Promise<ExternalOrder[]>;

  /** Acknowledge receipt of an order */
  acknowledgeOrder(externalOrderId: string): Promise<void>;

  /** Push fulfillment/tracking info for an order */
  pushFulfillment(externalOrderId: string, tracking: TrackingInfo): Promise<void>;

  /** Verify a webhook payload signature */
  verifyWebhook(payload: Buffer, signature: string): boolean;
}

export interface ChannelListing {
  externalListingId: string | null;
  channelPrice: number | null;
  channelTitle: string | null;
  channelDescription: string | null;
  channelData: Record<string, unknown> | null;
}

export interface ChannelProduct {
  sku: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: { url: string; altText: string | null }[];
  weight: number | null;
  variants: {
    sku: string;
    name: string;
    price: number | null;
    options: Record<string, string>;
  }[];
}
