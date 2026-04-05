import { db } from '@vee/db';
import { s3, getDownloadUrl } from '../lib/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export interface PackageInfo {
  weightInKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface ShippingRate {
  service: 'DHL_PAKET' | 'DHL_PAECKCHEN' | 'DHL_WARENPOST';
  price: number;
  currency: string;
  estimatedDays: number;
}

/** Shape of a DHL shipment creation response */
interface DhlShipmentResponse {
  shipmentTrackingNumber: string;
  label: {
    b64: string;
    zplCode?: string;
  };
  returnShipmentTrackingNumber?: string;
}

/** Shape of a DHL tracking event */
interface DhlTrackingEvent {
  timestamp: string;
  location?: { address?: { addressLocality?: string; countryCode?: string } };
  description: string;
  status?: string;
}

interface DhlTrackingResponse {
  shipments: Array<{
    id: string;
    status: {
      timestamp: string;
      location?: { address?: { addressLocality?: string } };
      status: string;
      description: string;
    };
    events?: DhlTrackingEvent[];
  }>;
}

class DhlApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(`DHL API Error ${status}: ${message}`);
    this.name = 'DhlApiError';
  }
}

/** Map DHL status codes to our internal Shipment.status strings. */
function mapDhlStatus(dhlStatus: string): string {
  const normalized = dhlStatus.toLowerCase();
  if (normalized.includes('delivered')) return 'delivered';
  if (normalized.includes('out_for_delivery') || normalized.includes('out for delivery')) return 'out_for_delivery';
  if (normalized.includes('in_transit') || normalized.includes('in transit')) return 'in_transit';
  if (normalized.includes('picked_up') || normalized.includes('picked up')) return 'picked_up';
  if (normalized.includes('exception') || normalized.includes('failure')) return 'exception';
  if (normalized.includes('cancelled') || normalized.includes('canceled')) return 'cancelled';
  return 'pending';
}

/** DHL Parcel DE service codes used in the Parcel DE Shipping API v2. */
const DHL_SERVICE_MAP: Record<ShippingRate['service'], string> = {
  DHL_PAKET: 'V01PAK',
  DHL_PAECKCHEN: 'V62WP',
  DHL_WARENPOST: 'V62WP',
};

export class ShippingService {
  private readonly apiBase: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly accountNumber: string;
  private readonly s3Bucket: string;

  constructor() {
    this.apiBase =
      process.env.DHL_API_BASE ?? 'https://api-eu.dhl.com/parcel/de/shipping/v2';
    this.apiKey = process.env.DHL_API_KEY ?? '';
    this.apiSecret = process.env.DHL_API_SECRET ?? '';
    this.accountNumber = process.env.DHL_ACCOUNT_NUMBER ?? '';
    this.s3Bucket = process.env.S3_BUCKET ?? 'vee-assets';
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /** Make an authenticated request to the DHL Parcel DE API. */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string>,
  ): Promise<T> {
    if (!this.apiKey) throw new Error('DHL_API_KEY environment variable is not set');
    if (!this.apiSecret) throw new Error('DHL_API_SECRET environment variable is not set');

    const qs = queryParams
      ? `?${new URLSearchParams(queryParams).toString()}`
      : '';
    const url = `${this.apiBase}${path}${qs}`;

    // Basic auth (API key + secret) for DHL Parcel DE Shipping API
    const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'dhl-api-key': this.apiKey,
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new DhlApiError(response.status, text);
    }

    if (response.status === 204) return undefined as T;

