/**
 * @fileoverview DashboardPage.tsx
 * @module frontend/src/pages/DashboardPage
 *
 * Input:
//   - ../components/cards/MetricCard
//   - ../lib/api
 *
 * Output:
//   - DashboardPage
 *
 * Pos: frontend/src/pages/DashboardPage.tsx
 */

import { useQuery } from '@tanstack/react-query';
import { MetricCard } from '../components/cards/MetricCard';
import { fetchLotteryStats, fetchPredictionHistory, type PredictionResult } from '../lib/api';

export function DashboardPage() {
  const {
    data: stats,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ['lottery-stats'],
    queryFn: fetchLotteryStats,
  });

  const {
    data: predictionHistory,
    isLoading: predictionLoading,
  } = useQuery({
    queryKey: ['prediction-history', 1],
    queryFn: () => fetchPredictionHistory(1),
  });

  const latestPrediction = predictionHistory?.[0];

  const historyValue = statsLoading
    ? '加载中...'
    : stats
      ? `${stats.totalDraws.toLocaleString()} 期`
      : '0 期';

  const historyDescription = stats?.dateRange
    ? `${formatDate(stats.dateRange.from)} 至 ${formatDate(stats.dateRange.to)}`
    : '上传历史开奖数据以激活预测功能';

  const latestPeriodValue = stats?.latestDraw?.period
    ? `第 ${stats.latestDraw.period} 期`
    : statsLoading
      ? '加载中...'
      : '待导入';

  const latestPeriodDescription = stats?.latestDraw
    ? `${formatDate(stats.latestDraw.drawDate)} 开奖 · 来源 ${stats.latestDraw.source || '手动'}`
    : '支持 Excel / CSV 增量导入并提供模板';

  const predictionValue = predictionLoading
    ? '加载中...'
    : latestPrediction
      ? `${latestPrediction.confidence.toFixed(1)}%`
      : '—';

  const predictionDescription = latestPrediction
    ? `${formatAlgorithmName(latestPrediction.algorithm)} · 最近 ${latestPrediction.datasetSize} 期`
    : '完成首个预测后显示置信度评分';

  const updateValue = stats?.latestDraw?.importedAt
    ? formatDateTime(stats.latestDraw.importedAt)
    : statsLoading
      ? '加载中...'
      : '待导入';

  const updateDescription = stats?.latestDraw
    ? '最近一次数据导入时间'
    : '导入数据后将展示同步状态';

  return (
    <section className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="历史数据量"
          value={historyValue}
          description={historyDescription}
          accent="blue"
        />
        <MetricCard
          title="最新期号"
          value={latestPeriodValue}
          description={latestPeriodDescription}
          accent="red"
        />
        <MetricCard
          title="最近预测置信度"
          value={predictionValue}
          description={predictionDescription}
          accent="yellow"
        />
        <MetricCard
          title="数据更新"
          value={updateValue}
          description={updateDescription}
          accent="green"
        />
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 shadow-xl shadow-slate-950/30">
        <h2 className="text-xl font-semibold text-white">快速开始指南</h2>
        <ol className="mt-4 space-y-3 text-sm text-slate-300">
          <li>1. 下载数据模板，整理至少50期历史开奖记录。</li>
          <li>2. 在“历史数据”页面上传Excel或CSV文件并处理冲突。</li>
          <li>3. 在“号码预测”页面选择算法和数据范围并发起预测。</li>
          <li>4. 在“统计分析”页面查看频率/趋势图表，验证预测依据。</li>
          <li>5. 在“算法管理”页面了解不同算法的说明与历史表现。</li>
        </ol>
        <p className="mt-6 text-xs text-slate-500">
          提示：预测算法将在5秒内返回结果，如超时请检查数据完整性或稍后重试。
        </p>
      </div>
    </section>
  );
}

const ALGORITHM_LABELS: Record<PredictionResult['algorithm'], string> = {
  ensemble: '综合预测',
  frequency: '频率分析',
  trend: '趋势分析',
  random_forest: '随机森林',
  lstm: 'LSTM 神经网络',
};

function formatAlgorithmName(key: PredictionResult['algorithm']): string {
  return ALGORITHM_LABELS[key] ?? '综合预测';
}

function formatDate(value?: string | Date | null): string {
  if (!value) return '未知日期';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '未知日期' : date.toLocaleDateString('zh-CN');
}

function formatDateTime(value?: string | Date | null): string {
  if (!value) return '未知时间';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '未知时间' : date.toLocaleString('zh-CN');
}
