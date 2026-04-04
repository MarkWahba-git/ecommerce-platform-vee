import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getSession } from '@/lib/auth-helpers';
import { db } from '@vee/db';
import { ApproveProofButton } from './ApproveProofButton';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_STEPS = [
  'SUBMITTED',
  'REVIEWING',
  'QUOTED',
  'ACCEPTED',
  'IN_PRODUCTION',
  'PROOF_SENT',
  'APPROVED',
  'COMPLETED',
] as const;

const statusLabel: Record<string, string> = {
  SUBMITTED: 'Eingereicht',
  REVIEWING: 'In Prüfung',
  QUOTED: 'Angebot erhalten',
  ACCEPTED: 'Angenommen',
  IN_PRODUCTION: 'In Produktion',
  PROOF_SENT: 'Entwurf verfügbar',
  APPROVED: 'Freigegeben',
  COMPLETED: 'Abgeschlossen',
  DECLINED: 'Abgelehnt',
  CANCELLED: 'Storniert',
};

const statusColor: Record<string, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-800',
  REVIEWING: 'bg-yellow-100 text-yellow-800',
  QUOTED: 'bg-purple-100 text-purple-800',
  ACCEPTED: 'bg-indigo-100 text-indigo-800',
  IN_PRODUCTION: 'bg-orange-100 text-orange-800',
  PROOF_SENT: 'bg-cyan-100 text-cyan-800',
  APPROVED: 'bg-teal-100 text-teal-800',
  COMPLETED: 'bg-green-100 text-green-800',
  DECLINED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

const formatEUR = (val: number | string) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(val));

// ---------------------------------------------------------------------------
// Page (Server Component)
// ---------------------------------------------------------------------------

export const metadata: Metadata = { title: 'Individuelle Anfrage' };

export default async function CustomOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;

  const request = await db.customOrderRequest.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  if (!request || request.customerId !== session.customerId) notFound();

  const isDeclinedOrCancelled = request.status === 'DECLINED' || request.status === 'CANCELLED';
  const currentStepIndex = isDeclinedOrCancelled
    ? -1
    : STATUS_STEPS.indexOf(request.status as (typeof STATUS_STEPS)[number]);

  const attachments = Array.isArray(request.attachments) ? (request.attachments as string[]) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/account/custom-orders" className="text-sm text-accent hover:underline">
          ← Zurück zur Übersicht
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">Individuelle Anfrage</h2>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[request.status] ?? 'bg-gray-100 text-gray-700'}`}
          >
            {statusLabel[request.status] ?? request.status}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Eingereicht am {formatDate(request.createdAt)}
          {request.updatedAt.getTime() !== request.createdAt.getTime() &&
            ` · Aktualisiert am ${formatDate(request.updatedAt)}`}
        </p>
      </div>

      {/* Status timeline */}
      {!isDeclinedOrCancelled && (
        <div className="rounded-xl border border-border bg-background p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Status-Verlauf</h3>
          <ol className="flex flex-wrap gap-2">
            {STATUS_STEPS.map((step, index) => {
              const done = index < currentStepIndex;
              const active = index === currentStepIndex;
              return (
                <li key={step} className="flex items-center gap-1.5">
                  {index > 0 && (
                    <span
                      className={`hidden h-px w-4 sm:block ${done || active ? 'bg-accent' : 'bg-border'}`}
                    />
                  )}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      active
                        ? 'bg-accent text-white'
                        : done
                          ? 'bg-accent/20 text-accent'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {statusLabel[step]}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {isDeclinedOrCancelled && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-800">
            Diese Anfrage wurde {request.status === 'DECLINED' ? 'abgelehnt' : 'storniert'}.
          </p>
        </div>
      )}

      {/* Request description */}
      <div className="rounded-xl border border-border bg-background p-5">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Deine Anfrage</h3>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{request.description}</p>

        {attachments.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Anhänge</p>
            <ul className="space-y-1">
              {attachments.map((key) => (
                <li key={key}>
                  <a
                    href={`/api/downloads/file?key=${encodeURIComponent(key)}`}
                    className="text-sm text-accent hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {key.split('/').pop()}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Quote info */}
      {(request.quotedPrice !== null || request.quotedDays !== null) && (
        <div className="rounded-xl border border-border bg-background p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Angebot</h3>
          <dl className="space-y-2">
            {request.quotedPrice !== null && (
              <div className="flex justify-between text-sm">
                <dt className="text-muted-foreground">Preis</dt>
                <dd className="font-semibold text-foreground">{formatEUR(request.quotedPrice)}</dd>
              </div>
            )}
            {request.quotedDays !== null && (
              <div className="flex justify-between text-sm">
                <dt className="text-muted-foreground">Lieferzeit</dt>
                <dd className="font-semibold text-foreground">ca. {request.quotedDays} Tage</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Admin notes */}
      {request.adminNotes && (
        <div className="rounded-xl border border-border bg-background p-5">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Notiz vom Team</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{request.adminNotes}</p>
        </div>
      )}

      {/* Proof */}
      {request.proofFileKey && (
        <div className="rounded-xl border border-border bg-background p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Entwurf / Proof</h3>
          {/\.(jpe?g|png|gif|webp|svg)$/i.test(request.proofFileKey) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/proof-preview?key=${encodeURIComponent(request.proofFileKey)}`}
              alt="Proof-Entwurf"
              className="mb-3 max-h-96 rounded-lg border border-border object-contain"
            />
          ) : (
            <p className="mb-3 text-sm text-muted-foreground">
              Eine Proof-Datei wurde hochgeladen. Bitte wende dich an uns, um sie herunterzuladen.
            </p>
          )}

          {request.status === 'PROOF_SENT' && <ApproveProofButton id={request.id} />}
        </div>
      )}

      {/* Linked order */}
      {request.orderId && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm text-green-800">
            Diese Anfrage wurde in eine Bestellung umgewandelt.{' '}
            <Link
              href={`/account/orders/${request.orderId}`}
              className="font-semibold underline"
            >
              Bestellung anzeigen →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
