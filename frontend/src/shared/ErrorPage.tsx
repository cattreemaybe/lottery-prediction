/**
 * @fileoverview ErrorPage.tsx
 * @module frontend/src/shared/ErrorPage
 *
 * Input:
//   - (no external imports)
 *
 * Output:
//   - ErrorPage
 *
 * Pos: frontend/src/shared/ErrorPage.tsx
 */

import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

export function ErrorPage() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const message = isRouteErrorResponse(error)
    ? error.data || '抱歉，页面发生错误。'
    : (error as Error)?.message || '未知错误，请稍后重试。';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100">
      <div className="max-w-md rounded-xl border border-slate-800 bg-slate-900/90 p-10 text-center shadow-xl shadow-slate-900/50">
        <p className="text-sm uppercase tracking-[0.3em] text-primary">错误</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">{status}</h1>
        <p className="mt-4 text-sm text-slate-300">{message}</p>
        <a
          href="/"
          className="mt-6 inline-flex items-center rounded-full bg-primary/90 px-6 py-2 text-sm font-semibold text-white transition hover:bg-primary"
        >
          返回首页
        </a>
      </div>
    </div>
  );
}
