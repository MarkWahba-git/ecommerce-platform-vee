import type { Metadata } from 'next';
import { db } from '@vee/db';

export const metadata: Metadata = { title: 'Channels' };

// ---------------------------------------------------------------------------
// Channel type display helpers
// ---------------------------------------------------------------------------

const CHANNEL_META: Record<string, { label: string; description: string; color: string }> = {
  ETSY:   { label: 'Etsy',         description: 'Handmade marketplace',        color: 'bg-orange-100 text-orange-700' },
  AMAZON: { label: 'Amazon',       description: 'Global e-commerce platform',   color: 'bg-yellow-100 text-yellow-700' },
  EBAY:   { label: 'eBay',         description: 'Online auction & retail',       color: 'bg-blue-100 text-blue-700' },
  SHOPIFY:{ label: 'Shopify',      description: 'Shopify storefront sync',       color: 'bg-green-100 text-green-700' },
};

function ChannelIcon({ type }: { type: string }) {
  const meta = CHANNEL_META[type];
  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-xl text-base font-bold ${
        meta?.color ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {(meta?.label ?? type).slice(0, 2).toUpperCase()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fetch channels
// ---------------------------------------------------------------------------

async function getChannels() {
  return db.marketplace.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { listings: true } },
      syncJobs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { status: true, createdAt: true, completedAt: true },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ChannelsPage() {
  const channels = await getChannels();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Sales Channels</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Manage your marketplace connections and sync settings.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          + Add Channel
        </button>
      </div>

      {/* Channel cards */}
      {channels.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-500">No channels connected yet.</p>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Connect your first channel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => {
            const meta = CHANNEL_META[channel.type];
            const lastSync = channel.syncJobs[0];
            const isHealthy = channel.isActive && (!lastSync || lastSync.status !== 'FAILED');

            return (
              <div
                key={channel.id}
                className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Card header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <ChannelIcon type={channel.type} />
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{channel.name}</h3>
                      <p className="text-xs text-gray-400">{meta?.description ?? channel.type}</p>
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        !channel.isActive
                          ? 'bg-gray-300'
                          : isHealthy
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      }`}
                    />
                    <span className="text-xs text-gray-500">
                      {!channel.isActive ? 'Inactive' : isHealthy ? 'Active' : 'Error'}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-gray-50 p-3">
                    <dt className="text-xs text-gray-500">Listings</dt>
                    <dd className="mt-0.5 text-lg font-semibold text-gray-900">
                      {channel._count.listings}
                    </dd>
                  </div>
                  <div className="rounded-md bg-gray-50 p-3">
                    <dt className="text-xs text-gray-500">Last sync</dt>
                    <dd className="mt-0.5 text-sm font-medium text-gray-700">
                      {channel.lastSyncAt
                        ? new Date(channel.lastSyncAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                          })
                        : 'Never'}
                    </dd>
                  </div>
                </dl>

                {/* Last sync status */}
                {lastSync && (
                  <div
                    className={`mt-3 rounded-md px-3 py-1.5 text-xs ${
                      lastSync.status === 'COMPLETED'
                        ? 'bg-green-50 text-green-700'
                        : lastSync.status === 'FAILED'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    Last job: {lastSync.status.toLowerCase()}
                    {lastSync.completedAt && (
                      <span className="ml-1 text-gray-400">
                        · {new Date(lastSync.completedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    className="flex-1 rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                  >
                    Sync Now
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-md bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Settings
                  </button>
                  {channel.isActive ? (
                    <button
                      type="button"
                      className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded-md bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                    >
                      Enable
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info banner */}
      <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
        <h4 className="text-sm font-semibold text-indigo-800">Available Integrations</h4>
        <p className="mt-1 text-sm text-indigo-700">
          Vee supports Etsy, Amazon, and eBay. Each channel can be configured independently with
          custom pricing rules, inventory buffers, and sync schedules.
        </p>
      </div>
    </div>
  );
}
