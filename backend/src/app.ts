/**
 * @fileoverview app.ts
 * @module backend/src/app
 *
 * Input:
//   - ./config/env
//   - ./routes
//   - ./middleware/error-handlers
 *
 * Output:
//   - createApp
 *
 * Pos: backend/src/app.ts
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { runtimeConfig } from './config/env';
import { apiRouter } from './routes';
import { notFoundHandler, errorHandler } from './middleware/error-handlers';

export function createApp() {
  const app = express();

  app.set('trust proxy', runtimeConfig.nodeEnv === 'production');

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      origin: runtimeConfig.nodeEnv === 'production' ? [/^https:\/\/.+/] : true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 120,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    })
  );

  app.use(
    morgan(runtimeConfig.nodeEnv === 'production' ? 'combined' : 'dev', {
      skip: () => runtimeConfig.nodeEnv === 'test',
    })
  );

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
