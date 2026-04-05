import { cn } from '@vee/ui';

const formatEUR = (cents: number | string) => {
  const value = typeof cents === 'string' ? parseFloat(cents) : cents;
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

interface PriceDisplayProps {
  price: number | string;
  compareAtPrice?: number | string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceDisplay({ price, compareAtPrice, className, size = 'md' }: PriceDisplayProps) {
  const hasDiscount =
    compareAtPrice != null &&
    parseFloat(String(compareAtPrice)) > parseFloat(String(price));

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl font-semibold',
  };

  return (
    <div className={cn('flex items-baseline gap-2', className)}>
      <span className={cn('font-semibold text-foreground', sizeClasses[size])}>
        {formatEUR(price)}
      </span>
      {hasDiscount && (
        <span className="text-sm text-muted-foreground line-through">
          {formatEUR(compareAtPrice!)}
        </span>
      )}
      {hasDiscount && (
        <span className="rounded bg-accent/20 px-1.5 py-0.5 text-xs font-medium text-accent-foreground">
          {Math.round(
            ((parseFloat(String(compareAtPrice)) - parseFloat(String(price))) /
              parseFloat(String(compareAtPrice))) *
              100,
          )}
          % Rabatt
        </span>
      )}
    </div>
  );
}
