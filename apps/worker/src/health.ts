/**
 * Lightweight HTTP health check server for the worker process.
 *
 * Listens on HEALTH_PORT env var, or (PORT + 1) if PORT is set, or 3002 by default.
 * GET /health  — returns worker status + Redis connectivity
 */
import * as http from 'http';
import type { Worker } from 'bullmq';
import type Redis from 'ioredis';

interface WorkerStatus {
  name: string;
  isRunning: boolean;
}

let _workers: Worker[] = [];
let _redis: Redis | null = null;

/** Register the worker list and Redis connection to be checked. */
export function registerHealthTargets(workers: Worker[], redis: Redis): void {
  _workers = workers;
  _redis = redis;
}

async function checkRedis(): Promise<{ status: 'up' | 'down'; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    if (!_redis) throw new Error('Redis connection not registered');
    const pong = await _redis.ping();
    if (pong !== 'PONG') throw new Error(`Unexpected ping response: ${pong}`);
    return { status: 'up', latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: 'down',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

function getWorkerStatuses(): WorkerStatus[] {
  return _workers.map((w) => ({
    name: w.name,
    // BullMQ Worker exposes `isRunning()` (sync) to indicate it's consuming
    isRunning: w.isRunning(),
  }));
}

export function startHealthServer(): http.Server {
  const healthPort =
    process.env.HEALTH_PORT
      ? parseInt(process.env.HEALTH_PORT, 10)
      : process.env.PORT
        ? parseInt(process.env.PORT, 10) + 1
        : 3002;

  const server = http.createServer(async (req, res) => {
    if (req.method !== 'GET' || req.url !== '/health') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    const [redisResult] = await Promise.allSettled([checkRedis()]);
    const redis =
      redisResult.status === 'fulfilled'
        ? redisResult.value
        : { status: 'down' as const, latencyMs: 0, error: 'Promise rejected' };

    const workerStatuses = getWorkerStatuses();
    const allWorkersRunning = workerStatuses.every((w) => w.isRunning);
    const criticalDown = redis.status === 'down';
    const overallStatus = criticalDown ? 'degraded' : allWorkersRunning ? 'ok' : 'degraded';

    const body = JSON.stringify({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.0.0',
      checks: {
        redis,
        workers: {
          status: allWorkersRunning ? 'up' : 'degraded',
          details: workerStatuses,
        },
      },
    });

    const statusCode = criticalDown ? 503 : 200;
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(body);
  });

  server.listen(healthPort, () => {
    console.log(`[health] Health server listening on port ${healthPort}`);
  });

  return server;
}
