'use client';

import { useState } from 'react';

const subjects = [
  'Frage zu einer Bestellung',
  'Produktanfrage',
  'Personalisierungsanfrage',
  'Reklamation / Rücksendung',
  'Zusammenarbeit / Presse',
  'Sonstiges',
];

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 transition';
const labelClass = 'mb-1.5 block text-sm font-medium text-foreground';

export function ContactForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.');
        return;
      }
      setSuccess(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      setError('Es ist ein Netzwerkfehler aufgetreten. Bitte versuche es später erneut.');
    } finally {
      setSending(false);
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
        <h3 className="text-lg font-semibold text-green-800">Nachricht gesendet!</h3>
        <p className="mt-2 text-sm text-green-700">
          Vielen Dank für deine Nachricht. Wir melden uns in der Regel innerhalb von 1–2 Werktagen
          bei dir.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-5 rounded-md border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-700 transition hover:bg-green-50"
        >
          Neue Nachricht schreiben
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background p-6">
      <h2 className="mb-5 text-base font-semibold text-foreground">Nachricht senden</h2>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-name" className={labelClass}>
              Name *
            </label>
            <input
              id="contact-name"
              required
              type="text"
              autoComplete="name"
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Max Mustermann"
            />
          </div>
          <div>
            <label htmlFor="contact-email" className={labelClass}>
              E-Mail-Adresse *
            </label>
            <input
              id="contact-email"
              required
              type="email"
              autoComplete="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="max@beispiel.de"
            />
          </div>
        </div>

        <div>
          <label htmlFor="contact-subject" className={labelClass}>
            Betreff *
          </label>
          <select
            id="contact-subject"
            required
            className={inputClass}
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          >
            <option value="">Bitte wählen…</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="contact-message" className={labelClass}>
            Nachricht *
          </label>
          <textarea
            id="contact-message"
            required
            rows={6}
            className={`${inputClass} resize-y`}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Schreib uns deine Frage oder dein Anliegen…"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Mit dem Absenden dieses Formulars stimmst du der Verarbeitung deiner Daten zur
          Bearbeitung deiner Anfrage zu. Weitere Informationen findest du in unserer{' '}
          <a href="/legal/datenschutz" className="text-accent hover:underline">
            Datenschutzerklärung
          </a>
          .
        </p>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending}
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {sending ? 'Wird gesendet…' : 'Nachricht senden'}
          </button>
        </div>
      </form>
    </div>
  );
}
