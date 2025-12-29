/**
 * @fileoverview redis.ts
 * @module backend/src/lib/redis
 *
 * Input:
//   - (no external imports)
 *
 * Output:
//   - getRedisClient
//   - disconnectRedis
//   - cacheGet
//   - cacheSet
//   - cacheDel
//   - cacheDelPattern
//   - CacheKeys
 *
 * Pos: backend/src/lib/redis.ts
 */

import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: false,
    });

    redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
    });

    redis.on('close', () => {
      console.log('Redis connection closed');
    });
  }

  return redis;
}

export async function disconnectRedis() {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log('Redis disconnected');
  }
}

// Cache utility functions
const DEFAULT_TTL = parseInt(process.env.REDIS_TTL_SECONDS || '3600', 10);

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttl: number = DEFAULT_TTL): Promise<void> {
  try {
    const client = getRedisClient();
    await client.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error);
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    console.error(`Cache delete pattern error for ${pattern}:`, error);
  }
}

// Cache key generators
export const CacheKeys = {
  lotteryDraws: (limit?: number) => `lottery:draws:${limit || 'all'}`,
  lotteryDrawByPeriod: (period: string) => `lottery:draw:${period}`,
  predictionHistory: (limit?: number) => `prediction:history:${limit || 'all'}`,
  statistics: (type: string, period?: number) => `stats:${type}:${period || 'all'}`,
  algorithms: () => 'algorithms:list',
} as const;
