/**
 * @fileoverview predict.routes.ts
 * @module backend/src/routes/predict.routes
 *
 * Input:
//   - ../config/env
//   - ../services/ml-service
//   - ../services/prediction-history
//   - ../services/algorithm-performance
//   - ../services/prediction-evaluator
 *
 * Output:
//   - predictRouter
 *
 * Pos: backend/src/routes/predict.routes.ts
 */

import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { z } from 'zod';

import { runtimeConfig } from '../config/env';
import {
  createPrediction,
  fetchPredictionHistory as fetchPredictionHistoryFromMl,
  fetchAlgorithms,
  type PredictionAlgorithm,
} from '../services/ml-service';
import { savePredictionResult, getPredictionHistory } from '../services/prediction-history';
import { fetchAlgorithmPerformance } from '../services/algorithm-performance';
import { evaluatePredictionPerformance } from '../services/prediction-evaluator';

const algorithmOptions = ['ensemble', 'frequency', 'trend', 'random_forest', 'lstm'] as const;

const predictionRequestSchema = z.object({
  algorithm: z.enum(algorithmOptions).default('ensemble'),
  datasetSize: z
    .coerce
    .number()
    .int()
    .min(runtimeConfig.minDatasetSize, `datasetSize 不能小于 ${runtimeConfig.minDatasetSize}`)
    .max(runtimeConfig.maxDatasetSize, `datasetSize 不能超过 ${runtimeConfig.maxDatasetSize}`)
    .default(runtimeConfig.recommendedDatasetSize),
});

const historyQuerySchema = z.object({
  limit: z
    .coerce
    .number()
    .int()
    .min(1)
    .max(10)
    .default(10),
});

const evaluationQuerySchema = z.object({
  limit: z
    .coerce
    .number()
    .int()
    .min(5)
    .max(100)
    .default(30),
});

export const predictRouter = Router();

predictRouter.get('/algorithms', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await fetchAlgorithms();
    res.json({
      algorithms: data.items,
      count: data.count,
    });
  } catch (error) {
    next(error);
  }
});

predictRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = predictionRequestSchema.parse(req.body);

    const result = await createPrediction({
      algorithm: payload.algorithm as PredictionAlgorithm,
      datasetSize: payload.datasetSize,
    });

    await savePredictionResult(result);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: '请求参数不合法',
        errors: error.flatten(),
      });
      return;
    }
    next(error);
  }
});

predictRouter.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = historyQuerySchema.parse(req.query);

    const history = await getPredictionHistory(query.limit);

    if (history.length === 0) {
      const fallback = await fetchPredictionHistoryFromMl(query.limit);
      res.json({ success: true, data: fallback });
      return;
    }

    res.json({ success: true, data: history });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: '请求参数不合法',
        errors: error.flatten(),
      });
      return;
    }
    next(error);
  }
});

predictRouter.get('/performance', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await fetchAlgorithmPerformance();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

predictRouter.get('/evaluation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit } = evaluationQuerySchema.parse(req.query);
    const result = await evaluatePredictionPerformance(limit);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: '请求参数不合法',
        errors: error.flatten(),
      });
      return;
    }
    next(error);
  }
});
