'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 transition';
const labelClass = 'mb-1.5 block text-sm font-medium text-foreground';

export function CustomOrderForm() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError('Bitte beschreibe deinen Wunsch.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/custom-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Netzwerkfehler. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-green-200 bg-green-50 p-12 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-green-600"
            aria-hidden="true"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-green-800">Anfrage eingegangen!</h3>
        <p className="mt-2 text-sm text-green-700">
          Vielen Dank für deine Anfrage. Wir melden uns in der Regel innerhalb von 1–3 Werktagen
          mit einem persönlichen Angebot.
        </p>
        <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row">
          <button
            onClick={() => {
              setSuccess(false);
              setDescription('');
            }}
            className="rounded-md border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-700 transition hover:bg-green-50"
          >
            Weitere Anfrage stellen
          </button>
          <button
            onClick={() => router.push('/account/custom-orders')}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90"
          >
            Meine Anfragen →
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="description" className={labelClass}>
          Beschreibe deinen Wunsch <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={8}
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Beschreibe so genau wie möglich, was du dir vorstellst. Farben, Maße, Materialien, Anlass, Budget – je mehr Details, desto besser können wir dir helfen."
          className={inputClass}
          minLength={20}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Mindestens 20 Zeichen · {description.length} Zeichen eingegeben
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || description.trim().length < 20}
        className="w-full rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[160px]"
      >
        {submitting ? 'Wird gesendet…' : 'Anfrage senden'}
      </button>
    </form>
  );
}
