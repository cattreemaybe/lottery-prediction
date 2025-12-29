/**
 * @fileoverview ml-service.ts
 * @module backend/src/services/ml-service
 *
 * Input:
//   - ../config/env
 *
 * Output:
//   - fetchAlgorithms
//   - createPrediction
//   - fetchPredictionHistory
 *
 * Pos: backend/src/services/ml-service.ts
 */

import { runtimeConfig } from '../config/env';

interface ApiError extends Error {
  status?: number;
}

export type PredictionAlgorithm = 'ensemble' | 'frequency' | 'trend' | 'random_forest' | 'lstm';

export interface AlgorithmInfo {
  key: PredictionAlgorithm;
  name: string;
  description: string;
  default_weight: number;
}

export interface PredictionPayload {
  algorithm: PredictionAlgorithm;
  datasetSize: number;
}

export interface PredictionResult {
  red_balls: number[];
  blue_ball: number;
  confidence: number;
  generated_at: string;
  algorithm: PredictionAlgorithm;
  dataset_size: number;
}

interface AlgorithmsResponse {
  items: AlgorithmInfo[];
  count: number;
}

async function requestFromMl<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), runtimeConfig.mlServiceTimeoutMs);

  try {
    const response = await fetch(`${runtimeConfig.mlServiceBaseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const message = await getErrorMessage(response);
      const error: ApiError = new Error(message || '算法服务请求失败');
      error.status = response.status;
      throw error;
    }

    return (await response.json()) as T;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error('算法服务超时，请稍后重试');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function getErrorMessage(response: Response) {
  try {
    const data = await response.json();
    if (typeof data === 'string') {
      return data;
    }
    if (data?.detail) {
      return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    }
    return data?.message;
  } catch (error) {
    return response.statusText;
  }
}

export async function fetchAlgorithms() {
  return requestFromMl<AlgorithmsResponse>('/v1/algorithms/');
}

export async function createPrediction(payload: PredictionPayload) {
  return requestFromMl<PredictionResult>('/v1/predict/', {
    method: 'POST',
    body: JSON.stringify({
      algorithm: payload.algorithm,
      dataset_size: payload.datasetSize,
    }),
  });
}

export async function fetchPredictionHistory(limit = 10) {
  return requestFromMl<PredictionResult[]>(`/v1/predict/history?limit=${limit}`);
}
