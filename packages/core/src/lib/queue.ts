import { Queue } from 'bullmq';
import { redis } from './redis';

export const syncInventoryQueue = new Queue('sync-inventory', { connection: redis });
export const importOrdersQueue = new Queue('import-orders', { connection: redis });
export const pushFulfillmentQueue = new Queue('push-fulfillment', { connection: redis });
export const reconciliationQueue = new Queue('reconciliation', { connection: redis });
export const emailQueue = new Queue('email', { connection: redis });
export const abandonedCartQueue = new Queue('abandoned-cart', { connection: redis });
