/**
 * @fileoverview main.tsx
 * @module frontend/src/main
 *
 * Input:
//   - ./routes/router
//   - ./components/ErrorBoundary
 *
 * Output:
//   - (no exports)
 *
 * Pos: frontend/src/main.tsx
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import './styles/index.css';
import { router } from './routes/router';
import { ErrorBoundary } from './components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary
      onError={({ error, errorInfo }) => {
        // 在生产环境中,可以将错误发送到日志服务
        console.error('应用错误:', error, errorInfo);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
