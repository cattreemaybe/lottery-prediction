/**
 * @fileoverview AlgorithmsPage.tsx
 * @module frontend/src/pages/AlgorithmsPage
 *
 * Input:
//   - ../lib/api
 *
 * Output:
//   - AlgorithmsPage
 *
 * Pos: frontend/src/pages/AlgorithmsPage.tsx
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AlgorithmPerformance } from '../lib/api';
import { fetchAlgorithmPerformance } from '../lib/api';

const algorithms = [
  {
    name: '频率分析',
    key: 'frequency',
    description: '统计历史红蓝球出现频次，基于热号组合进行推荐。',
    accuracy: '历史命中率：—',
    weight: '权重：20%',
  },
  {
    name: '趋势分析 (ARIMA)',
    key: 'trend',
    description: '利用时间序列模型捕捉周期性规律，适合分析中长期趋势。',
    accuracy: '历史命中率：—',
    weight: '权重：25%',
  },
  {
    name: '随机森林',
    key: 'random_forest',
    description: '结合多种特征工程，使用随机森林分类器输出候选号码。',
    accuracy: '历史命中率：—',
    weight: '权重：30%',
  },
  {
    name: 'LSTM 神经网络',
    key: 'lstm',
    description: '深度学习模型，捕捉复杂的序列关联关系，需要更长训练时间。',
    accuracy: '历史命中率：—',
    weight: '权重：25%',
  },
  {
    name: '综合预测',
    key: 'ensemble',
    description: '按权重融合多种算法结果，自动基于历史表现调整权重。',
    accuracy: '历史命中率：—',
    weight: '动态权重',
  }
];

export function AlgorithmsPage() {
  const { data: performance = [], isLoading } = useQuery({
    queryKey: ['algorithm-performance'],
    queryFn: fetchAlgorithmPerformance,
    staleTime: 60 * 1000,
  });

  const performanceMap = useMemo(() => {
    const map = new Map<string, AlgorithmPerformance>();
    performance.forEach((item) => map.set(item.algorithm, item));
    return map;
  }, [performance]);

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h2 className="text-2xl font-semibold text-white">算法管理与说明</h2>
        <p className="text-sm text-slate-300">
          了解系统提供的预测算法，查看算法说明、历史表现和综合预测策略。后续将支持偏好保存与历史执行记录。
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {algorithms.map((algo) => {
          const stats = performanceMap.get(algo.key);
          return (
            <article
              key={algo.key}
              className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl shadow-slate-950/30"
            >
              <header>
                <h3 className="text-lg font-semibold text-white">{algo.name}</h3>
                <p className="text-xs uppercase tracking-[0.3em] text-primary/70">{algo.weight}</p>
              </header>
              <p className="text-sm text-slate-300">{algo.description}</p>
              <p className="text-xs text-slate-500">{algo.accuracy}</p>
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-3 text-xs text-slate-400">
                {isLoading ? (
                  <p>读取历史表现中…</p>
                ) : stats ? (
                  <dl className="space-y-1">
                    <div className="flex items-center justify-between">
                      <dt>执行次数</dt>
                      <dd className="font-semibold text-white">{stats.totalRuns}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>平均置信度</dt>
                      <dd className="font-semibold text-white">{stats.avgConfidence}%</dd>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <dt>最近运行</dt>
                      <dd>{stats.lastRunAt ? new Date(stats.lastRunAt).toLocaleString() : '—'}</dd>
                    </div>
                  </dl>
                ) : (
                  <p>暂无执行记录</p>
                )}
              </div>
              <button className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white">
                设为默认
              </button>
            </article>
          );
        })}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
        <h3 className="text-base font-semibold text-white">算法运行记录 (预留)</h3>
        <p className="mt-2 text-xs text-slate-500">
          系统将记录预测时间、使用数据量和耗时，用于后续性能监控与优化。
        </p>
      </div>
    </section>
  );
}
