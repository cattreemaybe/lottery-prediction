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

import { useState, useRef, type ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchLotteryDraws,
  fetchLotteryStats,
  importLotteryFile,
  downloadExcelTemplate,
  downloadCsvTemplate,
  deleteLotteryDraw,
  type LotteryDraw,
} from '../lib/api';

export function HistoryPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'replace' | 'error'>('skip');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    skipped: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);

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

  // Import mutation
  const importMutation = useMutation({
    mutationFn: (file: File) => importLotteryFile(file, duplicateStrategy),
    onSuccess: (data) => {
      setImportResult(data.data);
      setUploadError(null);
      queryClient.invalidateQueries({ queryKey: ['lottery-draws'] });
      queryClient.invalidateQueries({ queryKey: ['lottery-stats'] });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error) => {
      setUploadError(error instanceof Error ? error.message : '上传失败');
      setImportResult(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteLotteryDraw,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lottery-draws'] });
      queryClient.invalidateQueries({ queryKey: ['lottery-stats'] });
    },
  });

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(fileExt || '')) {
      setUploadError('只支持 .xlsx, .xls, .csv 格式文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('文件大小不能超过 10MB');
      return;
    }

    importMutation.mutate(file);
  };

  const handleDelete = (period: string) => {
    if (confirm(`确定要删除期号 ${period} 的记录吗?`)) {
      deleteMutation.mutate(period);
    }
  };

  const draws = drawsData?.data || [];
  const pagination = drawsData?.pagination;
  const isUploading = importMutation.isPending;

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h2 className="text-2xl font-semibold text-white">历史数据管理</h2>
        <p className="text-sm text-slate-300">
          导入或查看双色球历史开奖记录。支持 Excel 和 CSV 格式导入,自动检测重复期号。
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

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Import Section */}
          <div className="rounded-3xl border border-dashed border-primary/60 bg-primary/5 p-6 text-sm text-slate-200">
            <h3 className="text-base font-semibold text-white">导入历史数据</h3>
            <p className="mt-2 text-xs text-slate-300">
              支持 .xlsx / .xls / .csv 文件，单文件不超过 10MB
            </p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs text-slate-400">重复处理策略</span>
                <select
                  value={duplicateStrategy}
                  onChange={(e) => setDuplicateStrategy(e.target.value as 'skip' | 'replace' | 'error')}
                  className="mt-1 w-full rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="skip">跳过重复期号</option>
                  <option value="replace">替换已有数据</option>
                  <option value="error">遇到重复则报错</option>
                </select>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full rounded-full bg-primary/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploading ? '上传中...' : '选择文件上传'}
              </button>
            </div>

            {/* Upload Result */}
            {uploadError && (
              <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-100">
                <p className="font-semibold">上传失败</p>
                <p className="mt-1">{uploadError}</p>
              </div>
            )}

            {importResult && (
              <div className="mt-4 rounded-2xl border border-green-500/40 bg-green-500/10 p-3 text-xs text-green-100">
                <p className="font-semibold">导入完成</p>
                <ul className="mt-2 space-y-1">
                  <li>✓ 成功导入: {importResult.inserted} 条</li>
                  {importResult.skipped > 0 && <li>⊘ 跳过重复: {importResult.skipped} 条</li>}
                  {importResult.errors.length > 0 && (
                    <li className="text-yellow-200">⚠ 错误: {importResult.errors.length} 条</li>
                  )}
                </ul>
                {importResult.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-yellow-200">查看错误详情</summary>
                    <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-[11px]">
                      {importResult.errors.slice(0, 10).map((err) => (
                        <li key={err.row}>
                          第 {err.row} 行: {err.error}
                        </li>
                      ))}
                      {importResult.errors.length > 10 && (
                        <li className="text-slate-400">... 还有 {importResult.errors.length - 10} 条错误</li>
                      )}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>

          {/* Template Download */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300">
            <h3 className="text-base font-semibold text-white">下载数据模板</h3>
            <p className="mt-2 text-xs text-slate-400">
              模板包含示例数据和字段说明，帮助您快速准备导入文件
            </p>
            <div className="mt-4 space-y-2">
              <button
                onClick={downloadExcelTemplate}
                className="w-full rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
              >
                下载 Excel 模板
              </button>
              <button
                onClick={downloadCsvTemplate}
                className="w-full rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
              >
                下载 CSV 模板
              </button>
            </div>
          </div>
        </aside>
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
