'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ApproveProofButtonProps {
  id: string;
}

export function ApproveProofButton({ id }: ApproveProofButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/custom-orders/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve-proof' }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Unbekannter Fehler');
      }
    } catch {
      setError('Netzwerkfehler. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <button
        type="button"
        onClick={handleApprove}
        disabled={loading}
        className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-60"
      >
        {loading ? 'Wird freigegeben…' : 'Entwurf freigeben'}
      </button>
    </div>
  );
}
