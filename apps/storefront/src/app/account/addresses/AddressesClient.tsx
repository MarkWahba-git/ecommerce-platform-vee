'use client';

import { useState } from 'react';

type Address = {
  id: string;
  type: string;
  isDefault: boolean;
  firstName: string;
  lastName: string;
  company: string | null;
  street1: string;
  street2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};

type AddressFormData = {
  firstName: string;
  lastName: string;
  company: string;
  street1: string;
  street2: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
};

const emptyForm: AddressFormData = {
  firstName: '',
  lastName: '',
  company: '',
  street1: '',
  street2: '',
  city: '',
  postalCode: '',
  country: 'DE',
  phone: '',
  isDefault: false,
};

const typeLabel: Record<string, string> = {
  SHIPPING: 'Lieferadresse',
  BILLING: 'Rechnungsadresse',
  BOTH: 'Liefer- & Rechnungsadresse',
};

export function AddressesClient({ initialAddresses }: { initialAddresses: Address[] }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  }

  function openEdit(address: Address) {
    setEditingId(address.id);
    setForm({
      firstName: address.firstName,
      lastName: address.lastName,
      company: address.company ?? '',
      street1: address.street1,
      street2: address.street2 ?? '',
      city: address.city,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone ?? '',
      isDefault: address.isDefault,
    });
    setError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const url = editingId ? `/api/addresses/${editingId}` : '/api/addresses';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Fehler beim Speichern.');
        return;
      }
      const saved: Address = await res.json();
      if (editingId) {
        setAddresses((prev) => prev.map((a) => (a.id === editingId ? saved : a)));
      } else {
        setAddresses((prev) => {
          const updated = form.isDefault
            ? prev.map((a) => ({ ...a, isDefault: false }))
            : prev;
          return [saved, ...updated];
        });
      }
      closeForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Adresse wirklich löschen?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  const inputClass =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40';
  const labelClass = 'mb-1 block text-sm font-medium text-foreground';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Adressen</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Verwalte deine gespeicherten Adressen.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          + Neue Adresse
        </button>
      </div>

      {/* Address list */}
      {addresses.length === 0 && !showForm ? (
        <div className="rounded-xl border border-border bg-background p-10 text-center">
          <p className="text-muted-foreground">Noch keine Adressen gespeichert.</p>
          <button
            onClick={openAdd}
            className="mt-4 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Erste Adresse hinzufügen
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`relative rounded-xl border bg-background p-5 ${address.isDefault ? 'border-accent' : 'border-border'}`}
            >
              {address.isDefault && (
                <span className="absolute right-4 top-4 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                  Standard
                </span>
              )}
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                {typeLabel[address.type] ?? address.type}
              </p>
              <address className="not-italic space-y-0.5 text-sm text-foreground">
                <p className="font-semibold">
                  {address.firstName} {address.lastName}
                </p>
                {address.company && (
                  <p className="text-muted-foreground">{address.company}</p>
                )}
                <p>{address.street1}</p>
                {address.street2 && <p>{address.street2}</p>}
                <p>
                  {address.postalCode} {address.city}
                </p>
                <p className="text-muted-foreground">{address.country}</p>
                {address.phone && (
                  <p className="text-muted-foreground">{address.phone}</p>
                )}
              </address>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => openEdit(address)}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Bearbeiten
                </button>
                <button
                  onClick={() => handleDelete(address.id)}
                  disabled={deletingId === address.id}
                  className="text-sm font-medium text-red-500 hover:underline disabled:opacity-50"
                >
                  {deletingId === address.id ? 'Wird gelöscht…' : 'Löschen'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-background p-6">
          <h3 className="mb-5 text-base font-semibold text-foreground">
            {editingId ? 'Adresse bearbeiten' : 'Neue Adresse'}
          </h3>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Vorname *</label>
                <input
                  required
                  className={inputClass}
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  placeholder="Max"
                />
              </div>
              <div>
                <label className={labelClass}>Nachname *</label>
                <input
                  required
                  className={inputClass}
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  placeholder="Mustermann"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Firma (optional)</label>
              <input
                className={inputClass}
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="Musterfirma GmbH"
              />
            </div>

            <div>
              <label className={labelClass}>Straße und Hausnummer *</label>
              <input
                required
                className={inputClass}
                value={form.street1}
                onChange={(e) => setForm((f) => ({ ...f, street1: e.target.value }))}
                placeholder="Musterstraße 1"
              />
            </div>

            <div>
              <label className={labelClass}>Adresszusatz (optional)</label>
              <input
                className={inputClass}
                value={form.street2}
                onChange={(e) => setForm((f) => ({ ...f, street2: e.target.value }))}
                placeholder="c/o, Hinterhaus, etc."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>PLZ *</label>
                <input
                  required
                  className={inputClass}
                  value={form.postalCode}
                  onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                  placeholder="12345"
                />
              </div>
              <div>
                <label className={labelClass}>Stadt *</label>
                <input
                  required
                  className={inputClass}
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Berlin"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Land *</label>
                <select
                  required
                  className={inputClass}
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                >
                  <option value="DE">Deutschland</option>
                  <option value="AT">Österreich</option>
                  <option value="CH">Schweiz</option>
                  <option value="FR">Frankreich</option>
                  <option value="NL">Niederlande</option>
                  <option value="BE">Belgien</option>
                  <option value="LU">Luxemburg</option>
                  <option value="IT">Italien</option>
                  <option value="ES">Spanien</option>
                  <option value="PL">Polen</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Telefon (optional)</label>
                <input
                  type="tel"
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+49 30 12345678"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="rounded border-border"
              />
              <span className="text-foreground">Als Standardadresse festlegen</span>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? 'Wird gespeichert…' : 'Speichern'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
