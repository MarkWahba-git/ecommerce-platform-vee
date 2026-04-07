import { createHash } from 'crypto';
import type { Redis } from 'ioredis';
import { redis } from './redis';

export class CacheService {
  constructor(
    private readonly redis: Redis,
    private readonly prefix = 'vee:',
  ) {}

  private buildKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(this.buildKey(key));
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds !== undefined && ttlSeconds > 0) {
      await this.redis.set(this.buildKey(key), serialized, 'EX', ttlSeconds);
    } else {
      await this.redis.set(this.buildKey(key), serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(this.buildKey(key));
  }

  /**
   * Delete all keys matching a glob pattern using SCAN + DEL.
   * Pattern should NOT include the prefix — it is added automatically.
   */
  async delPattern(pattern: string): Promise<void> {
    const fullPattern = this.buildKey(pattern);
    let cursor = '0';
    const keysToDelete: string[] = [];

    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100);
      cursor = nextCursor;
      keysToDelete.push(...keys);
    } while (cursor !== '0');

    if (keysToDelete.length > 0) {
      // Pipeline deletions in batches of 100 to avoid blocking
      for (let i = 0; i < keysToDelete.length; i += 100) {
        const batch = keysToDelete.slice(i, i + 100);
        await this.redis.del(...batch);
      }
    }
  }

  /**
   * Cache-aside pattern: try to get, on miss call fetcher, cache result, return value.
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Delete multiple keys at once.
   */
  async invalidate(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const fullKeys = keys.map((k) => this.buildKey(k));
    await this.redis.del(...fullKeys);
  }
}

/**
 * Hash an arbitrary object into a short hex string suitable for use in cache keys.
 */
export function hashObject(obj: unknown): string {
  return createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 16);
}

export const cache = new CacheService(redis);
