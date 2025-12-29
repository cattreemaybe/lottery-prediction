/**
 * @fileoverview algorithm-performance.ts
 * @module backend/src/services/algorithm-performance
 *
 * Input:
//   - ../lib/prisma
 *
 * Output:
//   - recordAlgorithmPerformance
//   - fetchAlgorithmPerformance
 *
 * Pos: backend/src/services/algorithm-performance.ts
 */

import { prisma } from '../lib/prisma';

export interface AlgorithmPerformanceDto {
  algorithm: string;
  totalRuns: number;
  avgConfidence: number;
  successCount: number;
  partialMatches: number;
  lastRunAt: string | null;
}

export async function recordAlgorithmPerformance(payload: { algorithm: string; confidence: number }) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.algorithmPerformance.findUnique({
      where: { algorithm: payload.algorithm },
    });

    if (!existing) {
      await tx.algorithmPerformance.create({
        data: {
          algorithm: payload.algorithm,
          totalRuns: 1,
          avgConfidence: payload.confidence,
          successCount: 0,
          partialMatches: 0,
          lastRunAt: new Date(),
        },
      });
      return;
    }

    const totalRuns = existing.totalRuns + 1;
    const avgConfidence = (existing.avgConfidence * existing.totalRuns + payload.confidence) / totalRuns;

    await tx.algorithmPerformance.update({
      where: { algorithm: payload.algorithm },
      data: {
        totalRuns,
        avgConfidence,
        lastRunAt: new Date(),
      },
    });
  });
}

export async function fetchAlgorithmPerformance(): Promise<AlgorithmPerformanceDto[]> {
  const rows = await prisma.algorithmPerformance.findMany({
    orderBy: [
      { totalRuns: 'desc' },
      { avgConfidence: 'desc' },
    ],
  });

  return rows.map((row) => ({
    algorithm: row.algorithm,
    totalRuns: row.totalRuns,
    avgConfidence: Number(row.avgConfidence.toFixed(2)),
    successCount: row.successCount,
    partialMatches: row.partialMatches,
    lastRunAt: row.lastRunAt ? row.lastRunAt.toISOString() : null,
  }));
}
