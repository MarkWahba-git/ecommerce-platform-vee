'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe';
import { useCartStore } from '@/stores/cart';
import type { Stripe } from '@stripe/stripe-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AddressData {
  firstName: string;
  lastName: string;
  company: string;
  street1: string;
  street2: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
}

interface AddressErrors {
  firstName?: string;
  lastName?: string;
  street1?: string;
  city?: string;
  postalCode?: string;
}

type ShippingMethod = 'standard' | 'express';

const SHIPPING_OPTIONS: { id: ShippingMethod; label: string; description: string; price: number }[] = [
  {
    id: 'standard',
    label: 'Standardversand',
    description: '3–5 Werktage',
    price: 499,
  },
  {
    id: 'express',
    label: 'Expressversand',
    description: '1–2 Werktage',
    price: 999,
  },
];

const FREE_SHIPPING_THRESHOLD = 5000; // 50 EUR in cents

const EMPTY_ADDRESS: AddressData = {
  firstName: '',
  lastName: '',
  company: '',
  street1: '',
  street2: '',
  city: '',
  postalCode: '',
  country: 'DE',
  phone: '',
};

function formatEUR(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
    cents / 100
  );
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS = ['Adresse', 'Versand', 'Zahlung', 'Übersicht'];

function StepIndicator({ current }: { current: number }) {
  return (
    <nav aria-label="Checkout-Schritte" className="mb-8">
      <ol className="flex items-center">
        {STEPS.map((label, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < current;
          const isActive = stepNum === current;
          return (
            <li key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    isCompleted
                      ? 'bg-foreground text-background'
                      : isActive
                      ? 'border-2 border-foreground bg-background text-foreground'
                      : 'border border-border bg-background text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={`mt-1 text-xs ${
                    isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-px flex-1 transition-colors ${
                    isCompleted ? 'bg-foreground' : 'bg-border'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Address form
// ---------------------------------------------------------------------------

function AddressForm({
  title,
  data,
  errors,
  onChange,
}: {
  title: string;
  data: AddressData;
  errors: AddressErrors;
  onChange: (field: keyof AddressData, value: string) => void;
}) {
  const inputClass = (hasError: boolean) =>
    `block w-full rounded-lg border px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground shadow-sm transition focus:outline-none focus:ring-1 ${
      hasError
        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500'
        : 'border-border bg-background focus:border-foreground focus:ring-foreground'
    }`;

  return (
    <fieldset className="space-y-4">
      <legend className="mb-4 text-base font-semibold text-foreground">{title}</legend>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Vorname *</label>
          <input
            type="text"
            autoComplete="given-name"
            value={data.firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            placeholder="Anna"
            className={inputClass(!!errors.firstName)}
          />
          {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Nachname *</label>
          <input
            type="text"
            autoComplete="family-name"
            value={data.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
            placeholder="Müller"
            className={inputClass(!!errors.lastName)}
          />
          {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Firma <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          type="text"
          autoComplete="organization"
          value={data.company}
          onChange={(e) => onChange('company', e.target.value)}
          placeholder="Muster GmbH"
          className={inputClass(false)}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Straße und Hausnummer *</label>
        <input
          type="text"
          autoComplete="street-address"
          value={data.street1}
          onChange={(e) => onChange('street1', e.target.value)}
          placeholder="Musterstraße 12"
          className={inputClass(!!errors.street1)}
        />
        {errors.street1 && <p className="mt-1 text-xs text-red-600">{errors.street1}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Adresszusatz <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          type="text"
          autoComplete="address-line2"
          value={data.street2}
          onChange={(e) => onChange('street2', e.target.value)}
          placeholder="Appartement, Etage, c/o …"
          className={inputClass(false)}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">PLZ *</label>
          <input
            type="text"
            autoComplete="postal-code"
            value={data.postalCode}
            onChange={(e) => onChange('postalCode', e.target.value)}
            placeholder="12345"
            className={inputClass(!!errors.postalCode)}
          />
          {errors.postalCode && <p className="mt-1 text-xs text-red-600">{errors.postalCode}</p>}
        </div>
        <div className="col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-foreground">Stadt *</label>
          <input
            type="text"
            autoComplete="address-level2"
            value={data.city}
            onChange={(e) => onChange('city', e.target.value)}
            placeholder="Berlin"
            className={inputClass(!!errors.city)}
          />
          {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Land</label>
          <select
            value={data.country}
            onChange={(e) => onChange('country', e.target.value)}
            autoComplete="country"
            className="block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground shadow-sm transition focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="DE">Deutschland</option>
            <option value="AT">Österreich</option>
            <option value="CH">Schweiz</option>
            <option value="LU">Luxemburg</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Telefon <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            type="tel"
            autoComplete="tel"
            value={data.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="+49 30 123456"
            className={inputClass(false)}
          />
        </div>
      </div>
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Payment step (inside Stripe Elements context)
// ---------------------------------------------------------------------------

function PaymentStep({
  onBack,
  onNext,
  isProcessing,
}: {
  onBack: () => void;
  onNext: () => void;
  isProcessing: boolean;
}) {
  const [cardError, setCardError] = useState('');

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Zahlungsinformationen</h2>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Kreditkarte
        </label>
        <div className="rounded-lg border border-border bg-background px-4 py-3.5 shadow-sm">
          <CardElement
            onChange={(e) => setCardError(e.error?.message ?? '')}
            options={{
              style: {
                base: {
                  fontSize: '14px',
                  color: '#1a1a1a',
                  fontFamily: 'system-ui, sans-serif',
                  '::placeholder': { color: '#9ca3af' },
                },
                invalid: { color: '#ef4444' },
              },
              hidePostalCode: true,
            }}
          />
        </div>
        {cardError && <p className="mt-1 text-xs text-red-600">{cardError}</p>}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Deine Zahlungsdaten werden sicher über Stripe verarbeitet.
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
        >
          Zurück
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isProcessing}
          className="flex-1 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
        >
          Weiter zur Übersicht
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Order review step
// ---------------------------------------------------------------------------

function ReviewStep({
  items,
  shippingAddress,
  shippingMethod,
  subtotal,
  shippingCost,
  onBack,
  onConfirm,
  isProcessing,
  error,
}: {
  items: { name: string; quantity: number; totalPrice: number }[];
  shippingAddress: AddressData;
  shippingMethod: ShippingMethod;
  subtotal: number;
  shippingCost: number;
  onBack: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
  error: string;
}) {
  const shipping = SHIPPING_OPTIONS.find((o) => o.id === shippingMethod)!;
  const total = subtotal + shippingCost;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Bestellung prüfen</h2>

      {/* Items */}
      <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-foreground">
              {item.name}{' '}
              <span className="text-muted-foreground">× {item.quantity}</span>
            </span>
            <span className="text-sm font-medium text-foreground">
              {formatEUR(item.totalPrice)}
            </span>
          </div>
        ))}
      </div>

      {/* Shipping address */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Lieferadresse</h3>
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-foreground leading-relaxed">
          <p>
            {shippingAddress.firstName} {shippingAddress.lastName}
          </p>
          {shippingAddress.company && <p>{shippingAddress.company}</p>}
          <p>{shippingAddress.street1}</p>
          {shippingAddress.street2 && <p>{shippingAddress.street2}</p>}
          <p>
            {shippingAddress.postalCode} {shippingAddress.city}
          </p>
          <p>{shippingAddress.country}</p>
        </div>
      </div>

      {/* Shipping method */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Versandmethode</h3>
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
          {shipping.label} — {shipping.description} —{' '}
          {shippingCost === 0 ? (
            <span className="text-green-600 font-medium">Kostenlos</span>
          ) : (
            formatEUR(shippingCost)
          )}
        </div>
      </div>

      {/* Totals */}
      <div className="space-y-2 rounded-lg border border-border px-4 py-4 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Zwischensumme</span>
          <span>{formatEUR(subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Versand</span>
          <span>{shippingCost === 0 ? <span className="text-green-600">Kostenlos</span> : formatEUR(shippingCost)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
          <span>Gesamtbetrag</span>
          <span>{formatEUR(total)}</span>
        </div>
        <p className="text-xs text-muted-foreground">Inkl. MwSt.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
        >
          Zurück
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Zahlung wird verarbeitet …
            </>
          ) : (
            'Jetzt kaufen'
          )}
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Mit dem Kauf stimmst du unseren{' '}
        <a href="/legal/agb" className="underline underline-offset-2">AGB</a> zu.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner checkout (needs Stripe context)
// ---------------------------------------------------------------------------

function CheckoutInner() {
  const router = useRouter();
  const { items, subtotal, sessionId } = useCartStore();

  const stripe = useStripe();
  const elements = useElements();

  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  // Address state
  const [shippingAddress, setShippingAddress] = useState<AddressData>(EMPTY_ADDRESS);
  const [separateBilling, setSeparateBilling] = useState(false);
  const [billingAddress, setBillingAddress] = useState<AddressData>(EMPTY_ADDRESS);
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [billingErrors, setBillingErrors] = useState<AddressErrors>({});

  // Shipping
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard');

  // Computed shipping cost
  const shippingCost =
    subtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : SHIPPING_OPTIONS.find((o) => o.id === shippingMethod)!.price;

  // ---------------------------------------------------------------------------
  // Validation helpers
  // ---------------------------------------------------------------------------

  function validateAddress(data: AddressData): AddressErrors {
    const errors: AddressErrors = {};
    if (!data.firstName.trim()) errors.firstName = 'Vorname ist erforderlich.';
    if (!data.lastName.trim()) errors.lastName = 'Nachname ist erforderlich.';
    if (!data.street1.trim()) errors.street1 = 'Straße ist erforderlich.';
    if (!data.city.trim()) errors.city = 'Stadt ist erforderlich.';
    if (!data.postalCode.trim()) errors.postalCode = 'PLZ ist erforderlich.';
    return errors;
  }

  // ---------------------------------------------------------------------------
  // Step navigation
  // ---------------------------------------------------------------------------

  function handleAddressNext() {
    const errors = validateAddress(shippingAddress);
    if (separateBilling) {
      const bErrors = validateAddress(billingAddress);
      setBillingErrors(bErrors);
      if (Object.keys(bErrors).length > 0) {
        setAddressErrors(errors);
        return;
      }
    }
    setAddressErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setStep(2);
  }

  function handleShippingNext() {
    setStep(3);
  }

  function handlePaymentNext() {
    setStep(4);
  }

  // ---------------------------------------------------------------------------
  // Confirm & pay
  // ---------------------------------------------------------------------------

  const handleConfirm = useCallback(async () => {
    if (!stripe || !elements) return;

    setConfirmError('');
    setIsProcessing(true);

    try {
      const cardEl = elements.getElement(CardElement);
      if (!cardEl) throw new Error('Kartenelement nicht gefunden.');

      // POST to checkout API to create order + PaymentIntent
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: sessionId,
          shippingAddress: {
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            company: shippingAddress.company || undefined,
            street1: shippingAddress.street1,
            street2: shippingAddress.street2 || undefined,
            city: shippingAddress.city,
            postalCode: shippingAddress.postalCode,
            country: shippingAddress.country,
            phone: shippingAddress.phone || undefined,
          },
          billingAddress: separateBilling
            ? {
                firstName: billingAddress.firstName,
                lastName: billingAddress.lastName,
                company: billingAddress.company || undefined,
                street1: billingAddress.street1,
                street2: billingAddress.street2 || undefined,
                city: billingAddress.city,
                postalCode: billingAddress.postalCode,
                country: billingAddress.country,
                phone: billingAddress.phone || undefined,
              }
            : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Checkout fehlgeschlagen.');
      }

      const { clientSecret, orderId } = data as { clientSecret: string; orderId: string };

      // Confirm payment with Stripe
      const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardEl,
          billing_details: {
            name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
            email: undefined,
            address: {
              line1: shippingAddress.street1,
              city: shippingAddress.city,
              postal_code: shippingAddress.postalCode,
              country: shippingAddress.country,
            },
          },
        },
      });

      if (stripeError) {
        throw new Error(
          stripeError.message ?? 'Zahlung fehlgeschlagen. Bitte überprüfe deine Kartendaten.'
        );
      }

      // Success
      router.push(`/checkout/confirmation/${orderId}`);
    } catch (err) {
      setConfirmError(
        err instanceof Error
          ? err.message
          : 'Zahlung fehlgeschlagen. Bitte versuche es erneut.'
      );
    } finally {
      setIsProcessing(false);
    }
  }, [stripe, elements, sessionId, shippingAddress, billingAddress, separateBilling, router]);

  // ---------------------------------------------------------------------------
  // Redirect if cart is empty
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (items.length === 0) {
      router.replace('/cart');
    }
  }, [items.length, router]);

  if (items.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground text-sm">Dein Warenkorb ist leer…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground">Kasse</h1>

      <StepIndicator current={step} />

      {/* ─── Step 1: Address ─── */}
      {step === 1 && (
        <div className="space-y-6">
          <AddressForm
            title="Lieferadresse"
            data={shippingAddress}
            errors={addressErrors}
            onChange={(field, value) =>
              setShippingAddress((prev) => ({ ...prev, [field]: value }))
            }
          />

          {/* Separate billing toggle */}
          <div className="flex items-center gap-3">
            <input
              id="separateBilling"
              type="checkbox"
              checked={separateBilling}
              onChange={(e) => setSeparateBilling(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-foreground"
            />
            <label htmlFor="separateBilling" className="text-sm text-foreground">
              Abweichende Rechnungsadresse
            </label>
          </div>

          {separateBilling && (
            <AddressForm
              title="Rechnungsadresse"
              data={billingAddress}
              errors={billingErrors}
              onChange={(field, value) =>
                setBillingAddress((prev) => ({ ...prev, [field]: value }))
              }
            />
          )}

          <button
            type="button"
            onClick={handleAddressNext}
            className="w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
          >
            Weiter zum Versand
          </button>
        </div>
      )}

      {/* ─── Step 2: Shipping ─── */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Versandmethode</h2>

          {subtotal >= FREE_SHIPPING_THRESHOLD && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Glückwunsch! Du erhältst kostenlosen Versand für diese Bestellung.
            </div>
          )}

          <div className="space-y-3">
            {SHIPPING_OPTIONS.map((option) => {
              const isFree = subtotal >= FREE_SHIPPING_THRESHOLD;
              const displayPrice = isFree ? 0 : option.price;
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-4 rounded-lg border-2 px-4 py-4 transition-colors ${
                    shippingMethod === option.id
                      ? 'border-foreground bg-muted/30'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <input
                    type="radio"
                    name="shippingMethod"
                    value={option.id}
                    checked={shippingMethod === option.id}
                    onChange={() => setShippingMethod(option.id)}
                    className="h-4 w-4 accent-foreground"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {displayPrice === 0 ? (
                      <span className="text-green-600">Kostenlos</span>
                    ) : (
                      formatEUR(displayPrice)
                    )}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={handleShippingNext}
              className="flex-1 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
            >
              Weiter zur Zahlung
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Payment ─── */}
      {step === 3 && (
        <PaymentStep
          onBack={() => setStep(2)}
          onNext={handlePaymentNext}
          isProcessing={isProcessing}
        />
      )}

      {/* ─── Step 4: Review ─── */}
      {step === 4 && (
        <ReviewStep
          items={items.map((i) => ({
            name: i.productName,
            quantity: i.quantity,
            totalPrice: i.totalPrice,
          }))}
          shippingAddress={shippingAddress}
          shippingMethod={shippingMethod}
          subtotal={subtotal}
          shippingCost={shippingCost}
          onBack={() => setStep(3)}
          onConfirm={handleConfirm}
          isProcessing={isProcessing}
          error={confirmError}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wrapper that provides Stripe Elements context
// ---------------------------------------------------------------------------

export default function CheckoutPage() {
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof getStripe> | null>(
    null
  );

  useEffect(() => {
    setStripePromise(getStripe());
  }, []);

  if (!stripePromise) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground text-sm">Laden …</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise as unknown as Promise<Stripe | null>}>
      <CheckoutInner />
    </Elements>
  );
}
