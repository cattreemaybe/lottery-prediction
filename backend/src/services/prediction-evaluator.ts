/**
 * @fileoverview prediction-evaluator.ts
 * @module backend/src/services/prediction-evaluator
 *
 * Input:
//   - ../lib/prisma
 *
 * Output:
//   - evaluatePredictionPerformance
 *
 * Pos: backend/src/services/prediction-evaluator.ts
 */

import { prisma } from '../lib/prisma';

export type MatchLevel =
  | 'pending'
  | 'jackpot'
  | 'excellent'
  | 'great'
  | 'good'
  | 'low'
  | 'blue'
  | 'miss';

export interface PredictionEvaluationDetail {
  predictionId: string;
  algorithm: string;
  datasetSize: number;
  generatedAt: string;
  targetPeriod: string | null;
  actualDrawDate: string | null;
  redHits: number;
  blueHit: boolean;
  matchLevel: MatchLevel;
  status: 'pending' | 'evaluated';
  notes: string;
}

export interface PredictionAlgorithmStats {
  algorithm: string;
  totalEvaluated: number;
  pendingCount: number;
  jackpotHits: number;
  blueHits: number;
  avgRedHits: number;
  highMatches: number;
}

export interface PredictionEvaluationSummary {
  totalPredictions: number;
  evaluatedCount: number;
  pendingCount: number;
  jackpotHits: number;
  blueHits: number;
  avgRedHits: number;
  bestRedHits: number;
}

export interface PredictionEvaluationResult {
  summary: PredictionEvaluationSummary;
  algorithms: PredictionAlgorithmStats[];
  evaluations: PredictionEvaluationDetail[];
}

export async function evaluatePredictionPerformance(limit = 30): Promise<PredictionEvaluationResult> {
  const predictions = await prisma.prediction.findMany({
    orderBy: { generatedAt: 'desc' },
    take: limit,
  });

  if (predictions.length === 0) {
    return {
      summary: {
        totalPredictions: 0,
        evaluatedCount: 0,
        pendingCount: 0,
        jackpotHits: 0,
        blueHits: 0,
        avgRedHits: 0,
        bestRedHits: 0,
      },
      algorithms: [],
      evaluations: [],
    };
  }

  const evaluations: PredictionEvaluationDetail[] = [];
  const algorithmStats = new Map<string, PredictionAlgorithmStats>();

  let evaluatedCount = 0;
  let pendingCount = 0;
  let jackpotHits = 0;
  let blueHits = 0;
  let redHitSum = 0;
  let bestRedHits = 0;

  for (const prediction of predictions) {
    const targetDraw =
      prediction.resultPeriod != null
        ? await prisma.lotteryDraw.findUnique({ where: { period: prediction.resultPeriod } })
        : await prisma.lotteryDraw.findFirst({
            where: { drawDate: { gt: prediction.generatedAt } },
            orderBy: { drawDate: 'asc' },
          });

    let redHits = 0;
    let blueHit = false;
    let matchLevel: MatchLevel = 'pending';
    let status: PredictionEvaluationDetail['status'] = 'pending';
    let notes = '等待开奖结果';

    if (targetDraw) {
      const predictedSet = new Set(prediction.redBalls);
      redHits = targetDraw.redBalls.filter((num) => predictedSet.has(num)).length;
      blueHit = prediction.blueBall === targetDraw.blueBall;
      matchLevel = determineMatchLevel(redHits, blueHit);
      status = 'evaluated';
      notes = buildMatchNote(redHits, blueHit, targetDraw.period);

      evaluatedCount += 1;
      redHitSum += redHits;
      bestRedHits = Math.max(bestRedHits, redHits);
      if (matchLevel === 'jackpot') {
        jackpotHits += 1;
      }
      if (blueHit) {
        blueHits += 1;
      }

      const updateData: { resultPeriod?: string; isCorrect?: boolean } = {};
      if (!prediction.resultPeriod || prediction.resultPeriod !== targetDraw.period) {
        updateData.resultPeriod = targetDraw.period;
      }
      const isJackpot = matchLevel === 'jackpot';
      if (prediction.isCorrect !== isJackpot) {
        updateData.isCorrect = isJackpot;
      }
      if (Object.keys(updateData).length > 0) {
        await prisma.prediction.update({
          where: { id: prediction.id },
          data: updateData,
        });
      }
    } else {
      pendingCount += 1;
    }

    const detail: PredictionEvaluationDetail = {
      predictionId: prediction.id,
      algorithm: prediction.algorithm,
      datasetSize: prediction.datasetSize,
      generatedAt: prediction.generatedAt.toISOString(),
      targetPeriod: targetDraw?.period ?? null,
      actualDrawDate: targetDraw ? targetDraw.drawDate.toISOString() : null,
      redHits,
      blueHit,
      matchLevel,
      status,
      notes,
    };

    evaluations.push(detail);

    const stats = algorithmStats.get(prediction.algorithm) ?? {
      algorithm: prediction.algorithm,
      totalEvaluated: 0,
      pendingCount: 0,
      jackpotHits: 0,
      blueHits: 0,
      avgRedHits: 0,
      highMatches: 0,
    };

    if (status === 'evaluated') {
      stats.totalEvaluated += 1;
      stats.avgRedHits += redHits;
      if (matchLevel === 'jackpot') {
        stats.jackpotHits += 1;
      }
      if (blueHit) {
        stats.blueHits += 1;
      }
      if (redHits >= 4 || (redHits === 3 && blueHit)) {
        stats.highMatches += 1;
      }
    } else {
      stats.pendingCount += 1;
    }

    algorithmStats.set(prediction.algorithm, stats);
  }

  const algorithms = Array.from(algorithmStats.values()).map((entry) => ({
    ...entry,
    avgRedHits: entry.totalEvaluated > 0 ? Number((entry.avgRedHits / entry.totalEvaluated).toFixed(2)) : 0,
  }));

  const summary: PredictionEvaluationSummary = {
    totalPredictions: predictions.length,
    evaluatedCount,
    pendingCount,
    jackpotHits,
    blueHits,
    avgRedHits: evaluatedCount > 0 ? Number((redHitSum / evaluatedCount).toFixed(2)) : 0,
    bestRedHits,
  };

  return {
    summary,
    algorithms,
    evaluations,
  };
}

function determineMatchLevel(redHits: number, blueHit: boolean): MatchLevel {
  if (redHits === 6 && blueHit) {
    return 'jackpot';
  }
  if (redHits === 6 || (redHits === 5 && blueHit)) {
    return 'excellent';
  }
  if (redHits === 5 || (redHits === 4 && blueHit)) {
    return 'great';
  }
  if (redHits === 4 || (redHits === 3 && blueHit)) {
    return 'good';
  }
  if (redHits === 3) {
    return 'low';
  }
  if (blueHit) {
    return 'blue';
  }
  return 'miss';
}

function buildMatchNote(redHits: number, blueHit: boolean, period: string): string {
  const segments = [];
  segments.push(`对比期号 ${period}`);
  if (redHits > 0) {
    segments.push(`命中 ${redHits} 个红球`);
  }
  if (blueHit) {
    segments.push('命中蓝球');
  }
  if (redHits === 0 && !blueHit) {
    segments.push('本期未命中');
  }
  return segments.join(' · ');
}
