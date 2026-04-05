import { ProductCard, type ProductCardData } from './ProductCard';
import { cn } from '@vee/ui';

interface ProductGridProps {
  products: ProductCardData[];
  className?: string;
}

export function ProductGrid({ products, className }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-4 text-muted-foreground"
        >
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <line x1="3" x2="21" y1="6" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
        <h3 className="text-lg font-semibold text-foreground">Keine Produkte gefunden</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Versuche es mit anderen Filtern oder schau später wieder vorbei.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className,
      )}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
