import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getSession } from '@/lib/auth-helpers';
import { db } from '@vee/db';

export const metadata: Metadata = { title: 'Individuelle Bestellungen' };

const PAGE_SIZE = 10;

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    date,
  );

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

export default async function CustomOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10));
  const skip = (page - 1) * PAGE_SIZE;

  const [requests, total] = await Promise.all([
    db.customOrderRequest.findMany({
      where: { customerId: session.customerId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    db.customOrderRequest.count({ where: { customerId: session.customerId } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Individuelle Bestellungen</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} {total === 1 ? 'Anfrage' : 'Anfragen'} insgesamt
          </p>
        </div>
        <Link
          href="/custom-order"
          className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent/90"
        >
          Neue Anfrage
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-border bg-background p-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-4 text-muted-foreground"
            aria-hidden="true"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" x2="8" y1="13" y2="13" />
            <line x1="16" x2="8" y1="17" y2="17" />
            <line x1="10" x2="8" y1="9" y2="9" />
          </svg>
          <p className="text-muted-foreground">Du hast noch keine individuellen Anfragen gestellt.</p>
          <Link
            href="/custom-order"
            className="mt-4 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Jetzt anfragen
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {requests.map((req) => (
              <Link
                key={req.id}
                href={`/account/custom-orders/${req.id}`}
                className="flex flex-col gap-3 rounded-xl border border-border bg-background p-5 transition hover:border-accent sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[req.status] ?? 'bg-gray-100 text-gray-700'}`}
                    >
                      {statusLabel[req.status] ?? req.status}
                    </span>
                    {req.status === 'PROOF_SENT' && (
                      <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                        Aktion erforderlich
                      </span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-foreground">{req.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Eingereicht am {formatDate(req.createdAt)}
                  </p>
                </div>
                <div className="shrink-0 text-sm text-accent">Details →</div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Seite {page} von {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/account/custom-orders?page=${page - 1}`}
                    className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                  >
                    ← Zurück
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/account/custom-orders?page=${page + 1}`}
                    className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                  >
                    Weiter →
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
