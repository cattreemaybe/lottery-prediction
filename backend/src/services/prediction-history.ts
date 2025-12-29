/**
 * @fileoverview prediction-history.ts
 * @module backend/src/services/prediction-history
 *
 * Input:
//   - ../lib/prisma
//   - ../lib/redis
//   - ./algorithm-performance
 *
 * Output:
//   - savePredictionResult
//   - getPredictionHistory
 *
 * Pos: backend/src/services/prediction-history.ts
 */

import type { Prediction } from '../generated/prisma';
import { prisma } from '../lib/prisma';
import { cacheGet, cacheSet, cacheDelPattern, CacheKeys } from '../lib/redis';
import { recordAlgorithmPerformance } from './algorithm-performance';
import type { PredictionResult } from './ml-service';

export interface PredictionHistoryItem {
  red_balls: number[];
  blue_ball: number;
  confidence: number;
  generated_at: string;
  algorithm: Prediction['algorithm'];
  dataset_size: number;
}

const PREDICTION_HISTORY_CACHE_PATTERN = 'prediction:history:*';

function mapPrediction(record: Prediction): PredictionHistoryItem {
  return {
    red_balls: record.redBalls,
    blue_ball: record.blueBall,
    confidence: record.confidence,
    generated_at: record.generatedAt.toISOString(),
    algorithm: record.algorithm,
    dataset_size: record.datasetSize,
  };
}

export async function savePredictionResult(result: PredictionResult) {
  await prisma.prediction.create({
    data: {
      redBalls: result.red_balls,
      blueBall: result.blue_ball,
      confidence: result.confidence,
      algorithm: result.algorithm,
      datasetSize: result.dataset_size,
      generatedAt: result.generated_at ? new Date(result.generated_at) : new Date(),
    },
  });

  await cacheDelPattern(PREDICTION_HISTORY_CACHE_PATTERN);
  await recordAlgorithmPerformance({
    algorithm: result.algorithm,
    confidence: result.confidence,
  });
}

export async function getPredictionHistory(limit: number): Promise<PredictionHistoryItem[]> {
  const cacheKey = CacheKeys.predictionHistory(limit);
  const cached = await cacheGet<PredictionHistoryItem[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const records = await prisma.prediction.findMany({
    orderBy: { generatedAt: 'desc' },
    take: limit,
  });

  const history = records.map(mapPrediction);

  if (history.length > 0) {
    await cacheSet(cacheKey, history, 300);
  }

  return history;
}
