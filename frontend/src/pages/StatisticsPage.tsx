/**
 * @fileoverview StatisticsPage.tsx
 * @module frontend/src/pages/StatisticsPage
 *
 * Input:
//   - ../lib/api
//   - ../components/charts/EChart
//   - ./statistics-utils
 *
 * Output:
//   - StatisticsPage
 *
 * Pos: frontend/src/pages/StatisticsPage.tsx
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { FrequencyEntry } from '../lib/api';
import { fetchFrequencyStats, fetchTrendData, fetchLatestDraws } from '../lib/api';
import { EChart } from '../components/charts/EChart';
import {
  createBlueChartOption,
  createRedChartOption,
  createTrendChartOption,
  createHeatmapChartOption,
  getTopEntries,
} from './statistics-utils';

const RANGE_OPTIONS = [100, 200, 500, 1000];
const TREND_LIMIT = 20;
const HEATMAP_LIMIT = 30;

export function StatisticsPage() {
  const [range, setRange] = useState(200);

  const {
    data: stats,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['frequency-stats', range],
    queryFn: () => fetchFrequencyStats(range),
    staleTime: 60 * 1000,
  });
  const {
    data: trendData,
    isLoading: trendLoading,
    isError: trendError,
    error: trendErrorObj,
  } = useQuery({
    queryKey: ['trend-data', TREND_LIMIT],
    queryFn: () => fetchTrendData(TREND_LIMIT),
    staleTime: 60 * 1000,
  });

  const {
    data: heatmapData,
    isLoading: heatmapLoading,
    isError: heatmapError,
    error: heatmapErrorObj,
  } = useQuery({
    queryKey: ['heatmap-data', HEATMAP_LIMIT],
    queryFn: () => fetchLatestDraws(HEATMAP_LIMIT),
    staleTime: 60 * 1000,
  });

  const topRedNumbers = useMemo(() => getTopEntries(stats?.redFrequency ?? [], 12), [stats?.redFrequency]);
  const topBlueNumbers = useMemo(() => getTopEntries(stats?.blueFrequency ?? [], 8), [stats?.blueFrequency]);
  const redChartOption = useMemo(() => createRedChartOption(stats), [stats]);
  const blueChartOption = useMemo(() => createBlueChartOption(stats), [stats]);
  const trendChartOption = useMemo(() => createTrendChartOption(trendData), [trendData]);
  const heatmapChartOption = useMemo(() => createHeatmapChartOption(heatmapData, HEATMAP_LIMIT), [heatmapData]);

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h2 className="text-2xl font-semibold text-white">统计分析</h2>
        <p className="text-sm text-slate-300">
          查看号码出现频率、冷热号码及趋势线图。数据来自数据库最新导入的历史记录，可按期数范围切换区间。
        </p>
      </header>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl shadow-slate-950/30">
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
          <span>分析期数</span>
          <select
            value={range}
            onChange={(event) => setRange(Number(event.target.value))}
            className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                最近 {option} 期
              </option>
            ))}
          </select>
          {stats ? (
            <p className="text-xs text-slate-500">
              数据覆盖 {stats.datasetSize} 期，时间范围{' '}
              {stats.dateRange ? (
                <>
                  {new Date(stats.dateRange.from).toLocaleDateString()} —{' '}
                  {new Date(stats.dateRange.to).toLocaleDateString()}
                </>
              ) : (
                '暂无'
              )}
            </p>
          ) : null}
        </div>
        {isError ? (
          <p className="mt-4 text-sm text-red-300">
            统计数据获取失败：{error instanceof Error ? error.message : '未知错误'}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl shadow-slate-950/30">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-white">红球出现频率</h3>
            <span className="text-xs text-slate-400">共 33 个号码</span>
          </div>
          <div className="mt-4">
            <EChart option={isLoading ? undefined : redChartOption} loading={isLoading} height={360} />
          </div>
          {stats && topRedNumbers.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topRedNumbers.map((entry) => (
                <FrequencyTile key={entry.number} entry={entry} tone="red" />
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl shadow-slate-950/30">
            <h3 className="text-lg font-semibold text-white">蓝球分布</h3>
            <EChart option={isLoading ? undefined : blueChartOption} loading={isLoading} height={260} />
            {stats && topBlueNumbers.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {topBlueNumbers.map((entry) => (
                  <FrequencyTile key={entry.number} entry={entry} tone="blue" />
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-sm text-emerald-100">
            <h3 className="text-base font-semibold text-white">冷热号码提示</h3>
            {isLoading ? (
              <p className="mt-2 text-xs">加载中...</p>
            ) : stats ? (
              <div className="mt-4 space-y-3">
                <HotColdList title="最热号码" entries={stats.hotNumbers} accent="hot" />
                <HotColdList title="冷号提示" entries={stats.coldNumbers} accent="cold" />
              </div>
            ) : (
              <p className="mt-2 text-xs">暂无数据</p>
            )}
            <p className="mt-4 text-[11px] text-emerald-200/70">
              数据仅供分析参考，不代表未来结果。建议结合趋势走势和实际策略综合判断。
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl shadow-slate-950/30">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">最近 {TREND_LIMIT} 期红球走势</h3>
          {trendError ? (
            <span className="text-xs text-red-300">
              {trendErrorObj instanceof Error ? trendErrorObj.message : '数据获取失败'}
            </span>
          ) : null}
        </div>
        <div className="mt-4">
          <EChart
            option={trendLoading ? undefined : trendChartOption}
            loading={trendLoading}
            emptyText="暂无走势图数据"
            height={360}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl shadow-slate-950/30">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">号码出现热力图</h3>
          {heatmapError ? (
            <span className="text-xs text-red-300">
              {heatmapErrorObj instanceof Error ? heatmapErrorObj.message : '数据获取失败'}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          展示最近 {HEATMAP_LIMIT} 期各红球号码的出现模式，深色表示未出现，红色表示出现
        </p>
        <div className="mt-4">
          <EChart
            option={heatmapLoading ? undefined : heatmapChartOption}
            loading={heatmapLoading}
            emptyText="暂无热力图数据"
            height={480}
          />
        </div>
      </div>
    </section>
  );
}

interface FrequencyTileProps {
  entry: FrequencyEntry;
  tone: 'red' | 'blue';
}

function FrequencyTile({ entry, tone }: FrequencyTileProps) {
  const baseClasses =
    tone === 'red'
      ? 'from-red-500/15 to-red-500/5 border-red-500/40 text-red-200'
      : 'from-sky-500/15 to-sky-500/5 border-sky-500/40 text-sky-200';

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 ${baseClasses}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-semibold text-white">{entry.number.toString().padStart(2, '0')}</span>
        <span className="text-xs uppercase tracking-[0.3em] text-white/70">出现 {entry.count} 次</span>
      </div>
      <p className="mt-2 text-xs text-slate-400">占比 {entry.percentage}%</p>
    </div>
  );
}

interface HotColdListProps {
  title: string;
  entries: FrequencyEntry[];
  accent: 'hot' | 'cold';
}

function HotColdList({ title, entries, accent }: HotColdListProps) {
  const accentClass = accent === 'hot' ? 'text-amber-300' : 'text-slate-200';

  return (
    <div>
      <p className={`text-xs uppercase tracking-[0.3em] ${accentClass}`}>{title}</p>
      {entries.length === 0 ? (
        <p className="mt-1 text-xs text-slate-300">暂无数据</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2 text-sm text-white">
          {entries.map((entry) => (
            <li
              key={`${title}-${entry.number}`}
              className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold"
            >
              {entry.number.toString().padStart(2, '0')} · {entry.count} 次
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
