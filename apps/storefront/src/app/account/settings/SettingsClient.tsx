'use client';

import { useState } from 'react';

type CustomerData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  marketingConsent: boolean;
  consentDate: string | null;
};

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground';
const labelClass = 'mb-1 block text-sm font-medium text-foreground';

export function SettingsClient({ customer }: { customer: CustomerData }) {
  // Profile form
  const [profile, setProfile] = useState({
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Marketing consent
  const [marketingConsent, setMarketingConsent] = useState(customer.marketingConsent);
  const [savingConsent, setSavingConsent] = useState(false);

  // Password form
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setProfileError(data.error ?? 'Fehler beim Speichern.');
      } else {
        setProfileSuccess('Profil erfolgreich gespeichert.');
        setTimeout(() => setProfileSuccess(''), 3000);
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleConsentChange(checked: boolean) {
    setMarketingConsent(checked);
    setSavingConsent(true);
    try {
      await fetch('/api/account/consent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketingConsent: checked }),
      });
    } finally {
      setSavingConsent(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError('Die neuen Passwörter stimmen nicht überein.');
      return;
    }
    if (passwords.newPassword.length < 8) {
      setPasswordError('Das neue Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPasswordError(data.error ?? 'Fehler beim Ändern des Passworts.');
      } else {
        setPasswordSuccess('Passwort erfolgreich geändert.');
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setPasswordSuccess(''), 3000);
      }
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error ?? 'Fehler beim Löschen des Kontos.');
      } else {
        window.location.href = '/';
      }
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">Einstellungen</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Verwalte dein Profil und deine Datenschutzeinstellungen.
        </p>
      </div>

      {/* Profile */}
      <section className="rounded-xl border border-border bg-background p-6">
        <h3 className="mb-4 text-base font-semibold text-foreground">Profil</h3>
        {profileSuccess && (
          <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
            {profileSuccess}
          </div>
        )}
        {profileError && (
          <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {profileError}
          </div>
        )}
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Vorname</label>
              <input
                className={inputClass}
                value={profile.firstName}
                onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                placeholder="Max"
              />
            </div>
            <div>
              <label className={labelClass}>Nachname</label>
              <input
                className={inputClass}
                value={profile.lastName}
                onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                placeholder="Mustermann"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>E-Mail-Adresse</label>
            <input
              disabled
              className={inputClass}
              value={customer.email}
              title="Die E-Mail-Adresse kann derzeit nicht geändert werden."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Die E-Mail-Adresse kann derzeit nicht geändert werden. Bitte wende dich an unseren
              Support.
            </p>
          </div>
          <div>
            <label className={labelClass}>Telefonnummer (optional)</label>
            <input
              type="tel"
              className={inputClass}
              value={profile.phone}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+49 30 12345678"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {savingProfile ? 'Wird gespeichert…' : 'Änderungen speichern'}
            </button>
          </div>
        </form>
      </section>

      {/* Marketing consent */}
      <section className="rounded-xl border border-border bg-background p-6">
        <h3 className="mb-4 text-base font-semibold text-foreground">Datenschutz & Kommunikation</h3>
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative mt-0.5 shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={marketingConsent}
              disabled={savingConsent}
              onChange={(e) => handleConsentChange(e.target.checked)}
            />
            <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-accent transition-colors peer-disabled:opacity-50" />
            <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Newsletter & Marketing-E-Mails</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ich möchte Neuigkeiten, Angebote und Produktinformationen von Vee Handmade per E-Mail
              erhalten. Diese Einwilligung kann jederzeit widerrufen werden. Weitere Informationen
              findest du in unserer{' '}
              <a href="/legal/datenschutz" className="text-accent hover:underline">
                Datenschutzerklärung
              </a>
              .
            </p>
            {customer.consentDate && marketingConsent && (
              <p className="mt-1 text-xs text-muted-foreground">
                Einwilligung erteilt am:{' '}
                {new Intl.DateTimeFormat('de-DE').format(new Date(customer.consentDate))}
              </p>
            )}
          </div>
        </label>
      </section>

      {/* Change password */}
      <section className="rounded-xl border border-border bg-background p-6">
        <h3 className="mb-4 text-base font-semibold text-foreground">Passwort ändern</h3>
        {passwordSuccess && (
          <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
            {passwordSuccess}
          </div>
        )}
        {passwordError && (
          <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {passwordError}
          </div>
        )}
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className={labelClass}>Aktuelles Passwort</label>
            <input
              required
              type="password"
              autoComplete="current-password"
              className={inputClass}
              value={passwords.currentPassword}
              onChange={(e) =>
                setPasswords((p) => ({ ...p, currentPassword: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Neues Passwort</label>
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={8}
                className={inputClass}
                value={passwords.newPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>Neues Passwort bestätigen</label>
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={8}
                className={inputClass}
                value={passwords.confirmPassword}
                onChange={(e) =>
                  setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))
                }
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Das Passwort muss mindestens 8 Zeichen lang sein.
          </p>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {savingPassword ? 'Wird geändert…' : 'Passwort ändern'}
            </button>
          </div>
        </form>
      </section>

      {/* Delete account */}
      <section className="rounded-xl border border-red-200 bg-background p-6">
        <h3 className="mb-1 text-base font-semibold text-red-700">Konto löschen</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Du kannst dein Konto jederzeit löschen lassen (DSGVO Art. 17 – Recht auf Löschung). Alle
          deine persönlichen Daten werden unwiderruflich gelöscht. Bestelldaten werden gemäß
          gesetzlicher Aufbewahrungspflichten für bis zu 10 Jahre aufbewahrt.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Konto löschen
          </button>
        ) : (
          <div className="space-y-3">
            {deleteError && (
              <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{deleteError}</div>
            )}
            <p className="text-sm text-foreground">
              Bitte gib zur Bestätigung <strong>LÖSCHEN</strong> ein:
            </p>
            <input
              className={inputClass}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="LÖSCHEN"
            />
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirmText !== 'LÖSCHEN'}
                className="rounded-md bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deletingAccount ? 'Wird gelöscht…' : 'Konto endgültig löschen'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                  setDeleteError('');
                }}
                className="rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
