/**
 * @fileoverview health.routes.ts
 * @module backend/src/routes/health.routes
 *
 * Input:
//   - (no external imports)
 *
 * Output:
//   - healthRouter
 *
 * Pos: backend/src/routes/health.routes.ts
 */

import { Router } from 'express';
import type { Request, Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'pending',
      cache: 'pending',
      mlService: 'pending'
    }
  });
});
