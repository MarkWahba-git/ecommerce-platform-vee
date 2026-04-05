'use client';

import { useState } from 'react';
import { Button } from '@vee/ui';
import { useCartStore } from '@/stores/cart';

interface AddToCartButtonProps {
  productId: string;
  variantId?: string;
  quantity?: number;
  personalization?: Record<string, unknown>;
  disabled?: boolean;
  className?: string;
}

export function AddToCartButton({
  productId,
  variantId,
  quantity = 1,
  personalization,
  disabled = false,
  className,
}: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleClick() {
    if (status === 'loading') return;
    setStatus('loading');
    try {
      await addItem(productId, variantId, quantity, personalization);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  }

  const labels = {
    idle: 'In den Warenkorb',
    loading: 'Wird hinzugefügt…',
    success: 'Hinzugefügt!',
    error: 'Fehler – erneut versuchen',
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || status === 'loading'}
      className={className}
      aria-live="polite"
      aria-label={labels[status]}
    >
      {status === 'loading' && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {status === 'success' && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {labels[status]}
    </Button>
  );
}
