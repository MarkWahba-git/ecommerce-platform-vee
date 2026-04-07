// ─── Etsy Webhook Event Types ────────────────────────────────────────────────

export const ETSY_WEBHOOK_EVENTS = {
  'receipt.created': {
    description: 'A new order receipt was created (buyer purchased)',
    category: 'orders',
  },
  'receipt.updated': {
    description: 'An existing order receipt was updated',
    category: 'orders',
  },
  'listing.updated': {
    description: 'A listing was updated on Etsy',
    category: 'listings',
  },
  'listing.deactivated': {
    description: 'A listing was deactivated or removed from Etsy',
    category: 'listings',
  },
  'shop.updated': {
    description: 'Shop settings or profile were updated',
    category: 'shop',
  },
} as const;

export type EtsyWebhookEventType = keyof typeof ETSY_WEBHOOK_EVENTS;

// ─── Amazon Notification Types ───────────────────────────────────────────────

export const AMAZON_NOTIFICATION_TYPES = {
  ORDER_CHANGE: {
    description: 'An order was created or its status changed',
    category: 'orders',
  },
  LISTINGS_ITEM_STATUS_CHANGE: {
    description: 'A listing item was activated or deactivated',
    category: 'listings',
  },
  LISTINGS_ITEM_ISSUES_CHANGE: {
    description: 'A listing item has new or resolved issues',
    category: 'listings',
  },
  FULFILLMENT_ORDER_STATUS: {
    description: 'An FBA fulfillment order status changed',
    category: 'fulfillment',
  },
  REPORT_PROCESSING_FINISHED: {
    description: 'A requested report or feed finished processing',
    category: 'reports',
  },
  ITEM_INVENTORY_EVENT_CHANGE: {
    description: 'Inventory quantity changed on Amazon',
    category: 'inventory',
  },
} as const;

export type AmazonNotificationType = keyof typeof AMAZON_NOTIFICATION_TYPES;

// ─── Webhook Payload Types ───────────────────────────────────────────────────

/** Shape of an Etsy webhook event body */
export interface EtsyWebhookPayload {
  /** The resource type and action, e.g. "receipt.created" */
  webhook_resource?: string;
  /** Alias used in some Etsy docs */
  event_type?: string;
  /** The resource ID affected (receipt_id, listing_id, etc.) */
  resource_id?: string | number;
  /** When the event was generated (Unix epoch seconds) */
  create_timestamp?: number;
  /** Additional contextual data */
  [key: string]: unknown;
}

/** Envelope for an Amazon SNS notification delivered to an HTTPS endpoint */
export interface AmazonSnsEnvelope {
  Type: 'Notification' | 'SubscriptionConfirmation' | 'UnsubscribeConfirmation';
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  /** Only present when Type === 'SubscriptionConfirmation' */
  SubscribeURL?: string;
  Token?: string;
  UnsubscribeURL?: string;
}

/** Parsed payload inside an Amazon SNS Message for SP-API notifications */
export interface AmazonNotificationPayload {
  NotificationType: AmazonNotificationType | string;
  EventTime: string;
  Payload: {
    OrderChangeNotification?: {
      AmazonOrderId: string;
      SummaryOfChanges?: Record<string, unknown>;
      OrderStatus?: string;
    };
    ListingsItemStatusChangeNotification?: {
      SellerId: string;
      MarketplaceId: string;
      Asin: string;
      Sku?: string;
      Status?: string;
    };
    ListingsItemIssuesChangeNotification?: {
      SellerId: string;
      MarketplaceId: string;
      Asin: string;
      Sku?: string;
      Issues?: Array<{ code: string; message: string; severity: string }>;
    };
    FulfillmentOrderStatusNotification?: {
      AmazonFulfillmentOrderId?: string;
      FulfillmentOrderStatus?: string;
      StatusUpdatedDate?: string;
      FulfillmentShipmentPackage?: Array<{
        TrackingNumber?: string;
        CarrierCode?: string;
        TrackingURL?: string;
      }>;
    };
    ReportProcessingFinishedNotification?: {
      ReportId: string;
      ReportType: string;
      ProcessingStatus: string;
    };
    InventoryAnyOfferChangedNotification?: {
      MarketplaceId: string;
      ASIN: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}
