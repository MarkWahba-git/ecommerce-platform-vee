import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@vee/db';
import { formatPrice } from '@vee/shared';
import { CustomOrderActions } from './CustomOrderActions';

export const metadata: Metadata = { title: 'Custom Order Detail' };

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED:     'bg-blue-50    text-blue-800    ring-blue-600/20',
  REVIEWING:     'bg-yellow-50  text-yellow-800  ring-yellow-600/20',
  QUOTED:        'bg-purple-50  text-purple-800  ring-purple-600/20',
  ACCEPTED:      'bg-indigo-50  text-indigo-800  ring-indigo-600/20',
  IN_PRODUCTION: 'bg-orange-50  text-orange-800  ring-orange-600/20',
  PROOF_SENT:    'bg-cyan-50    text-cyan-800    ring-cyan-600/20',
  APPROVED:      'bg-teal-50    text-teal-800    ring-teal-600/20',
  COMPLETED:     'bg-green-50   text-green-800   ring-green-600/20',
  DECLINED:      'bg-red-50     text-red-700     ring-red-600/10',
  CANCELLED:     'bg-gray-50    text-gray-600    ring-gray-500/10',
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED:     ['REVIEWING', 'DECLINED', 'CANCELLED'],
  REVIEWING:     ['QUOTED', 'DECLINED', 'CANCELLED'],
  QUOTED:        ['ACCEPTED', 'DECLINED', 'CANCELLED'],
  ACCEPTED:      ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['PROOF_SENT', 'CANCELLED'],
  PROOF_SENT:    ['APPROVED', 'IN_PRODUCTION', 'CANCELLED'],
  APPROVED:      ['COMPLETED', 'CANCELLED'],
  COMPLETED:     [],
  DECLINED:      [],
  CANCELLED:     [],
};

function Badge({ label, styleClass }: { label: string; styleClass: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styleClass}`}>
      {label.replace(/_/g, ' ')}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="px-6 py-4">{children}</div>
    </section>
  );
}

function DefinitionRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-sm text-gray-500">{label}</dt>
      <dd className="text-right text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function getRequest(id: string) {
  return db.customOrderRequest.findUnique({
    where: { id },
    include: { customer: true },
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CustomOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getRequest(id);
  if (!request) notFound();

  const transitions = VALID_TRANSITIONS[request.status] ?? [];
  const attachments = Array.isArray(request.attachments)
    ? (request.attachments as string[])
    : [];
  const customerName = request.customer
    ? [request.customer.firstName, request.customer.lastName].filter(Boolean).join(' ') ||
      request.customer.email
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/custom-orders" className="text-sm text-gray-500 hover:text-gray-900">
            ← Custom Orders
          </Link>
          <h2 className="mt-1 text-xl font-semibold text-gray-900">Custom Order Request</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Submitted{' '}
            {new Date(request.createdAt).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <Badge
          label={request.status}
          styleClass={STATUS_STYLES[request.status] ?? STATUS_STYLES.SUBMITTED}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          <Section title="Request Details">
            <p className="whitespace-pre-wrap text-sm text-gray-700">{request.description}</p>

            {attachments.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Attachments
                </p>
                <ul className="space-y-1">
                  {attachments.map((key) => (
                    <li key={key}>
                      <span className="font-mono text-xs text-gray-600">
                        {key.split('/').pop()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          {/* Client-side actions: status update, proof upload, convert */}
          <CustomOrderActions
            id={request.id}
            currentStatus={request.status}
            transitions={transitions}
            quotedPrice={request.quotedPrice !== null ? Number(request.quotedPrice) : null}
            quotedDays={request.quotedDays}
            adminNotes={request.adminNotes ?? ''}
            proofFileKey={request.proofFileKey}
            orderId={request.orderId}
          />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Customer */}
          <Section title="Customer">
            <dl className="divide-y divide-gray-100">
              <DefinitionRow label="Name" value={customerName} />
              <DefinitionRow label="Email" value={request.customer?.email} />
              <DefinitionRow label="Phone" value={request.customer?.phone} />
              {request.customer && (
                <div className="pt-2">
                  <Link
                    href={`/customers/${request.customer.id}`}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    View customer profile →
                  </Link>
                </div>
              )}
            </dl>
          </Section>

          {/* Quote summary */}
          <Section title="Quote">
            <dl className="divide-y divide-gray-100">
              <DefinitionRow
                label="Price"
                value={
                  request.quotedPrice !== null
                    ? formatPrice(Number(request.quotedPrice), 'EUR')
                    : 'Not set'
                }
              />
              <DefinitionRow
                label="Lead time"
                value={request.quotedDays !== null ? `${request.quotedDays} days` : 'Not set'}
              />
              {request.orderId && (
                <div className="pt-2">
                  <Link
                    href={`/orders/${request.orderId}`}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    View linked order →
                  </Link>
                </div>
              )}
            </dl>
          </Section>

          {/* Admin notes */}
          {request.adminNotes && (
            <Section title="Admin Notes">
              <p className="whitespace-pre-wrap text-sm text-gray-700">{request.adminNotes}</p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
