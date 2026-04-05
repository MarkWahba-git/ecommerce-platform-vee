import type { Metadata } from 'next';
import { db } from '@vee/db';

export const metadata: Metadata = { title: 'Sync' };

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  { label: string; dotClass: string; rowClass: string; badgeClass: string }
> = {
  QUEUED:    { label: 'Queued',     dotClass: 'bg-yellow-400', rowClass: '',              badgeClass: 'bg-yellow-50  text-yellow-700  ring-yellow-600/20' },
  RUNNING:   { label: 'Running',    dotClass: 'bg-blue-500',   rowClass: 'bg-blue-50/30', badgeClass: 'bg-blue-50    text-blue-700    ring-blue-600/20' },
  COMPLETED: { label: 'Completed',  dotClass: 'bg-green-500',  rowClass: '',              badgeClass: 'bg-green-50   text-green-700   ring-green-600/20' },
  FAILED:    { label: 'Failed',     dotClass: 'bg-red-500',    rowClass: 'bg-red-50/30',  badgeClass: 'bg-red-50     text-red-700     ring-red-600/10' },
  PARTIAL:   { label: 'Partial',    dotClass: 'bg-orange-400', rowClass: '',              badgeClass: 'bg-orange-50  text-orange-700  ring-orange-600/20' },
};

const TYPE_LABELS: Record<string, string> = {
  PRODUCT_PUSH:         'Product Push',
  INVENTORY_SYNC:       'Inventory Sync',
  PRICE_SYNC:           'Price Sync',
  ORDER_IMPORT:         'Order Import',
  FULFILLMENT_PUSH:     'Fulfillment Push',
  FULL_RECONCILIATION:  'Full Reconciliation',
};

const DIRECTION_LABELS: Record<string, string> = {
  INBOUND:  '↓ Import',
  OUTBOUND: '↑ Export',
  BOTH:     '⇅ Both',
};

// ---------------------------------------------------------------------------
// Fetch sync jobs
// ---------------------------------------------------------------------------

async function getSyncJobs() {
  return db.syncJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      marketplace: { select: { name: true, type: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Duration helper
// ---------------------------------------------------------------------------

function formatDuration(startedAt: Date | null, completedAt: Date | null): string {
  if (!startedAt) return '—';
  const end = completedAt ?? new Date();
  const secs = Math.floor((end.getTime() - startedAt.getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return `${mins}m ${rem}s`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SyncPage() {
  const jobs = await getSyncJobs();

  const runningCount = jobs.filter((j) => j.status === 'RUNNING').length;
  const failedCount  = jobs.filter((j) => j.status === 'FAILED' || j.status === 'PARTIAL').length;
  const finishedCount = jobs.filter((j) => ['COMPLETED', 'FAILED', 'PARTIAL'].includes(j.status)).length;
  const successRate  =
    finishedCount > 0
      ? Math.round((jobs.filter((j) => j.status === 'COMPLETED').length / finishedCount) * 100)
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Sync Monitor</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Recent synchronisation jobs across all connected channels.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Trigger Sync
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Jobs" value={String(jobs.length)} />
        <StatCard
          label="Running"
          value={String(runningCount)}
          valueClass={runningCount > 0 ? 'text-blue-600' : undefined}
        />
        <StatCard
          label="Failed"
          value={String(failedCount)}
          valueClass={failedCount > 0 ? 'text-red-600' : undefined}
        />
        <StatCard
          label="Success Rate"
          value={successRate !== null ? `${successRate}%` : '—'}
          valueClass={
            successRate === null ? undefined : successRate >= 90 ? 'text-green-600' : 'text-orange-600'
          }
        />
      </div>

      {/* Jobs table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:pl-6">
                Channel
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Type
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Direction
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                Progress
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Duration
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Started
              </th>
              <th className="relative py-3 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {jobs.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-gray-500">
                  No sync jobs yet.
                </td>
              </tr>
            )}
            {jobs.map((job) => {
              const config = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.PENDING;
              const total = job.itemsTotal ?? (job.itemsProcessed + job.itemsFailed) || null;
              const pct = total && total > 0
                ? Math.round(((job.itemsProcessed + job.itemsFailed) / total) * 100)
                : null;

              return (
                <tr key={job.id} className={`hover:bg-gray-50 ${config.rowClass}`}>
                  {/* Channel */}
                  <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-6">
                    <p className="text-sm font-medium text-gray-900">{job.marketplace.name}</p>
                    <p className="text-xs text-gray-400">{job.marketplace.type}</p>
                  </td>

                  {/* Type */}
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">
                    {TYPE_LABELS[job.type] ?? job.type}
                  </td>

                  {/* Direction */}
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
                    {DIRECTION_LABELS[job.direction] ?? job.direction}
                  </td>

                  {/* Status badge */}
                  <td className="whitespace-nowrap px-3 py-3 text-sm">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${config.badgeClass}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
                      {config.label}
                      {job.retryCount > 0 && (
                        <span className="text-gray-400">·{job.retryCount} retry</span>
                      )}
                    </span>
                  </td>

                  {/* Progress */}
                  <td className="px-3 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-xs text-gray-700">
                        {job.itemsProcessed} ok
                        {job.itemsFailed > 0 && (
                          <span className="ml-1 text-red-600">/ {job.itemsFailed} err</span>
                        )}
                        {total && <span className="text-gray-400"> / {total}</span>}
                      </p>
                      {pct !== null && (
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full transition-all ${
                              job.itemsFailed > 0 ? 'bg-orange-400' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Duration */}
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-gray-500">
                    {formatDuration(job.startedAt, job.completedAt)}
                  </td>

                  {/* Started at */}
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
                    {job.startedAt
                      ? new Date(job.startedAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>

                  {/* Actions */}
                  <td className="whitespace-nowrap py-3 pl-3 pr-4 text-right text-sm sm:pr-6">
                    {(job.status === 'FAILED' || job.status === 'PARTIAL') && (
                      <form method="POST" action={`/api/sync/${job.id}/retry`} className="inline">
                        <button
                          type="submit"
                          className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          Retry
                        </button>
                      </form>
                    )}
                    {job.status === 'RUNNING' && (
                      <form method="POST" action={`/api/sync/${job.id}/cancel`} className="inline">
                        <button
                          type="submit"
                          className="rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard helper component
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${valueClass ?? 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
