/**
 * @fileoverview HistoryPage.tsx
 * @module frontend/src/pages/HistoryPage
 *
 * Input:
//   - ../lib/api
 *
 * Output:
//   - HistoryPage
 *
 * Pos: frontend/src/pages/HistoryPage.tsx
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchLotteryDraws,
  fetchLotteryStats,
  deleteLotteryDraw,
  type LotteryDraw,
} from '../lib/api';

export function HistoryPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  // Fetch lottery data
  const { data: drawsData, isLoading: drawsLoading } = useQuery({
    queryKey: ['lottery-draws', page, pageSize],
    queryFn: () => fetchLotteryDraws({ page, pageSize, sortBy: 'drawDate', sortOrder: 'desc' }),
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ['lottery-stats'],
    queryFn: fetchLotteryStats,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteLotteryDraw,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lottery-draws'] });
      queryClient.invalidateQueries({ queryKey: ['lottery-stats'] });
    },
  });

  const handleDelete = (period: string) => {
    if (confirm(`确定要删除期号 ${period} 的记录吗?`)) {
      deleteMutation.mutate(period);
    }
  };

  const draws = drawsData?.data || [];
  const pagination = drawsData?.pagination;

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h2 className="text-2xl font-semibold text-white">历史数据管理</h2>
        <p className="text-sm text-slate-300">
          查看双色球历史开奖记录。数据已自动从官方网站同步。
        </p>
      </header>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-6 md:grid-cols-3">
          <StatCard
            title="总开奖期数"
            value={stats.totalDraws.toString()}
            description={`从 ${stats.dateRange?.from ? new Date(stats.dateRange.from).toLocaleDateString() : '未知'} 至今`}
          />
          <StatCard
            title="最新期号"
            value={stats.latestDraw?.period || '—'}
            description={stats.latestDraw?.drawDate ? new Date(stats.latestDraw.drawDate).toLocaleDateString() : '暂无数据'}
          />
          <StatCard
            title="数据来源"
            value={stats.latestDraw?.source || '—'}
            description="最近一期数据导入方式"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Data Table */}
        <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl shadow-slate-950/30">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">开奖记录</h3>
            {pagination && (
              <span className="text-xs text-slate-400">
                第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 条
              </span>
            )}
          </div>

          {drawsLoading ? (
            <div className="py-12 text-center text-sm text-slate-400">加载中...</div>
          ) : draws.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 py-12 text-center">
              <p className="text-sm text-slate-400">暂无历史数据</p>
              <p className="mt-2 text-xs text-slate-500">请使用右侧功能导入数据</p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-slate-800">
                <table className="min-w-full divide-y divide-slate-800 text-sm">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left">期号</th>
                      <th className="px-4 py-3 text-left">开奖日期</th>
                      <th className="px-4 py-3 text-left">红球</th>
                      <th className="px-4 py-3 text-left">蓝球</th>
                      <th className="px-4 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 bg-slate-950/60 text-slate-200">
                    {draws.map((draw) => (
                      <DrawRow key={draw.id} draw={draw} onDelete={handleDelete} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <span className="text-sm text-slate-400">
                    {page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  description: string;
}

function StatCard({ title, value, description }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl shadow-slate-950/30">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

/* eslint-disable no-unused-vars */
interface DrawRowProps {
  draw: LotteryDraw;
  onDelete: (period: string) => void;
}
/* eslint-enable no-unused-vars */

function DrawRow({ draw, onDelete }: DrawRowProps) {
  return (
    <tr className="hover:bg-slate-900/40">
      <td className="px-4 py-3 font-semibold">{draw.period}</td>
      <td className="px-4 py-3 text-slate-300">
        {new Date(draw.drawDate).toLocaleDateString('zh-CN')}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {draw.redBalls.map((num, idx) => (
            <span
              key={idx}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-xs font-semibold text-white"
            >
              {num.toString().padStart(2, '0')}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-600 text-xs font-semibold text-white">
          {draw.blueBall.toString().padStart(2, '0')}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onDelete(draw.period)}
          className="text-xs text-red-400 transition hover:text-red-300"
        >
          删除
        </button>
      </td>
    </tr>
  );
}
