/**
 * @fileoverview env.ts
 * @module backend/src/config/env
 *
 * Input:
//   - (no external imports)
 *
 * Output:
//   - runtimeConfig
 *
 * Pos: backend/src/config/env.ts
 */

import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === 'test') {
  loadEnv({ path: path.resolve(process.cwd(), '.env.test') });
} else {
  loadEnv();
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .optional()
    .transform((value) => Number(value ?? 4000))
    .refine((value) => Number.isInteger(value) && value >= 0, {
      message: 'PORT must be a non-negative integer',
    }),
  API_TIMEOUT_MS: z
    .string()
    .optional()
    .transform((value) => Number(value ?? 1000)),
  PREDICTION_TIMEOUT_MS: z
    .string()
    .optional()
    .transform((value) => Number(value ?? 5000)),
  MIN_DATASET_SIZE: z.string().optional().transform((value) => Number(value ?? 50)),
  RECOMMENDED_DATASET_SIZE: z
    .string()
    .optional()
    .transform((value) => Number(value ?? 200)),
  MAX_DATASET_SIZE: z.string().optional().transform((value) => Number(value ?? 1000)),
  ML_SERVICE_BASE_URL: z
    .string()
    .url()
    .optional()
    .transform((value) => value ?? 'http://127.0.0.1:8001/api'),
  ML_SERVICE_TIMEOUT_MS: z
    .string()
    .optional()
    .transform((value) => Number(value ?? 2000)),
});

const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error('Environment variables validation failed:', env.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const runtimeConfig = {
  nodeEnv: env.data.NODE_ENV,
  port: env.data.PORT,
  apiTimeoutMs: env.data.API_TIMEOUT_MS,
  predictionTimeoutMs: env.data.PREDICTION_TIMEOUT_MS,
  minDatasetSize: env.data.MIN_DATASET_SIZE,
  recommendedDatasetSize: env.data.RECOMMENDED_DATASET_SIZE,
  maxDatasetSize: env.data.MAX_DATASET_SIZE,
  mlServiceBaseUrl: env.data.ML_SERVICE_BASE_URL,
  mlServiceTimeoutMs: env.data.ML_SERVICE_TIMEOUT_MS,
};
