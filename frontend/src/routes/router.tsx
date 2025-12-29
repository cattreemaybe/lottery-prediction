/**
 * @fileoverview router.tsx
 * @module frontend/src/routes/router
 *
 * Input:
//   - ../shared/AppLayout
//   - ../pages/DashboardPage
//   - ../pages/HistoryPage
//   - ../pages/PredictPage
//   - ../pages/StatisticsPage
//   - ../pages/AlgorithmsPage
//   - ../shared/ErrorPage
 *
 * Output:
//   - router
 *
 * Pos: frontend/src/routes/router.tsx
 */

import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../shared/AppLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { HistoryPage } from '../pages/HistoryPage';
import { PredictPage } from '../pages/PredictPage';
import { StatisticsPage } from '../pages/StatisticsPage';
import { AlgorithmsPage } from '../pages/AlgorithmsPage';
import { ErrorPage } from '../shared/ErrorPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'predict', element: <PredictPage /> },
      { path: 'statistics', element: <StatisticsPage /> },
      { path: 'algorithms', element: <AlgorithmsPage /> }
    ]
  }
]);
