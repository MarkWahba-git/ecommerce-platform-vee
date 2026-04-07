import { randomUUID } from 'crypto';
import { db } from '@vee/db';
import type { Prisma } from '@vee/db';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3, getUploadUrl } from '../lib/s3';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUCKET = process.env.S3_BUCKET ?? 'vee-assets';
const S3_ENDPOINT = process.env.S3_ENDPOINT ?? '';
const UPLOAD_EXPIRES_IN = 900; // 15 minutes
const FILE_UPLOAD_EXPIRES_IN = 3600; // 1 hour

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the public (non-presigned) URL for an S3 object.
 * Works with both path-style (MinIO / local) and virtual-hosted-style buckets.
 */
function buildPublicUrl(key: string): string {
  if (S3_ENDPOINT) {
    // Path-style: http://localhost:9000/bucket/key
    return `${S3_ENDPOINT.replace(/\/$/, '')}/${BUCKET}/${key}`;
  }
  // Virtual-hosted-style for AWS
  const region = process.env.S3_REGION ?? 'eu-central-1';
  return `https://${BUCKET}.s3.${region}.amazonaws.com/${key}`;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ImageUploadService {
  // ── Image upload ─────────────────────────────────────────────────────────

  /**
   * Validate content type, generate an S3 key, and return a presigned PUT URL.
   */
  async requestUpload(productId: string, _fileName: string, contentType: string) {
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      throw new Error(
        `Unsupported image type "${contentType}". Allowed: jpeg, png, webp, gif.`,
      );
    }

    const ext = EXTENSION_MAP[contentType];
    const fileKey = `products/${productId}/${randomUUID()}.${ext}`;

    const uploadUrl = await getUploadUrl(fileKey, contentType, UPLOAD_EXPIRES_IN);

    return { uploadUrl, fileKey, expiresIn: UPLOAD_EXPIRES_IN };
  }

  /**
   * Create a ProductImage record after the client has successfully PUT the file
   * to S3. If isPrimary is true, all other images for this product are unset.
   */
  async confirmUpload(
    productId: string,
    fileKey: string,
    data: {
      altText?: string;
      width?: number;
      height?: number;
      isPrimary?: boolean;
    },
  ) {
    const url = buildPublicUrl(fileKey);

    return db.$transaction(async (tx: Prisma.TransactionClient) => {
      if (data.isPrimary) {
        await tx.productImage.updateMany({
          where: { productId },
          data: { isPrimary: false },
        });
      }

      // Determine next sort order
      const last = await tx.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      const sortOrder = (last?.sortOrder ?? -1) + 1;

      return tx.productImage.create({
        data: {
          productId,
          url,
          altText: data.altText ?? null,
          width: data.width ?? null,
          height: data.height ?? null,
          isPrimary: data.isPrimary ?? false,
          sortOrder,
        },
      });
    });
  }

  /**
   * Delete a ProductImage record from the database and, best-effort, from S3.
   */
  async deleteImage(imageId: string) {
    const image = await db.productImage.findUniqueOrThrow({ where: { id: imageId } });

    // Extract the S3 key from the stored URL.
    // URL form: <endpoint>/<bucket>/<key>  OR  https://<bucket>.s3.<region>.amazonaws.com/<key>
    let key: string | null = null;
    try {
      const url = new URL(image.url);
      // Path-style: pathname = /<bucket>/<key>
      const pathParts = url.pathname.replace(/^\//, '').split('/');
      if (pathParts[0] === BUCKET) {
        key = pathParts.slice(1).join('/');
      } else {
        // virtual-hosted-style: pathname = /<key>
        key = pathParts.join('/');
      }
    } catch {
      // Ignore parse errors; just skip the S3 deletion
    }

    // Delete from DB first so callers always get a clean state
    await db.productImage.delete({ where: { id: imageId } });

    // Best-effort S3 deletion
    if (key) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
      } catch (err) {
        console.warn('[ImageUploadService] S3 deletion failed for key:', key, err);
      }
    }
  }

  /**
   * Update sortOrder for a product's images based on the supplied ordered array
   * of image IDs.
   */
  async reorderImages(productId: string, imageIds: string[]) {
    await db.$transaction(
      imageIds.map((id, index) =>
        db.productImage.updateMany({
          where: { id, productId },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  /**
   * Set one image as primary and unset all others for the same product.
   */
  async setPrimaryImage(imageId: string) {
    const image = await db.productImage.findUniqueOrThrow({ where: { id: imageId } });

    return db.$transaction([
      db.productImage.updateMany({
        where: { productId: image.productId },
        data: { isPrimary: false },
      }),
      db.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
    ]);
  }

  /**
   * Update mutable fields on a ProductImage (altText, isPrimary).
   * When setting as primary, all sibling images are demoted first.
   */
  async updateImage(
    imageId: string,
    data: { altText?: string | null; isPrimary?: boolean },
  ) {
    const image = await db.productImage.findUniqueOrThrow({ where: { id: imageId } });

    return db.$transaction(async (tx: Prisma.TransactionClient) => {
      if (data.isPrimary) {
        await tx.productImage.updateMany({
          where: { productId: image.productId },
          data: { isPrimary: false },
        });
      }

      return tx.productImage.update({
        where: { id: imageId },
        data: {
          ...(data.altText !== undefined && { altText: data.altText }),
          ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
        },
      });
    });
  }

  // ── Digital file upload ───────────────────────────────────────────────────

  /**
   * Generate a presigned PUT URL for a digital product file.
   * Key format: files/<productId>/<uuid>/<originalFileName>
   */
  async requestFileUpload(productId: string, fileName: string, contentType: string) {
    const fileKey = `files/${productId}/${randomUUID()}/${fileName}`;
    const uploadUrl = await getUploadUrl(fileKey, contentType, FILE_UPLOAD_EXPIRES_IN);
    return { uploadUrl, fileKey, expiresIn: FILE_UPLOAD_EXPIRES_IN };
  }

  /**
   * Create a ProductFile record after the client has PUT the file to S3.
   */
  async confirmFileUpload(
    productId: string,
    fileKey: string,
    data: {
      fileName: string;
      fileSize: number;
      mimeType: string;
      isPreview?: boolean;
    },
  ) {
    return db.productFile.create({
      data: {
        productId,
        fileKey,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        isPreview: data.isPreview ?? false,
      },
    });
  }

  /**
   * Delete a ProductFile record from the database and, best-effort, from S3.
   */
  async deleteFile(fileId: string) {
    const file = await db.productFile.findUniqueOrThrow({ where: { id: fileId } });

    await db.productFile.delete({ where: { id: fileId } });

    try {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: file.fileKey }));
    } catch (err) {
      console.warn('[ImageUploadService] S3 file deletion failed for key:', file.fileKey, err);
    }
  }
}

export const imageUploadService = new ImageUploadService();
