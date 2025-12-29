/**
 * @fileoverview index.ts
 * @module backend/src/routes/index
 *
 * Input:
//   - ../config/env
//   - ./health.routes
//   - ./predict.routes
//   - ./lottery.routes
 *
 * Output:
//   - apiRouter
 *
 * Pos: backend/src/routes/index.ts
 */

import { Router } from 'express';
import { runtimeConfig } from '../config/env';
import { healthRouter } from './health.routes';
import { predictRouter } from './predict.routes';
import { lotteryRouter } from './lottery.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/predict', predictRouter);
apiRouter.use('/lottery', lotteryRouter);

apiRouter.get('/constants', (_req, res) => {
  res.json({
    minDatasetSize: runtimeConfig.minDatasetSize,
    recommendedDatasetSize: runtimeConfig.recommendedDatasetSize,
    maxDisplayDatasetSize: runtimeConfig.maxDatasetSize,
    defaultPageSize: 50,
    redBallRange: { min: 1, max: 33, picks: 6 },
    blueBallRange: { min: 1, max: 16, picks: 1 },
    fileUploadLimitMb: 10,
    predictionTimeoutSeconds: runtimeConfig.predictionTimeoutMs / 1000,
    apiResponseTimeoutSeconds: runtimeConfig.apiTimeoutMs / 1000,
  });
});
