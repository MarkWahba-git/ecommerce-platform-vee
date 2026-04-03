import { Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

console.log('Starting Vee workers...');

// Sync Inventory Worker
const syncInventoryWorker = new Worker(
  'sync-inventory',
  async (job) => {
    console.log(`[sync-inventory] Processing job ${job.id}`, job.data);
    // TODO: Implement inventory sync via channel connector
  },
  {
    connection,
    concurrency: 5,
    limiter: { max: 10, duration: 1000 },
  },
);

// Import Orders Worker
const importOrdersWorker = new Worker(
  'import-orders',
  async (job) => {
    console.log(`[import-orders] Processing job ${job.id}`, job.data);
    // TODO: Implement order import via channel connector
  },
  {
    connection,
    concurrency: 2,
  },
);

// Push Fulfillment Worker
const pushFulfillmentWorker = new Worker(
  'push-fulfillment',
  async (job) => {
    console.log(`[push-fulfillment] Processing job ${job.id}`, job.data);
    // TODO: Implement fulfillment push via channel connector
  },
  {
    connection,
    concurrency: 5,
  },
);

// Email Worker
const emailWorker = new Worker(
  'email',
  async (job) => {
    console.log(`[email] Processing job ${job.id}`, job.data);
    // TODO: Implement email sending via Resend
  },
  {
    connection,
    concurrency: 10,
  },
);

// Reconciliation Worker
const reconciliationWorker = new Worker(
  'reconciliation',
  async (job) => {
    console.log(`[reconciliation] Processing job ${job.id}`, job.data);
    // TODO: Implement full reconciliation
  },
  {
    connection,
    concurrency: 1,
  },
);

// Abandoned Cart Worker
const abandonedCartWorker = new Worker(
  'abandoned-cart',
  async (job) => {
    console.log(`[abandoned-cart] Processing job ${job.id}`, job.data);
    // TODO: Implement abandoned cart email sequence
  },
  {
    connection,
    concurrency: 5,
  },
);

// Graceful shutdown
const workers = [
  syncInventoryWorker,
  importOrdersWorker,
  pushFulfillmentWorker,
  emailWorker,
  reconciliationWorker,
  abandonedCartWorker,
];

async function shutdown() {
  console.log('Shutting down workers...');
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('All workers started successfully.');