    return response.json() as Promise<T>;
  }

  /**
   * Upload a base64-encoded label PDF to S3 and return the S3 key.
   * Labels are stored under `shipping-labels/{shipmentId}.pdf`.
   */
  private async uploadLabelToS3(shipmentId: string, labelB64: string): Promise<string> {
    const key = `shipping-labels/${shipmentId}.pdf`;
    const pdfBuffer = Buffer.from(labelB64, 'base64');

    await s3.send(
      new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      }),
    );

    return key;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Create a DHL shipment for an order.
   * Fetches the order's shipping address, calls DHL, stores the label in S3,
   * and creates a Shipment record in the database.
   */
  async createShipment(
    orderId: string,
    packages: PackageInfo[],
  ): Promise<{ shipmentId: string; trackingNumber: string; labelUrl: string }> {
    const order = await db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        shippingAddress: true,
        customer: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (!order.shippingAddress) {
      throw new Error(`Order ${orderId} has no shipping address`);
    }

    const addr = order.shippingAddress;

    // Use the first package for simplicity; multi-piece support can be added later
    const pkg = packages[0];
    if (!pkg) throw new Error('At least one package is required');

    const shipmentRequestBody = {
      profile: 'STANDARD_GRUPPENPROFIL',
      shipDate: new Date().toISOString().slice(0, 10),
      shipper: {
        name1: process.env.DHL_SHIPPER_NAME ?? 'Vee Shop',
        addressStreet: process.env.DHL_SHIPPER_STREET ?? '',
        addressHouse: process.env.DHL_SHIPPER_HOUSE ?? '',
        postalCode: process.env.DHL_SHIPPER_POSTAL ?? '',
        city: process.env.DHL_SHIPPER_CITY ?? '',
        country: process.env.DHL_SHIPPER_COUNTRY ?? 'DEU',
        billingNumber: this.accountNumber,
        email: process.env.DHL_SHIPPER_EMAIL,
        phone: process.env.DHL_SHIPPER_PHONE,
      },
      consignee: {
        name1: `${addr.firstName} ${addr.lastName}`.trim(),
        ...(addr.company && { name2: addr.company }),
        addressStreet: addr.street1,
        ...(addr.street2 && { addressHouse: addr.street2 }),
        postalCode: addr.postalCode,
        city: addr.city,
        country: addr.country,
        ...(order.customer?.email && { email: order.customer.email }),
      },
      details: {
        weight: { uom: 'kg', value: pkg.weightInKg },
        dim: {
          uom: 'mm',
          length: Math.round(pkg.lengthCm * 10),
          width: Math.round(pkg.widthCm * 10),
          height: Math.round(pkg.heightCm * 10),
        },
      },
      services: {
        dhlRetoure: false,
      },
      references: {
        referenceNo1: order.orderNumber ?? orderId,
        referenceNo2: orderId,
      },
    };

    const result = await this.request<DhlShipmentResponse>(
      'POST',
      '/shipments',
      shipmentRequestBody,
    );

    const trackingNumber = result.shipmentTrackingNumber;
    const trackingUrl = `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${trackingNumber}`;

    // Upload label to S3
    const labelS3Key = await this.uploadLabelToS3(trackingNumber, result.label.b64);
    const labelUrl = await getDownloadUrl(labelS3Key, 86400); // 24h presigned URL

    // Persist Shipment record
    const shipment = await db.shipment.create({
      data: {
        orderId,
        carrier: 'DHL',
        trackingNumber,
        trackingUrl,
        status: 'pending',
        labelUrl: labelS3Key, // Store S3 key; generate presigned URL on demand
        metadata: {
          dhlShipmentResponse: result,
          packages,
          labelS3Key,
        } as Record<string, unknown>,
      },
    });

    // Mark order as shipped
    await db.order.update({
      where: { id: orderId },
      data: { shippedAt: new Date() },
    });

    return {
      shipmentId: shipment.id,
      trackingNumber,
      labelUrl,
    };
  }

  /**
   * Return a fresh presigned S3 URL for a shipment label.
   */
  async getLabel(shipmentId: string): Promise<string> {
    const shipment = await db.shipment.findUniqueOrThrow({
      where: { id: shipmentId },
    });

    if (!shipment.labelUrl) {
      throw new Error(`Shipment ${shipmentId} has no label`);
    }

    // labelUrl stores the S3 key
    return getDownloadUrl(shipment.labelUrl, 86400);
  }

  /**
   * Call DHL Track & Trace API, update Shipment.status, and return current status.
   */
  async trackShipment(shipmentId: string): Promise<{ status: string; events: DhlTrackingEvent[] }> {
    const shipment = await db.shipment.findUniqueOrThrow({
      where: { id: shipmentId },
    });

    if (!shipment.trackingNumber) {
      throw new Error(`Shipment ${shipmentId} has no tracking number`);
    }

    const trackingApiBase = 'https://api-eu.dhl.com/track/shipments';
    const apiKey = process.env.DHL_TRACKING_API_KEY ?? this.apiKey;

    const response = await fetch(
      `${trackingApiBase}?trackingNumber=${shipment.trackingNumber}&service=express`,
      {
        headers: {
          'DHL-API-Key': apiKey,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new DhlApiError(response.status, text);
    }

    const data = (await response.json()) as DhlTrackingResponse;
    const shipmentData = data.shipments?.[0];

    if (!shipmentData) {
      throw new Error(`No tracking data found for tracking number ${shipment.trackingNumber}`);
    }

    const currentStatus = mapDhlStatus(shipmentData.status.status);

    await db.shipment.update({
      where: { id: shipmentId },
      data: {
        status: currentStatus,
        ...(currentStatus === 'delivered' && { deliveredAt: new Date() }),
      },
    });

    if (currentStatus === 'delivered' || currentStatus === 'in_transit') {
      await db.order.update({
        where: { id: shipment.orderId },
        data: {
          ...(currentStatus === 'delivered' && { deliveredAt: new Date() }),
        },
      });
    }

    return {
      status: currentStatus,
      events: shipmentData.events ?? [],
    };
  }

  /**
   * Cancel a shipment with DHL and update the DB record.
   * DHL Parcel DE allows cancellation of same-day shipments only.
   */
  async cancelShipment(shipmentId: string): Promise<void> {
    const shipment = await db.shipment.findUniqueOrThrow({
      where: { id: shipmentId },
    });

    if (!shipment.trackingNumber) {
      throw new Error(`Shipment ${shipmentId} has no tracking number`);
    }

    if (shipment.status === 'delivered' || shipment.status === 'cancelled') {
      throw new Error(`Shipment ${shipmentId} cannot be cancelled (status: ${shipment.status})`);
    }

    await this.request<void>(
      'DELETE',
      `/shipments/${shipment.trackingNumber}`,
    );

    await db.shipment.update({
      where: { id: shipmentId },
      data: { status: 'cancelled' },
    });
  }

  /**
   * Calculate DHL shipping rates for a given weight and destination.
   * Uses approximate DHL Parcel DE 2024 rate cards (Germany domestic / international).
   */
  async getShippingRates(
    weight: number,
    destination: { postalCode: string; country: string },
  ): Promise<ShippingRate[]> {
    const isDomestic = destination.country === 'DE' || destination.country === 'DEU';

    if (isDomestic) {
      // DHL domestic rates (approximate 2024 business rates incl. VAT)
      const rates: ShippingRate[] = [];

      if (weight <= 0.1) {
        rates.push({ service: 'DHL_WARENPOST', price: 1.99, currency: 'EUR', estimatedDays: 3 });
      }

      if (weight <= 0.5) {
        rates.push({ service: 'DHL_PAECKCHEN', price: 3.99, currency: 'EUR', estimatedDays: 2 });
      }

      if (weight <= 31.5) {
        // DHL Paket — weight-based pricing
        let paketPrice: number;
        if (weight <= 2) paketPrice = 5.49;
        else if (weight <= 5) paketPrice = 6.49;
        else if (weight <= 10) paketPrice = 8.49;
        else if (weight <= 20) paketPrice = 14.99;
        else paketPrice = 19.99;

        rates.push({
          service: 'DHL_PAKET',
          price: paketPrice,
          currency: 'EUR',
          estimatedDays: 1,
        });
      }

      return rates;
    }

    // International (EU zone) — DHL Paket International approximate rates
    const rates: ShippingRate[] = [];
    let price: number;
    if (weight <= 0.5) price = 6.99;
    else if (weight <= 1) price = 8.99;
    else if (weight <= 2) price = 12.99;
    else if (weight <= 5) price = 18.99;
    else if (weight <= 10) price = 26.99;
    else price = 39.99;

    rates.push({ service: 'DHL_PAKET', price, currency: 'EUR', estimatedDays: 5 });

    return rates;
  }

  /**
   * Create shipments for multiple orders in a single batch operation.
   * Errors for individual orders are collected and returned; they do not abort
   * the entire batch.
   */
  async batchCreateShipments(
    orderIds: string[],
    defaultPackage: PackageInfo = {
      weightInKg: 1,
      lengthCm: 30,
      widthCm: 20,
      heightCm: 10,
    },
  ): Promise<
    Array<{
      orderId: string;
      success: boolean;
      shipmentId?: string;
      trackingNumber?: string;
      labelUrl?: string;
      error?: string;
    }>
  > {
    const results = await Promise.allSettled(
      orderIds.map((orderId) => this.createShipment(orderId, [defaultPackage])),
    );

    return results.map((result, index) => {
      const orderId = orderIds[index]!;
      if (result.status === 'fulfilled') {
        return {
          orderId,
          success: true,
          shipmentId: result.value.shipmentId,
          trackingNumber: result.value.trackingNumber,
          labelUrl: result.value.labelUrl,
        };
      } else {
        return {
          orderId,
          success: false,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        };
      }
    });
  }
}

export const shippingService = new ShippingService();
