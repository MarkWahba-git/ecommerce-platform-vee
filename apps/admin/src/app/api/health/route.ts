import { NextResponse } from 'next/server';
import { db } from '@vee/db';
import { redis } from '@vee/core';
import { MeiliSearch } from 'meilisearch';

// Health checks must never be cached
export const dynamic = 'force-dynamic';

interface CheckResult {
  status: 'up' | 'down';
  latencyMs?: number;
  error?: string;
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { status: 'up', latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: 'down',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

async function checkRedis(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const pong = await redis.ping();
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

async function checkMeilisearch(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const meili = new MeiliSearch({
      host: process.env.MEILISEARCH_HOST ?? 'http://localhost:7700',
      apiKey: process.env.MEILISEARCH_API_KEY ?? 'vee_meili_dev_key',
    });
    const health = await meili.health();
    if (health.status !== 'available') {
      throw new Error(`Meilisearch status: ${health.status}`);
    }
    return { status: 'up', latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: 'down',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function GET(): Promise<NextResponse> {
  const [database, redisCheck, meilisearch] = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkMeilisearch(),
  ]);

  const checks = {
    database:
      database.status === 'fulfilled'
        ? database.value
        : { status: 'down' as const, error: 'Promise rejected' },
    redis:
      redisCheck.status === 'fulfilled'
        ? redisCheck.value
        : { status: 'down' as const, error: 'Promise rejected' },
    meilisearch:
      meilisearch.status === 'fulfilled'
        ? meilisearch.value
        : { status: 'down' as const, error: 'Promise rejected' },
  };

  const criticalDown = checks.database.status === 'down' || checks.redis.status === 'down';
  const overallStatus = criticalDown ? 'degraded' : 'ok';

  const body = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '0.0.0',
    checks,
  };

  return NextResponse.json(body, {
    status: criticalDown ? 503 : 200,
  });
}
