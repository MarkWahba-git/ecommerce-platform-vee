'use client';

import { useState } from 'react';
import { Button } from '@vee/ui';
import { AddToCartButton } from '@/components/product/AddToCartButton';

interface PersonalizationField {
  id: string;
  fieldName: string;
  label: string;
  type: string;
  required: boolean;
  options: unknown;
  maxLength: number | null;
  priceSurcharge: { toString(): string } | null;
}

interface PersonalizationFormProps {
  productId: string;
  fields: PersonalizationField[];
}

const formatEUR = (value: string | number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
    typeof value === 'string' ? parseFloat(value) : value,
  );

export function PersonalizationForm({ productId, fields }: PersonalizationFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  if (fields.length === 0) {
    return <AddToCartButton productId={productId} className="w-full" />;
  }

  const allRequiredFilled = fields
    .filter((f) => f.required)
    .every((f) => values[f.fieldName]?.trim());

  const personalization = Object.fromEntries(
    Object.entries(values).filter(([, v]) => v.trim()),
  );

  function handleChange(fieldName: string, value: string) {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
  }

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-foreground">Personalisierung</h3>

      {fields.map((field) => {
        const options = Array.isArray(field.options) ? (field.options as string[]) : [];

        return (
          <div key={field.id} className="flex flex-col gap-1.5">
            <label htmlFor={`field-${field.fieldName}`} className="text-sm font-medium text-foreground">
              {field.label}
              {field.required && <span className="ml-0.5 text-destructive">*</span>}
              {field.priceSurcharge && parseFloat(field.priceSurcharge.toString()) > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (+{formatEUR(field.priceSurcharge.toString())})
                </span>
              )}
            </label>

            {field.type === 'TEXTAREA' ? (
              <textarea
                id={`field-${field.fieldName}`}
                value={values[field.fieldName] ?? ''}
                onChange={(e) => handleChange(field.fieldName, e.target.value)}
                required={field.required}
                maxLength={field.maxLength ?? undefined}
                rows={3}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder={`${field.label} eingeben…`}
              />
            ) : field.type === 'SELECT' && options.length > 0 ? (
              <select
                id={`field-${field.fieldName}`}
                value={values[field.fieldName] ?? ''}
                onChange={(e) => handleChange(field.fieldName, e.target.value)}
                required={field.required}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Bitte wählen…</option>
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : field.type === 'COLOR_PICKER' ? (
              <div className="flex items-center gap-3">
                <input
                  id={`field-${field.fieldName}`}
                  type="color"
                  value={values[field.fieldName] ?? '#000000'}
                  onChange={(e) => handleChange(field.fieldName, e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded border border-border"
                />
                <span className="text-sm text-muted-foreground">
                  {values[field.fieldName] ?? '#000000'}
                </span>
              </div>
            ) : field.type === 'NUMBER' ? (
              <input
                id={`field-${field.fieldName}`}
                type="number"
                value={values[field.fieldName] ?? ''}
                onChange={(e) => handleChange(field.fieldName, e.target.value)}
                required={field.required}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            ) : (
              <input
                id={`field-${field.fieldName}`}
                type="text"
                value={values[field.fieldName] ?? ''}
                onChange={(e) => handleChange(field.fieldName, e.target.value)}
                required={field.required}
                maxLength={field.maxLength ?? undefined}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder={`${field.label} eingeben…`}
              />
            )}

            {field.maxLength && field.type !== 'NUMBER' && (
              <p className="text-xs text-muted-foreground text-right">
                {(values[field.fieldName] ?? '').length}/{field.maxLength}
              </p>
            )}
          </div>
        );
      })}

      {!submitted ? (
        <AddToCartButton
          productId={productId}
          personalization={personalization}
          disabled={!allRequiredFilled}
          className="w-full"
        />
      ) : (
        <Button variant="secondary" className="w-full" onClick={() => setSubmitted(false)}>
          Weitere personalisierte Bestellung
        </Button>
      )}

      {!allRequiredFilled && (
        <p className="text-xs text-muted-foreground">
          * Pflichtfelder müssen ausgefüllt werden
        </p>
      )}
    </div>
  );
}
