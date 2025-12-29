/**
 * @fileoverview PredictPage.tsx
 * @module frontend/src/pages/PredictPage
 *
 * Input:
//   - ../lib/api
//   - ../components/charts/EChart
//   - ./statistics-utils
//   - ../lib/fortune
 *
 * Output:
//   - PredictPage
 *
 * Pos: frontend/src/pages/PredictPage.tsx
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { AlgorithmInfo, PredictionMatchLevel } from '../lib/api';
import {
  fetchAlgorithms,
  fetchConstants,
  fetchPredictionEvaluation,
  fetchPredictionHistory,
  runPrediction,
} from '../lib/api';
import { EChart } from '../components/charts/EChart';
import { createAlgorithmRadarOption, createPredictionHistoryOption } from './statistics-utils';
import { calculateFortuneNumbers, type FortuneResult } from '../lib/fortune';

const DEFAULT_RED = ['—', '—', '—', '—', '—', '—'];
const DEFAULT_BLUE = '—';
const DATASET_PRESETS = [50, 100, 200, 300, 500];
const FALLBACK_ALGORITHMS: AlgorithmInfo[] = [
  {
    key: 'ensemble',
    name: '综合预测',
    description: '按权重融合多种算法结果，权重可依据表现动态调整。',
    default_weight: 1,
  },
  {
    key: 'frequency',
    name: '频率分析',
    description: '统计历史红蓝球出现频次，基于热号组合给出候选。',
    default_weight: 0.2,
  },
  {
    key: 'trend',
    name: '趋势分析 (ARIMA)',
    description: '利用时间序列模型捕捉周期性规律，观察走势变化。',
    default_weight: 0.25,
  },
  {
    key: 'random_forest',
    name: '随机森林',
    description: '对多种特征进行训练，使用随机森林分类器输出结果。',
    default_weight: 0.3,
  },
  {
    key: 'lstm',
    name: 'LSTM 神经网络',
    description: '深度学习模型，建模更复杂的序列关联，适合长期趋势。',
    default_weight: 0.25,
  },
];

export function PredictPage() {
  const { data: constants } = useQuery({ queryKey: ['constants'], queryFn: fetchConstants });
  const { data: algorithms = [], isLoading: algorithmsLoading } = useQuery({
    queryKey: ['algorithms'],
    queryFn: fetchAlgorithms,
  });
  const historyQuery = useQuery({
    queryKey: ['prediction-history'],
    queryFn: () => fetchPredictionHistory(10),
  });

  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmInfo['key']>('ensemble');
  const [datasetSize, setDatasetSize] = useState(constants?.recommendedDatasetSize ?? 200);
  const [birthday, setBirthday] = useState('');
  const [fortuneResult, setFortuneResult] = useState<FortuneResult | null>(null);
  const [fortuneError, setFortuneError] = useState<string | null>(null);
  const [fortuneUpdatedAt, setFortuneUpdatedAt] = useState<Date | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | AlgorithmInfo['key']>('all');
  const [evaluationFilter, setEvaluationFilter] = useState<'all' | AlgorithmInfo['key']>('all');

  useEffect(() => {
    if (constants) {
      setDatasetSize(constants.recommendedDatasetSize);
    }
  }, [constants]);

  const datasetOptions = useMemo(() => {
    if (!constants) {
      return DATASET_PRESETS;
    }
    return DATASET_PRESETS.filter(
      (size) => size >= constants.minDatasetSize && size <= constants.maxDisplayDatasetSize,
    );
  }, [constants]);

  const algorithmsToShow = algorithms.length > 0 ? algorithms : FALLBACK_ALGORITHMS;

  const radarChartOption = useMemo(() => createAlgorithmRadarOption(), []);

  const evaluationQuery = useQuery({
    queryKey: ['prediction-evaluation'],
    queryFn: () => fetchPredictionEvaluation(30),
    staleTime: 60 * 1000,
  });

  const predictionMutation = useMutation({
    mutationFn: runPrediction,
    onSuccess: () => {
      historyQuery.refetch();
      evaluationQuery.refetch();
    },
  });

  const currentResult = predictionMutation.data ?? null;
  const isPredicting = predictionMutation.isPending;
  const predictError = predictionMutation.error instanceof Error ? predictionMutation.error : null;

  const redNumbers = currentResult
    ? currentResult.redBalls.map((num) => num.toString().padStart(2, '0'))
    : DEFAULT_RED;
  const blueNumber = currentResult ? currentResult.blueBall.toString().padStart(2, '0') : DEFAULT_BLUE;

  const confidenceText = currentResult ? `${currentResult.confidence.toFixed(1)} 分` : '—';
  const generatedAtText = currentResult
    ? new Date(currentResult.generatedAt).toLocaleString()
    : '预测完成后将显示生成时间和算法信息';

  const handlePredict = () => {
    predictionMutation.mutate({
      algorithm: selectedAlgorithm,
      datasetSize,
    });
  };

  const historyItems = historyQuery.data ?? [];
  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') {
      return historyItems;
    }
    return historyItems.filter((item) => item.algorithm === historyFilter);
  }, [historyItems, historyFilter]);
  const visibleHistory = useMemo(() => filteredHistory.slice(0, 5), [filteredHistory]);

  const historyChartOption = useMemo(
    () => createPredictionHistoryOption(filteredHistory, historyFilter),
    [filteredHistory, historyFilter]
  );

  const historyStats = useMemo(() => {
    if (filteredHistory.length === 0) {
      return null;
    }
    const avg = filteredHistory.reduce((sum, item) => sum + item.confidence, 0) / filteredHistory.length;
    const best = filteredHistory.reduce((max, item) => Math.max(max, item.confidence), 0);
    const latest = filteredHistory[0]?.confidence ?? 0;
    return {
      average: avg,
      best,
      latest,
    };
  }, [filteredHistory]);

  const evaluationData = evaluationQuery.data;
  const evaluationSummary = evaluationData?.summary ?? null;
  const evaluationRecords = useMemo(() => {
    if (!evaluationData) {
      return [];
    }
    const list =
      evaluationFilter === 'all'
        ? evaluationData.evaluations
        : evaluationData.evaluations.filter((item) => item.algorithm === evaluationFilter);
    return list.slice(0, 6);
  }, [evaluationData, evaluationFilter]);

  const evaluationAlgorithmStats = useMemo(() => {
    if (!evaluationData) {
      return null;
    }
    if (evaluationFilter === 'all') {
      return null;
    }
    return evaluationData.algorithms.find((item) => item.algorithm === evaluationFilter) ?? null;
  }, [evaluationData, evaluationFilter]);

  const fortuneRedNumbers = fortuneResult
    ? fortuneResult.redBalls.map((num) => num.toString().padStart(2, '0'))
    : DEFAULT_RED;
  const fortuneBlueNumber = fortuneResult ? fortuneResult.blueBall.toString().padStart(2, '0') : DEFAULT_BLUE;

  const handleGenerateFortune = () => {
    if (!birthday) {
      setFortuneError('请选择生日');
      setFortuneResult(null);
      return;
    }
    const parsed = new Date(birthday);
    if (Number.isNaN(parsed.getTime())) {
      setFortuneError('生日格式不正确');
      setFortuneResult(null);
      return;
    }
    try {
      const result = calculateFortuneNumbers(parsed);
      setFortuneResult(result);
      setFortuneError(null);
      setFortuneUpdatedAt(new Date());
    } catch (error) {
      setFortuneResult(null);
      setFortuneError(error instanceof Error ? error.message : '生日格式不正确');
    }
  };

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h2 className="text-2xl font-semibold text-white">号码预测</h2>
        <p className="text-sm text-slate-300">
          基于最近数据集运行算法生成红球与蓝球组合。预测耗时最多 5 秒，支持多算法切换与历史记录回看。
        </p>
        <p className="text-xs text-amber-400">预测基于统计模型，不保证准确，理性购彩。</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/40 p-8 shadow-xl shadow-slate-950/30">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <label className="flex items-center gap-2">
              <span>使用历史期数</span>
              <select
                value={datasetSize}
                onChange={(event) => setDatasetSize(Number(event.target.value))}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100"
              >
                {datasetOptions.map((option) => (
                  <option key={option} value={option}>
                    最近 {option} 期
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span>预测算法</span>
              <select
                value={selectedAlgorithm}
                onChange={(event) => setSelectedAlgorithm(event.target.value as AlgorithmInfo['key'])}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100"
              >
                {algorithmsToShow.map((algo) => (
                  <option key={algo.key} value={algo.key}>
                    {algo.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={handlePredict}
              disabled={isPredicting}
              className="ml-auto rounded-full bg-primary/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPredicting ? '正在预测…' : '预测号码'}
            </button>
          </div>

          {predictError ? (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
              <p className="font-semibold">预测失败</p>
              <p className="mt-1 text-xs text-red-200/80">
                {predictError.message || '请求失败，请稍后重试或检查算法服务状态。'}
              </p>
            </div>
          ) : null}

          <div className="rounded-3xl border border-primary/40 bg-primary/10 p-8 text-center text-white shadow-lg shadow-primary/20">
            <p className="text-sm uppercase tracking-[0.4em] text-primary/70">预测结果</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-3xl font-semibold">
              {redNumbers.map((num, index) => (
                <span
                  key={`red-${index}`}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-900/40"
                >
                  {num}
                </span>
              ))}
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-600 text-3xl font-semibold shadow-lg shadow-sky-900/40">
                {blueNumber}
              </span>
            </div>
            <p className="mt-4 text-xs text-slate-200">
              预测置信度：<span className="font-semibold text-white">{confidenceText}</span>
            </p>
            <p className="mt-2 text-xs text-slate-400">{generatedAtText}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoTile title="当前算法" value={formatAlgorithmName(selectedAlgorithm, algorithmsToShow)} />
            <InfoTile title="历史期数" value={`最近 ${datasetSize} 期`} />
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white">预测历史分析</h3>
                <p className="mt-1 text-xs text-slate-400">
                  对比最近预测的置信度与使用的数据量，了解算法表现趋势。
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <span>筛选算法</span>
                <select
                  value={historyFilter}
                  onChange={(event) => setHistoryFilter(event.target.value as typeof historyFilter)}
                  className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-100"
                >
                  <option value="all">全部</option>
                  {algorithmsToShow.map((algo) => (
                    <option key={algo.key} value={algo.key}>
                      {algo.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <HistoryStatBadge
                label="平均置信度"
                value={historyStats ? `${historyStats.average.toFixed(1)} 分` : '—'}
                caption={historyStats ? '近十次预测均值' : '等待预测数据'}
              />
              <HistoryStatBadge
                label="最佳记录"
                value={historyStats ? `${historyStats.best.toFixed(1)} 分` : '—'}
                caption="最近历史中的最高分"
              />
              <HistoryStatBadge
                label="最新结果"
                value={historyStats ? `${historyStats.latest.toFixed(1)} 分` : '—'}
                caption={filteredHistory[0] ? formatAlgorithmName(filteredHistory[0].algorithm, algorithmsToShow) : '—'}
              />
            </div>

            <div className="mt-4">
              <EChart
                option={historyQuery.isLoading ? undefined : historyChartOption}
                loading={historyQuery.isLoading}
                emptyText={filteredHistory.length === 0 ? '暂无匹配的预测记录' : undefined}
                height={320}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white">预测效果评估</h3>
                <p className="mt-1 text-xs text-slate-400">
                  基于开奖数据自动比对近十次预测命中情况，帮助评估算法表现。
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <span>筛选算法</span>
                <select
                  value={evaluationFilter}
                  onChange={(event) => setEvaluationFilter(event.target.value as typeof evaluationFilter)}
                  className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-100"
                >
                  <option value="all">全部</option>
                  {algorithmsToShow.map((algo) => (
                    <option key={`evaluation-${algo.key}`} value={algo.key}>
                      {algo.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {evaluationQuery.isLoading ? (
              <p className="mt-4 text-xs text-slate-500">正在分析预测效果…</p>
            ) : evaluationSummary ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <EvaluationStatBadge
                    label="平均红球命中"
                    value={`${evaluationSummary.avgRedHits.toFixed(2)} 个`}
                    caption={`已评估 ${evaluationSummary.evaluatedCount} 次`}
                  />
                  <EvaluationStatBadge
                    label="蓝球命中次数"
                    value={`${evaluationSummary.blueHits}`}
                    caption="含全部算法"
                  />
                  <EvaluationStatBadge
                    label="最高命中"
                    value={`${evaluationSummary.bestRedHits} 个`}
                    caption="历史最佳红球命中个数"
                  />
                </div>
                {evaluationAlgorithmStats ? (
                  <p className="mt-2 text-xs text-slate-400">
                    {formatAlgorithmName(evaluationAlgorithmStats.algorithm as AlgorithmInfo['key'], algorithmsToShow)} ·{' '}
                    平均命中 {evaluationAlgorithmStats.avgRedHits.toFixed(2)} 个红球 · 高命中{' '}
                    {evaluationAlgorithmStats.highMatches} 次
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-4 text-xs text-slate-500">暂无评估数据，先进行预测并导入开奖信息。</p>
            )}

            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800">
              {evaluationRecords.length === 0 ? (
                <p className="p-4 text-xs text-slate-500">
                  {evaluationFilter === 'all' ? '暂无评估记录。' : '该算法暂无评估记录。'}
                </p>
              ) : (
                <table className="min-w-full divide-y divide-slate-800 text-sm">
                  <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left">预测时间</th>
                      <th className="px-4 py-3 text-left">算法</th>
                      <th className="px-4 py-3 text-left">目标期号</th>
                      <th className="px-4 py-3 text-center">红球命中</th>
                      <th className="px-4 py-3 text-center">蓝球</th>
                      <th className="px-4 py-3 text-left">结果</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/50 bg-slate-950/60 text-slate-200">
                    {evaluationRecords.map((record) => (
                      <tr key={record.predictionId}>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {new Date(record.generatedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          {formatAlgorithmName(record.algorithm as AlgorithmInfo['key'], algorithmsToShow)}
                        </td>
                        <td className="px-4 py-3">{record.targetPeriod ?? '等待开奖'}</td>
                        <td className="px-4 py-3 text-center">
                          {record.status === 'pending' ? '—' : `${record.redHits} 个`}
                        </td>
                        <td className="px-4 py-3 text-center">{record.status === 'evaluated' ? (record.blueHit ? '✓' : '—') : '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <MatchLevelBadge level={record.matchLevel} />
                            <span className="text-xs text-slate-400">{record.notes}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-1 items-center gap-3 text-sm">
                <label className="text-slate-200">
                  生日
                  <input
                    type="date"
                    value={birthday}
                    onChange={(event) => setBirthday(event.target.value)}
                    className="ml-2 rounded-full border border-slate-700 bg-transparent px-3 py-1 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
                  />
                </label>
              </div>
              <button
                onClick={handleGenerateFortune}
                className="rounded-full bg-amber-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
              >
                计算今日运势号码
              </button>
            </div>
            {fortuneError ? (
              <p className="mt-3 text-xs text-red-200">{fortuneError}</p>
            ) : (
              <div className="mt-4 space-y-3 text-sm text-slate-200">
                <p className="text-xs uppercase tracking-[0.3em] text-amber-400">今日幸运组合</p>
                <div className="flex flex-wrap items-center gap-3 text-2xl font-semibold">
                  {fortuneRedNumbers.map((num, index) => (
                    <span
                      key={`fortune-red-${index}`}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-inner shadow-amber-900/40"
                    >
                      {num}
                    </span>
                  ))}
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-inner shadow-sky-900/40">
                    {fortuneBlueNumber}
                  </span>
                </div>
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-50">
                  <p className="font-semibold">
                    幸运指数:{' '}
                    <span className="text-base text-white">{fortuneResult ? `${fortuneResult.luckScore} 分` : '—'}</span>
                  </p>
                  {fortuneResult && (
                    <>
                      <p className="mt-2 text-amber-100/80">{fortuneResult.energyTrend}</p>
                      <p className="mt-2 text-amber-100/80">{fortuneResult.suggestion}</p>
                    </>
                  )}
                  {fortuneUpdatedAt && (
                    <p className="mt-2 text-[11px] text-amber-100/60">
                      最近计算：{fortuneUpdatedAt.toLocaleTimeString('zh-CN')}
                    </p>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  根据生日与当日节律计算，仅作娱乐与灵感参考，请理性投注。
                </p>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <h3 className="text-base font-semibold text-white">算法性能对比</h3>
            <p className="mt-1 text-xs text-slate-400">
              五个维度对比五种算法: 准确性、速度、稳定性、复杂度、可解释性
            </p>
            <div className="mt-4">
              <EChart option={radarChartOption} height={360} />
            </div>
            <div className="mt-4 grid gap-2 text-xs text-slate-400">
              <p>• <span className="text-amber-400">综合预测</span>: 融合多算法,准确性和稳定性最优</p>
              <p>• <span className="text-green-400">频率分析</span>: 速度最快,可解释性最高</p>
              <p>• <span className="text-blue-400">趋势分析</span>: 捕捉时间序列规律</p>
              <p>• <span className="text-purple-400">随机森林</span>: 机器学习,稳定性高</p>
              <p>• <span className="text-pink-400">LSTM神经网络</span>: 深度学习,复杂度最高</p>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300">
            <h3 className="text-base font-semibold text-white">可选算法</h3>
            {algorithmsLoading && algorithms.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">正在加载算法列表…</p>
            ) : (
              <ul className="mt-3 space-y-3 text-xs text-slate-400">
                {algorithmsToShow.map((algo) => (
                  <li key={algo.key} className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-3">
                    <p className="font-medium text-slate-200">{algo.name}</p>
                    <p className="mt-1 leading-relaxed">{algo.description}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-primary/70">
                      权重 {Math.round(algo.default_weight * 100)}%
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300">
            <h3 className="text-base font-semibold text-white">最近预测记录</h3>
            {historyQuery.isLoading ? (
              <p className="mt-3 text-xs text-slate-500">正在获取历史记录…</p>
            ) : filteredHistory.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">暂无匹配的历史记录，尝试调整筛选条件。</p>
            ) : (
              <ul className="mt-3 space-y-3 text-xs text-slate-300">
                {visibleHistory.map((item, index) => (
                  <li key={`${item.generatedAt}-${index}`} className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-3">
                    <p className="font-semibold text-white">
                      {item.redBalls.map((num) => num.toString().padStart(2, '0')).join(' · ')} |{' '}
                      <span className="text-sky-300">{item.blueBall.toString().padStart(2, '0')}</span>
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {new Date(item.generatedAt).toLocaleString()} · {formatAlgorithmName(item.algorithm, algorithmsToShow)} · 最近 {item.datasetSize} 期
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-6 text-xs text-red-100">
            <p className="font-semibold tracking-wide">风险提示</p>
            <p className="mt-2 leading-relaxed">
              本预测基于历史数据统计分析，不构成任何投注建议。彩票号码具有随机性，历史表现不代表未来结果。
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function formatAlgorithmName(key: string, list: AlgorithmInfo[]) {
  const found = list.find((algo) => algo.key === key);
  return found ? found.name : '综合预测';
}

interface InfoTileProps {
  title: string;
  value: string;
}

function InfoTile({ title, value }: InfoTileProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{title}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

interface HistoryStatBadgeProps {
  label: string;
  value: string;
  caption: string;
}

function HistoryStatBadge({ label, value, caption }: HistoryStatBadgeProps) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{caption}</p>
    </div>
  );
}

interface EvaluationStatBadgeProps {
  label: string;
  value: string;
  caption: string;
}

function EvaluationStatBadge({ label, value, caption }: EvaluationStatBadgeProps) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{caption}</p>
    </div>
  );
}

const MATCH_LEVEL_CONFIG: Record<PredictionMatchLevel, { label: string; className: string }> = {
  pending: { label: '待开奖', className: 'border-slate-500/50 text-slate-400' },
  jackpot: { label: '一等奖', className: 'border-emerald-500/60 text-emerald-200' },
  excellent: { label: '超高命中', className: 'border-green-500/60 text-green-200' },
  great: { label: '高命中', className: 'border-sky-500/60 text-sky-200' },
  good: { label: '中等命中', className: 'border-amber-500/60 text-amber-200' },
  low: { label: '低命中', className: 'border-yellow-500/40 text-yellow-200' },
  blue: { label: '蓝球命中', className: 'border-blue-500/60 text-blue-200' },
  miss: { label: '未命中', className: 'border-slate-700 text-slate-400' },
};

function MatchLevelBadge({ level }: { level: PredictionMatchLevel }) {
  const config = MATCH_LEVEL_CONFIG[level];
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${config.className}`}>{config.label}</span>
  );
}
