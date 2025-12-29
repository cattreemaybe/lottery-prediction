/**
 * @fileoverview lottery-stats.ts
 * @module backend/src/services/lottery-stats
 *
 * Input:
//   - ../lib/prisma
//   - ../lib/redis
 *
 * Output:
//   - getFrequencyStats
 *
 * Pos: backend/src/services/lottery-stats.ts
 */

import type { LotteryDraw } from '../generated/prisma';
import { prisma } from '../lib/prisma';
import { cacheGet, cacheSet, CacheKeys } from '../lib/redis';

export interface FrequencyEntry {
  number: number;
  count: number;
  percentage: number;
}

export interface FrequencyStats {
  datasetSize: number;
  requestedRange: number;
  redFrequency: FrequencyEntry[];
  blueFrequency: FrequencyEntry[];
  hotNumbers: FrequencyEntry[];
  coldNumbers: FrequencyEntry[];
  dateRange: { from: string; to: string } | null;
  generatedAt: string;
}

function buildEmptyEntries(length: number): FrequencyEntry[] {
  return Array.from({ length }, (_, idx) => ({
    number: idx + 1,
    count: 0,
    percentage: 0,
  }));
}

function computeFrequency(draws: LotteryDraw[]): {
  redFrequency: FrequencyEntry[];
  blueFrequency: FrequencyEntry[];
} {
  const redFrequency = buildEmptyEntries(33);
  const blueFrequency = buildEmptyEntries(16);

  draws.forEach((draw) => {
    draw.redBalls.forEach((value) => {
      const index = value - 1;
      if (index >= 0 && index < redFrequency.length) {
        redFrequency[index].count++;
      }
    });

    const blueIndex = draw.blueBall - 1;
    if (blueIndex >= 0 && blueIndex < blueFrequency.length) {
      blueFrequency[blueIndex].count++;
    }
  });

  const totalRedBalls = Math.max(draws.length * 6, 1);
  const totalBlueBalls = Math.max(draws.length, 1);

  redFrequency.forEach((entry) => {
    entry.percentage = Number(((entry.count / totalRedBalls) * 100).toFixed(2));
  });

  blueFrequency.forEach((entry) => {
    entry.percentage = Number(((entry.count / totalBlueBalls) * 100).toFixed(2));
  });

  return { redFrequency, blueFrequency };
}

function selectHotColdEntries(entries: FrequencyEntry[], take = 5) {
  const sortedDesc = [...entries].sort((a, b) => {
    if (b.count === a.count) {
      return a.number - b.number;
    }
    return b.count - a.count;
  });

  const sortedAsc = [...entries].sort((a, b) => {
    if (a.count === b.count) {
      return a.number - b.number;
    }
    return a.count - b.count;
  });

  return {
    hot: sortedDesc.slice(0, take),
    cold: sortedAsc.slice(0, take),
  };
}

export async function getFrequencyStats(range: number): Promise<FrequencyStats> {
  const cacheKey = CacheKeys.statistics('frequency', range);
  const cached = await cacheGet<FrequencyStats>(cacheKey);
  if (cached) {
    return cached;
  }

  const draws = await prisma.lotteryDraw.findMany({
    orderBy: { drawDate: 'desc' },
    take: range,
  });

  const datasetSize = draws.length;

  const { redFrequency, blueFrequency } = computeFrequency(draws);
  const { hot, cold } = selectHotColdEntries(redFrequency);

  const result: FrequencyStats = {
    datasetSize,
    requestedRange: range,
    redFrequency,
    blueFrequency,
    hotNumbers: hot,
    coldNumbers: cold,
    dateRange:
      datasetSize > 0
        ? {
            from: draws[datasetSize - 1].drawDate.toISOString(),
            to: draws[0].drawDate.toISOString(),
          }
        : null,
    generatedAt: new Date().toISOString(),
  };

  await cacheSet(cacheKey, result, 600);

  return result;
}
