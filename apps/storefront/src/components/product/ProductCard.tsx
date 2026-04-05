import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@vee/ui';
import { PriceDisplay } from './PriceDisplay';

type ProductType = 'PHYSICAL' | 'DIGITAL' | 'PERSONALIZED';

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  type: ProductType;
  basePrice: number | string;
  compareAtPrice?: number | string | null;
  images: { url: string; altText?: string | null }[];
  shortDescription?: string | null;
}

interface ProductCardProps {
  product: ProductCardData;
  className?: string;
}

const typeBadge: Record<ProductType, { label: string; classes: string }> = {
  PHYSICAL: { label: 'Handmade', classes: 'bg-secondary text-secondary-foreground' },
  DIGITAL: { label: 'Digital', classes: 'bg-accent/20 text-accent-foreground' },
  PERSONALIZED: { label: 'Individuell', classes: 'bg-primary/10 text-primary' },
};

export function ProductCard({ product, className }: ProductCardProps) {
  const primaryImage = product.images.find((img) => true) ?? null;
  const badge = typeBadge[product.type];

  return (
    <Link
      href={`/product/${product.slug}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-lg border border-border bg-background transition hover:shadow-md',
        className,
      )}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.altText ?? product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
        )}

        {/* Type Badge */}
        <span
          className={cn(
            'absolute left-2 top-2 rounded px-2 py-0.5 text-xs font-medium',
            badge.classes,
          )}
        >
          {badge.label}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-accent">
          {product.name}
        </h3>
        {product.shortDescription && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{product.shortDescription}</p>
        )}
        <div className="mt-auto pt-2">
          <PriceDisplay price={product.basePrice} compareAtPrice={product.compareAtPrice} size="sm" />
        </div>
      </div>
    </Link>
  );
}
