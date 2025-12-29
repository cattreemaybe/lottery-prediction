/**
 * @fileoverview EChart.tsx
 * @module frontend/src/components/charts/EChart
 *
 * Input:
//   - (no external imports)
 *
 * Output:
//   - EChart
 *
 * Pos: frontend/src/components/charts/EChart.tsx
 */

import { useEffect, useRef } from 'react';
import type { EChartsOption } from 'echarts';
import type { EChartsType } from 'echarts/core';
import * as echarts from 'echarts/core';
import { BarChart, PieChart, LineChart, HeatmapChart, RadarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  VisualMapComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Register all required ECharts components
echarts.use([
  BarChart,
  PieChart,
  LineChart,
  HeatmapChart,
  RadarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  VisualMapComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

export interface EChartProps {
  option?: EChartsOption;
  height?: number;
  loading?: boolean;
  emptyText?: string;
}

export function EChart({ option, height = 320, loading = false, emptyText = '暂无数据' }: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    chartRef.current = echarts.init(containerRef.current);

    const handleResize = () => {
      chartRef.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!option) {
      chartRef.current.clear();
      return;
    }
    chartRef.current.setOption(option, true);
  }, [option]);

  if (!option) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-dashed border-slate-700 text-sm text-slate-500"
        style={{ height }}
      >
        {loading ? '加载中…' : emptyText}
      </div>
    );
  }

  return <div ref={containerRef} style={{ height }} />;
}
