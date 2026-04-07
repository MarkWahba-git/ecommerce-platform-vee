import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@vee/db';
import { webhookService } from '@vee/core';
import type {
  EtsyWebhook,
  AmazonNotificationSubscription,
  AmazonDestination,
} from '@vee/core';
import { ETSY_WEBHOOK_EVENTS, AMAZON_NOTIFICATION_TYPES } from '@vee/shared';
/** Minimal shape of the AuditLog Prisma model used on this page. */
interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  userId: string | null;
}

export const metadata: Metadata = { title: 'Webhook Management' };

// ─── Data fetchers ─────────────────────────────────────────────────────────

async function getMarketplace(id: string) {
  return db.marketplace.findUnique({
    where: { id },
    select: { id: true, name: true, type: true, isActive: true, settings: true },
  });
}

async function getRecentWebhookEvents(marketplaceType: string): Promise<AuditLog[]> {
  const actionPrefix = marketplaceType === 'ETSY' ? 'etsy_webhook' : 'amazon_webhook';
  return db.auditLog.findMany({
    where: { action: { startsWith: actionPrefix }, entityType: 'webhook' },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

interface EtsyWebhookData {
  type: 'ETSY';
  webhooks: EtsyWebhook[];
}

interface AmazonWebhookData {
  type: 'AMAZON';
  subscriptions: AmazonNotificationSubscription[];
  destinations: AmazonDestination[];
}

async function getWebhookData(
  marketplaceId: string,
  type: string,
): Promise<EtsyWebhookData | AmazonWebhookData | null> {
  try {
    if (type === 'ETSY') {
      const webhooks = await webhookService.listEtsyWebhooks(marketplaceId);
      return { type: 'ETSY', webhooks };
    }
    if (type === 'AMAZON') {
      const [subscriptions, destinations] = await Promise.all([
        webhookService.listAmazonSubscriptions(marketplaceId),
        webhookService.listAmazonDestinations(marketplaceId),
      ]);
      return { type: 'AMAZON', subscriptions, destinations };
    }
    return null;
  } catch {
    // Return empty data rather than crashing the page
    if (type === 'ETSY') return { type: 'ETSY', webhooks: [] };
    return { type: 'AMAZON', subscriptions: [], destinations: [] };
  }
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StatusBadge({ active, label }: { active: boolean; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-gray-400'}`} />
      {label ?? (active ? 'Active' : 'Inactive')}
    </span>
  );
}

function EtsyWebhooksSection({ data }: { data: EtsyWebhookData }) {
  const eventLabels = ETSY_WEBHOOK_EVENTS as Record<string, { description: string }>;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Registered Webhooks</h3>
        <span className="text-sm text-gray-500">{data.webhooks.length} registered</span>
      </div>

      {data.webhooks.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-10 text-center">
          <p className="text-sm text-gray-500">No webhooks registered yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
          {data.webhooks.map((wh) => (
            <div key={wh.webhook_id} className="flex items-center justify-between bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{wh.event}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {eventLabels[wh.event]?.description ?? 'Etsy webhook event'}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">ID: {wh.webhook_id}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge active={wh.active} />
                <form action={`/api/channels/${wh.shop_id}/webhooks`} method="POST">
                  <input type="hidden" name="_method" value="DELETE" />
                  <input type="hidden" name="webhookId" value={String(wh.webhook_id)} />
                  <button
                    type="submit"
                    className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AmazonSubscriptionsSection({ data }: { data: AmazonWebhookData }) {
  const notifLabels = AMAZON_NOTIFICATION_TYPES as Record<string, { description: string }>;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Active Subscriptions</h3>
        <span className="text-sm text-gray-500">{data.subscriptions.length} active</span>
      </div>

      {data.subscriptions.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-10 text-center">
          <p className="text-sm text-gray-500">No notification subscriptions registered yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
          {data.subscriptions.map((sub) => (
            <div key={sub.subscriptionId} className="flex items-center justify-between bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{sub.notificationType}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {notifLabels[sub.notificationType]?.description ?? 'Amazon SP-API notification'}
                </p>
                <p className="mt-0.5 font-mono text-xs text-gray-400 truncate max-w-sm">
                  {sub.subscriptionId}
                </p>
              </div>
              <StatusBadge active label="Active" />
            </div>
          ))}
        </div>
      )}

      {data.destinations.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Available Destinations</h4>
          <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
            {data.destinations.map((dest) => (
              <div key={dest.destinationId} className="flex items-center justify-between bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{dest.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-gray-400 truncate max-w-sm">
                    {dest.destinationId}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function RegisterWebhookForm({ marketplaceId, type }: { marketplaceId: string; type: string }) {
  if (type === 'ETSY') {
    const eventOptions = Object.entries(ETSY_WEBHOOK_EVENTS);
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Register New Webhook</h3>
        <form
          action={`/api/channels/${marketplaceId}/webhooks`}
          method="POST"
          className="space-y-4"
        >
          <div>
            <label htmlFor="callbackUrl" className="block text-sm font-medium text-gray-700">
              Callback URL
            </label>
            <input
              id="callbackUrl"
              name="callbackUrl"
              type="url"
              required
              placeholder="https://yourdomain.com/api/webhooks/etsy"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="event" className="block text-sm font-medium text-gray-700">
              Event Type
            </label>
            <select
              id="event"
              name="event"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {eventOptions.map(([key, meta]) => (
                <option key={key} value={key}>
                  {key} — {meta.description}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Register Webhook
          </button>
        </form>
      </section>
    );
  }

  if (type === 'AMAZON') {
    const notifOptions = Object.entries(AMAZON_NOTIFICATION_TYPES);
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Register Notification Subscription</h3>
        <form
          action={`/api/channels/${marketplaceId}/webhooks`}
          method="POST"
          className="space-y-4"
        >
          <div>
            <label htmlFor="notificationType" className="block text-sm font-medium text-gray-700">
              Notification Type
            </label>
            <select
              id="notificationType"
              name="notificationType"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {notifOptions.map(([key, meta]) => (
                <option key={key} value={key}>
                  {key} — {meta.description}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="destinationArn" className="block text-sm font-medium text-gray-700">
              Destination ARN
            </label>
            <input
              id="destinationArn"
              name="destinationArn"
              type="text"
              required
              placeholder="arn:aws:sqs:eu-west-1:123456789:vee-amazon-notifications"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Create Subscription
          </button>
        </form>
      </section>
    );
  }

  return null;
}

function WebhookEventsLog({ events }: { events: AuditLog[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 py-10 text-center">
        <p className="text-sm text-gray-500">No webhook events recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              Event
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              Entity ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              Time
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              IP
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {events.map((event) => (
            <tr key={event.id} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 font-medium text-gray-900">{event.action}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                {event.entityId ?? '—'}
              </td>
              <td className="px-4 py-2.5 text-gray-500">
                {new Date(event.createdAt).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </td>
              <td className="px-4 py-2.5 text-xs text-gray-400">{event.ipAddress ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function WebhooksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const marketplace = await getMarketplace(id);
  if (!marketplace) notFound();

  const [webhookData, recentEvents] = await Promise.all([
    getWebhookData(marketplace.id, marketplace.type),
    getRecentWebhookEvents(marketplace.type),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <a href={`/channels`} className="text-sm text-gray-500 hover:text-gray-700">
              Channels
            </a>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-900 font-medium">{marketplace.name}</span>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-900">Webhooks</span>
          </div>
          <h2 className="mt-1 text-xl font-semibold text-gray-900">
            Webhook Management — {marketplace.name}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {marketplace.type === 'ETSY'
              ? 'Manage Etsy webhook subscriptions to receive real-time order and listing events.'
              : 'Manage Amazon SP-API notification subscriptions via EventBridge/SQS.'}
          </p>
        </div>

        {!marketplace.isActive && (
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
            Marketplace Inactive
          </span>
        )}
      </div>

      {/* Current webhooks */}
      {webhookData?.type === 'ETSY' && (
        <EtsyWebhooksSection data={webhookData} />
      )}
      {webhookData?.type === 'AMAZON' && (
        <AmazonSubscriptionsSection data={webhookData} />
      )}

      {/* Register new webhook form */}
      {marketplace.isActive && (
        <RegisterWebhookForm marketplaceId={marketplace.id} type={marketplace.type} />
      )}

      {/* Recent events log */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Recent Webhook Events</h3>
        <p className="text-sm text-gray-500">
          Last 20 incoming webhook events recorded in the audit log.
        </p>
        <WebhookEventsLog events={recentEvents} />
      </section>
    </div>
  );
}
