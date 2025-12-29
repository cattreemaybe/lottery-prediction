/**
 * @fileoverview error-handlers.ts
 * @module backend/src/middleware/error-handlers
 *
 * Input:
//   - ../lib/errors
 *
 * Output:
//   - notFoundHandler
//   - errorHandler
 *
 * Pos: backend/src/middleware/error-handlers.ts
 */

import type { Request, Response, NextFunction } from 'express';
import { AppError, ERROR_CODES, isAppError } from '../lib/errors';

export function notFoundHandler(_req: Request, res: Response) {
  const error = new AppError('NOT_FOUND');
  res.status(error.status).json(error.toJSON());
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  void _next; // Keep Express error middleware signature without lint warning
  // Log error in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error Handler]', err);
  }

  // Handle AppError with structured response
  if (isAppError(err)) {
    return res.status(err.status).json(err.toJSON());
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const appError = new AppError('VALIDATION_FAILED', {
      details: (err as unknown as { errors: unknown[] }).errors,
    });
    return res.status(appError.status).json(appError.toJSON());
  }

  // Handle unknown errors
  const status =
    'status' in err ? Number((err as unknown as { status: number }).status) : 500;
  const finalStatus = Number.isInteger(status) && status >= 400 ? status : 500;

  // In production, don't expose internal error details
  const message =
    process.env.NODE_ENV === 'production'
      ? ERROR_CODES.INTERNAL_ERROR.message
      : err.message || ERROR_CODES.INTERNAL_ERROR.message;

  res.status(finalStatus).json({
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR.code,
      message,
    },
  });
}
