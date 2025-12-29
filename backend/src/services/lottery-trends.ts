/**
 * @fileoverview lottery-trends.ts
 * @module backend/src/services/lottery-trends
 *
 * Input:
//   - ../lib/prisma
//   - ../lib/redis
 *
 * Output:
//   - fetchTrendData
 *
 * Pos: backend/src/services/lottery-trends.ts
 */

import { prisma } from '../lib/prisma';
import { cacheGet, cacheSet, CacheKeys } from '../lib/redis';

export interface TrendPoint {
  period: string;
  drawDate: string;
  redBalls: number[];
  blueBall: number;
}

export async function fetchTrendData(limit: number): Promise<TrendPoint[]> {
  const cacheKey = CacheKeys.statistics('trend', limit);
  const cached = await cacheGet<TrendPoint[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const records = await prisma.lotteryDraw.findMany({
    orderBy: { drawDate: 'desc' },
    take: limit,
  });

  const normalized = [...records]
    .sort((a, b) => a.drawDate.getTime() - b.drawDate.getTime())
    .map((draw) => ({
      period: draw.period,
      drawDate: draw.drawDate.toISOString(),
      redBalls: draw.redBalls,
      blueBall: draw.blueBall,
    }));

  await cacheSet(cacheKey, normalized, 600);
  return normalized;
}
