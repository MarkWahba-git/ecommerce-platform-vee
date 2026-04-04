import { db } from '@vee/db';
import { getDownloadUrl as getS3DownloadUrl } from '../lib/s3';

export class DigitalDeliveryService {
  /**
   * Grant download access for all digital items in a confirmed order.
   * Called after payment is confirmed.
   */
  async grantAccess(orderId: string) {
    const order = await db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        items: {
          where: { isDigital: true },
          include: {
            product: {
              include: {
                files: { where: { isPreview: false } },
              },
            },
          },
        },
      },
    });

    const records = [];

    for (const item of order.items) {
      for (const file of item.product.files) {
        const expiresAt =
          item.product.downloadExpiryDays != null
            ? new Date(Date.now() + item.product.downloadExpiryDays * 24 * 60 * 60 * 1000)
            : null;

        // Idempotency: skip if already granted for this item+file combination
        const existing = await db.downloadAccess.findFirst({
          where: { orderItemId: item.id, fileKey: file.fileKey },
        });
        if (existing) {
          records.push(existing);
          continue;
        }

        const access = await db.downloadAccess.create({
          data: {
            customerId: order.customerId!,
            orderItemId: item.id,
            fileKey: file.fileKey,
            fileName: file.fileName,
            maxDownloads: item.product.maxDownloads ?? null,
            expiresAt,
          },
        });
        records.push(access);
      }
    }

    return records;
  }

  /**
   * Validate ownership and limits, increment counter, return a presigned S3 URL.
   */
  async getDownloadUrl(accessId: string, customerId: string): Promise<string> {
    const access = await db.downloadAccess.findUnique({ where: { id: accessId } });

    if (!access || access.customerId !== customerId) {
      throw new Error('Download not found');
    }

    if (access.maxDownloads != null && access.downloadCount >= access.maxDownloads) {
      throw new Error('Download limit reached');
    }

    if (access.expiresAt && access.expiresAt < new Date()) {
      throw new Error('Download link has expired');
    }

    // Increment before generating URL to prevent race conditions
    await db.downloadAccess.update({
      where: { id: accessId },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadAt: new Date(),
      },
    });

    return getS3DownloadUrl(access.fileKey, 900);
  }

  /** List all DownloadAccess records for a customer, with file info. */
  async getCustomerDownloads(customerId: string) {
    return db.downloadAccess.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        orderItem: {
          include: {
            order: { select: { id: true, orderNumber: true } },
            product: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  }

  /** Soft-revoke a download by setting maxDownloads to 0. */
  async revokeAccess(accessId: string) {
    return db.downloadAccess.update({
      where: { id: accessId },
      data: { maxDownloads: 0 },
    });
  }
}

export const digitalDeliveryService = new DigitalDeliveryService();
