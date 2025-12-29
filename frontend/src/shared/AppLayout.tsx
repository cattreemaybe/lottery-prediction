/**
 * @fileoverview AppLayout.tsx
 * @module frontend/src/shared/AppLayout
 *
 * Input:
//   - (no external imports)
 *
 * Output:
//   - AppLayout
 *
 * Pos: frontend/src/shared/AppLayout.tsx
 */

import { Outlet, NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: '首页概览' },
  { to: '/history', label: '历史数据' },
  { to: '/predict', label: '号码预测' },
  { to: '/statistics', label: '统计分析' },
  { to: '/algorithms', label: '算法管理' }
];

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">双色球预测分析平台</h1>
            <p className="text-sm text-slate-400">
              彩票号码完全随机，预测结果仅供参考学习，请理性购彩，量力而行。
            </p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 font-medium transition-colors hover:bg-slate-800 hover:text-white ${
                    isActive ? 'bg-primary/90 text-white shadow-lg shadow-primary/30' : 'text-slate-300'
                  }`
                }
                end={item.to === '/'}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} 双色球预测分析平台 · 数据仅供学习和统计分析使用</span>
          <div className="flex flex-wrap gap-4">
            <a className="hover:text-slate-300" href="#" aria-label="用户协议">
              用户协议
            </a>
            <a className="hover:text-slate-300" href="#" aria-label="隐私政策">
              隐私政策
            </a>
            <a className="hover:text-slate-300" href="#" aria-label="免责声明">
              免责声明
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
