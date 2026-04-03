export interface ChannelSummary {
  id: string;
  type: string;
  name: string;
  isActive: boolean;
  lastSyncAt: string | null;
  listingCount: number;
  errorCount: number;
}

export interface SyncJobSummary {
  id: string;
  marketplaceId: string;
  marketplaceName: string;
  type: string;
  status: string;
  direction: string;
  itemsProcessed: number;
  itemsFailed: number;
  itemsTotal: number | null;
  retryCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ExternalOrder {
  externalOrderId: string;
  externalCustomerEmail: string | null;
  externalCustomerName: string | null;
  items: ExternalOrderItem[];
  shippingAddress: ExternalAddress;
  total: number;
  currency: string;
  paidAt: string;
  externalData: Record<string, unknown>;
}

export interface ExternalOrderItem {
  externalSku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  personalization: Record<string, unknown> | null;
}

export interface ExternalAddress {
  name: string;
  street1: string;
  street2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
}

export interface TrackingInfo {
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
}
