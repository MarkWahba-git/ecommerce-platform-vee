import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Settings' };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShippingZone {
  name: string;
  countries: string[];
  standardRate: number;
  freeThreshold: number | null;
}

// ---------------------------------------------------------------------------
// Static defaults — in a real project these would be loaded from a DB table
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS = {
  storeName: 'Vee Handmade',
  storeUrl: 'https://vee-handmade.de',
  contactEmail: 'hello@vee-handmade.de',
  taxRate: '19',
  currency: 'EUR',
  fromEmail: 'no-reply@vee-handmade.de',
  replyToEmail: 'hello@vee-handmade.de',
};

const DEFAULT_SHIPPING_ZONES: ShippingZone[] = [
  {
    name: 'Germany',
    countries: ['DE'],
    standardRate: 4.99,
    freeThreshold: 50,
  },
  {
    name: 'European Union',
    countries: ['AT', 'BE', 'FR', 'NL', 'LU', 'PL', 'CZ', 'ES', 'IT'],
    standardRate: 9.99,
    freeThreshold: 100,
  },
  {
    name: 'Rest of World',
    countries: ['*'],
    standardRate: 19.99,
    freeThreshold: null,
  },
];

const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function FormField({
  label,
  name,
  type = 'text',
  defaultValue,
  hint,
  prefix,
  suffix,
  readOnly,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="mt-1">
        {prefix || suffix ? (
          <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-indigo-500">
            {prefix && (
              <span className="flex select-none items-center pl-3 text-gray-500 sm:text-sm">
                {prefix}
              </span>
            )}
            <input
              id={name}
              name={name}
              type={type}
              defaultValue={defaultValue}
              readOnly={readOnly}
              className="block flex-1 border-0 bg-transparent py-2 px-3 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
            />
            {suffix && (
              <span className="flex select-none items-center pr-3 text-gray-500 sm:text-sm">
                {suffix}
              </span>
            )}
          </div>
        ) : (
          <input
            id={name}
            name={name}
            type={type}
            defaultValue={defaultValue}
            readOnly={readOnly}
            className={`block w-full rounded-md border-0 px-3 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm ${
              readOnly ? 'bg-gray-50 text-gray-500' : ''
            }`}
          />
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (server component — forms use native POST)
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Manage your store configuration.
        </p>
      </div>

      {/* Store info */}
      <form method="POST" action="/api/settings/store">
        <SectionCard
          title="Store Information"
          description="Basic details about your store."
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                label="Store Name"
                name="storeName"
                defaultValue={DEFAULT_SETTINGS.storeName}
              />
              <FormField
                label="Store URL"
                name="storeUrl"
                type="url"
                defaultValue={DEFAULT_SETTINGS.storeUrl}
                prefix="🌐"
              />
            </div>
            <FormField
              label="Contact Email"
              name="contactEmail"
              type="email"
              defaultValue={DEFAULT_SETTINGS.contactEmail}
            />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                label="Default Tax Rate (%)"
                name="taxRate"
                type="number"
                defaultValue={DEFAULT_SETTINGS.taxRate}
                suffix="%"
                hint="Applied to products without an explicit tax rate."
              />
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                  Currency
                </label>
                <div className="mt-1">
                  <select
                    id="currency"
                    name="currency"
                    defaultValue={DEFAULT_SETTINGS.currency}
                    className="block w-full rounded-md border-0 py-2 pl-3 pr-8 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                    <option value="CHF">CHF — Swiss Franc (Fr.)</option>
                  </select>
                </div>
                <p className="mt-1 text-xs text-gray-500">All prices stored in this currency.</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Save Store Settings
            </button>
          </div>
        </SectionCard>
      </form>

      {/* Email settings */}
      <form method="POST" action="/api/settings/email">
        <SectionCard
          title="Email Settings"
          description="Configure transactional email sending."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              label="From Email"
              name="fromEmail"
              type="email"
              defaultValue={DEFAULT_SETTINGS.fromEmail}
              hint="Sender address for all outgoing emails."
            />
            <FormField
              label="Reply-To Email"
              name="replyToEmail"
              type="email"
              defaultValue={DEFAULT_SETTINGS.replyToEmail}
              hint="Where customers reply to."
            />
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Save Email Settings
            </button>
          </div>
        </SectionCard>
      </form>

      {/* Shipping zones (read-only display — edit routes to dedicated pages) */}
      <SectionCard
        title="Shipping Zones"
        description="Shipping rates applied per zone at checkout."
      >
        <div className="overflow-hidden rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Zone
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Countries
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Standard Rate
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Free Shipping From
                </th>
                <th className="relative py-2.5 pl-3 pr-4">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {DEFAULT_SHIPPING_ZONES.map((zone) => (
                <tr key={zone.name} className="hover:bg-gray-50">
                  <td className="py-3 pl-4 pr-3 text-sm font-medium text-gray-900">
                    {zone.name}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {zone.countries.map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-600"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-medium text-gray-900">
                    {EUR.format(zone.standardRate)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-gray-500">
                    {zone.freeThreshold
                      ? `≥ ${EUR.format(zone.freeThreshold)}`
                      : '—'}
                  </td>
                  <td className="whitespace-nowrap py-3 pl-3 pr-4 text-right text-sm">
                    <a
                      href={`/settings/shipping/${encodeURIComponent(zone.name)}/edit`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <a
            href="/settings/shipping/new"
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            + Add Shipping Zone
          </a>
        </div>
      </SectionCard>

      {/* Danger zone */}
      <SectionCard title="Danger Zone">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-md border border-red-200 bg-red-50 p-4">
            <div>
              <p className="text-sm font-medium text-red-800">Reset All Settings</p>
              <p className="mt-0.5 text-xs text-red-600">
                This will reset all store settings to their defaults. Orders and customer data
                are not affected.
              </p>
            </div>
            <form method="POST" action="/api/settings/reset">
              <button
                type="submit"
                className="shrink-0 rounded-md bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50"
                onClick={(e) => {
                  if (!confirm('Reset all settings to defaults?')) e.preventDefault();
                }}
              >
                Reset
              </button>
            </form>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
