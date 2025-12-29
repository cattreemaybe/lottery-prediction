/**
 * @fileoverview api.ts
 * @module frontend/src/lib/api
 *
 * Input:
//   - (no external imports)
 *
 * Output:
//   - apiClient
//   - fetchConstants
//   - fetchAlgorithms
//   - runPrediction
//   - fetchPredictionHistory
//   - fetchAlgorithmPerformance
//   - fetchPredictionEvaluation
//   - fetchLotteryDraws
//   - fetchLatestDraws
//   - fetchDrawByPeriod
//   - fetchLotteryStats
//   - fetchFrequencyStats
//   - fetchTrendData
//   - importLotteryFile
//   - downloadExcelTemplate
//   - downloadCsvTemplate
//   - deleteLotteryDraw
 *
 * Pos: frontend/src/lib/api.ts
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:4000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
});

export interface ConstantsResponse {
  minDatasetSize: number;
  recommendedDatasetSize: number;
  maxDisplayDatasetSize: number;
  defaultPageSize: number;
  redBallRange: { min: number; max: number; picks: number };
  blueBallRange: { min: number; max: number; picks: number };
  fileUploadLimitMb: number;
  predictionTimeoutSeconds: number;
  apiResponseTimeoutSeconds: number;
}

export interface AlgorithmInfo {
  key: 'ensemble' | 'frequency' | 'trend' | 'random_forest' | 'lstm';
  name: string;
  description: string;
  default_weight: number;
}

interface AlgorithmsApiResponse {
  algorithms: AlgorithmInfo[];
  count: number;
}

interface PredictionApiResponse {
  success: boolean;
  data: PredictionResultApi;
}

interface PredictionHistoryApiResponse {
  success: boolean;
  data: PredictionResultApi[];
}

export interface PredictionResultApi {
  red_balls: number[];
  blue_ball: number;
  confidence: number;
  generated_at: string;
  algorithm: AlgorithmInfo['key'];
  dataset_size: number;
}

export interface PredictionResult {
  redBalls: number[];
  blueBall: number;
  confidence: number;
  generatedAt: string;
  algorithm: AlgorithmInfo['key'];
  datasetSize: number;
}

export type PredictionMatchLevel =
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
  algorithm: AlgorithmInfo['key'] | string;
  datasetSize: number;
  generatedAt: string;
  targetPeriod: string | null;
  actualDrawDate: string | null;
  redHits: number;
  blueHit: boolean;
  matchLevel: PredictionMatchLevel;
  status: 'pending' | 'evaluated';
  notes: string;
}

export interface PredictionAlgorithmEvaluation {
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

export interface PredictionEvaluationResponse {
  summary: PredictionEvaluationSummary;
  algorithms: PredictionAlgorithmEvaluation[];
  evaluations: PredictionEvaluationDetail[];
}

export interface AlgorithmPerformance {
  algorithm: string;
  totalRuns: number;
  avgConfidence: number;
  successCount: number;
  partialMatches: number;
  lastRunAt: string | null;
}

export interface FrequencyEntry {
  number: number;
  count: number;
  percentage: number;
}

export interface FrequencyStatsResponse {
  datasetSize: number;
  requestedRange: number;
  redFrequency: FrequencyEntry[];
  blueFrequency: FrequencyEntry[];
  hotNumbers: FrequencyEntry[];
  coldNumbers: FrequencyEntry[];
  dateRange: { from: string; to: string } | null;
  generatedAt: string;
}

export interface TrendPoint {
  period: string;
  drawDate: string;
  redBalls: number[];
  blueBall: number;
}

export async function fetchConstants() {
  const { data } = await apiClient.get<ConstantsResponse>('/constants');
  return data;
}

export async function fetchAlgorithms() {
  const { data } = await apiClient.get<AlgorithmsApiResponse>('/predict/algorithms');
  return data.algorithms;
}

export async function runPrediction(payload: { algorithm: AlgorithmInfo['key']; datasetSize: number }) {
  const { data } = await apiClient.post<PredictionApiResponse>('/predict', payload);
  return mapPredictionResult(data.data);
}

export async function fetchPredictionHistory(limit = 5) {
  const { data } = await apiClient.get<PredictionHistoryApiResponse>('/predict/history', {
    params: { limit },
  });
  return data.data.map(mapPredictionResult);
}

export async function fetchAlgorithmPerformance() {
  const { data } = await apiClient.get<{ success: boolean; data: AlgorithmPerformance[] }>('/predict/performance');
  return data.data;
}

export async function fetchPredictionEvaluation(limit = 30) {
  const { data } = await apiClient.get<{ success: boolean; data: PredictionEvaluationResponse }>('/predict/evaluation', {
    params: { limit },
  });
  return data.data;
}

function mapPredictionResult(result: PredictionResultApi): PredictionResult {
  return {
    redBalls: result.red_balls,
    blueBall: result.blue_ball,
    confidence: result.confidence,
    generatedAt: result.generated_at,
    algorithm: result.algorithm,
    datasetSize: result.dataset_size,
  };
}

// Lottery Data Management APIs

export interface LotteryDraw {
  id: string;
  period: string;
  drawDate: string;
  redBalls: number[];
  blueBall: number;
  source: string;
  importedAt: string;
}

interface LotteryDrawsApiResponse {
  success: boolean;
  data: LotteryDraw[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface LotteryStatsApiResponse {
  success: boolean;
  data: {
    totalDraws: number;
    latestDraw: LotteryDraw | null;
    oldestDraw: LotteryDraw | null;
    dateRange: {
      from: string;
      to: string;
    } | null;
  };
}

interface ImportResultApiResponse {
  success: boolean;
  message: string;
  data: {
    inserted: number;
    skipped: number;
    errors: Array<{ row: number; error: string }>;
  };
}

export async function fetchLotteryDraws(params?: {
  page?: number;
  pageSize?: number;
  sortBy?: 'drawDate' | 'period';
  sortOrder?: 'asc' | 'desc';
}) {
  const { data } = await apiClient.get<LotteryDrawsApiResponse>('/lottery/draws', { params });
  return data;
}

export async function fetchLatestDraws(count = 50) {
  const { data } = await apiClient.get<LotteryDrawsApiResponse>('/lottery/draws/latest', {
    params: { count },
  });
  return data.data;
}

export async function fetchDrawByPeriod(period: string) {
  const { data } = await apiClient.get<{ success: boolean; data: LotteryDraw }>(`/lottery/draws/${period}`);
  return data.data;
}

export async function fetchLotteryStats() {
  const { data } = await apiClient.get<LotteryStatsApiResponse>('/lottery/stats');
  return data.data;
}

export async function fetchFrequencyStats(range = 200) {
  const { data } = await apiClient.get<{ success: boolean; data: FrequencyStatsResponse }>('/lottery/stats/frequency', {
    params: { range },
  });
  return data.data;
}

export async function fetchTrendData(limit = 20) {
  const { data } = await apiClient.get<{ success: boolean; data: TrendPoint[] }>('/lottery/stats/trend', {
    params: { limit },
  });
  return data.data;
}

export async function importLotteryFile(file: File, onDuplicate: 'skip' | 'replace' | 'error' = 'skip') {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post<ImportResultApiResponse>('/lottery/import', formData, {
    params: { onDuplicate },
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
}

export async function downloadExcelTemplate() {
  const response = await apiClient.get('/lottery/template/excel', {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'lottery-template.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadCsvTemplate() {
  const response = await apiClient.get('/lottery/template/csv', {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'lottery-template.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function deleteLotteryDraw(period: string) {
  const { data } = await apiClient.delete<{ success: boolean; message: string }>(`/lottery/draws/${period}`);
  return data;
}
