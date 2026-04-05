export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  price: number | null;
  options: Record<string, string>;
  isActive: boolean;
  inventory?: {
    quantity: number;
    reservedQuantity: number;
    trackInventory: boolean;
  };
}

export interface PersonalizationField {
  id: string;
  fieldName: string;
  label: string;
  type: string;
  required: boolean;
  options: string[] | null;
  maxLength: number | null;
  priceSurcharge: number | null;
  sortOrder: number;
}

export interface ProductFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isPreview: boolean;
}

export interface ProductDetail {
  id: string;
  type: string;
  status: string;
  slug: string;
  sku: string;
  name: string;
  shortDescription: string | null;
  description: string;
  basePrice: number;
  compareAtPrice: number | null;
  taxRate: number;
  isFeatured: boolean;
  isMadeToOrder: boolean;
  productionDays: number | null;
  weight: number | null;
  isInstantDelivery: boolean;
  maxDownloads: number | null;
  licenseType: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
  personalizationFields: PersonalizationField[];
  files: ProductFile[];
  categories: { id: string; slug: string; name: string }[];
  tags: { id: string; slug: string; name: string }[];
  averageRating: number | null;
  reviewCount: number;
}

export interface ProductCard {
  id: string;
  type: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  isFeatured: boolean;
  isMadeToOrder: boolean;
  primaryImage: ProductImage | null;
  categorySlug: string | null;
}
