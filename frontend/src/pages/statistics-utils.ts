/**
 * @fileoverview statistics-utils.ts
 * @module frontend/src/pages/statistics-utils
 *
 * Input:
//   - (no external imports)
 *
 * Output:
//   - getTopEntries
//   - createRedChartOption
//   - createBlueChartOption
//   - createTrendChartOption
//   - createHeatmapChartOption
//   - createAlgorithmRadarOption
//   - createPredictionHistoryOption
 *
 * Pos: frontend/src/pages/statistics-utils.ts
 */

import type { EChartsOption } from 'echarts';
import type {
  FrequencyEntry,
  FrequencyStatsResponse,
  TrendPoint,
  LotteryDraw,
  AlgorithmInfo,
  PredictionResult,
} from '../lib/api';

export function getTopEntries(entries: FrequencyEntry[], take: number) {
  return [...entries]
    .sort((a, b) => {
      if (b.count === a.count) {
        return a.number - b.number;
      }
      return b.count - a.count;
    })
    .slice(0, take);
}

export function createRedChartOption(stats?: FrequencyStatsResponse): EChartsOption | undefined {
  if (!stats || stats.redFrequency.length === 0) {
    return undefined;
  }

  const categories = stats.redFrequency.map((item) => item.number.toString().padStart(2, '0'));
  const values = stats.redFrequency.map((item) => item.count);

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#0f172a',
      borderColor: '#1e293b',
      textStyle: { color: '#f8fafc' },
    },
    grid: { left: 32, right: 16, bottom: 24, top: 32, containLabel: true },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#475569' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      {
        name: '出现次数',
        type: 'bar',
        data: values,
        itemStyle: {
          color: '#f87171',
        },
      },
    ],
  };
}

export function createBlueChartOption(stats?: FrequencyStatsResponse): EChartsOption | undefined {
  if (!stats || stats.blueFrequency.length === 0) {
    return undefined;
  }

  const data = stats.blueFrequency
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: item.number.toString().padStart(2, '0'),
      value: item.count,
    }));

  if (data.length === 0) {
    return undefined;
  }

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#0f172a',
      borderColor: '#1e293b',
      textStyle: { color: '#f8fafc' },
      formatter: '{b} : {c} 次 ({d}%)',
    },
    legend: {
      bottom: 0,
      left: 'center',
      textStyle: { color: '#94a3b8', fontSize: 11 },
    },
    series: [
      {
        name: '蓝球出现次数',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        itemStyle: {
          borderRadius: 6,
          borderColor: '#0f172a',
          borderWidth: 2,
        },
        label: {
          color: '#e2e8f0',
          formatter: '{b}\n{d}%',
        },
        data,
      },
    ],
  };
}

export function createTrendChartOption(points: TrendPoint[] | undefined): EChartsOption | undefined {
  if (!points || points.length === 0) {
    return undefined;
  }

  const categories = points.map((item) => item.period);

  const series = Array.from({ length: 6 }, (_, index) => ({
    name: `红球${index + 1}`,
    type: 'line',
    smooth: true,
    data: points.map((item) => item.redBalls[index] ?? null),
  })) as EChartsOption['series'];

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      backgroundColor: '#0f172a',
      borderColor: '#1e293b',
      textStyle: { color: '#f8fafc' },
    },
    legend: {
      textStyle: { color: '#94a3b8' },
    },
    grid: { left: 32, right: 24, bottom: 32, top: 36, containLabel: true },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { color: '#94a3b8', rotate: 45 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } },
      min: 0,
      max: 33,
    },
    series,
  };
}

/**
 * Create heatmap chart option for number appearance patterns
 * Shows which red ball numbers appeared in recent draws
 *
 * @param historicalData - Array of lottery draws (ordered by period descending)
 * @param limit - Number of recent periods to display (default: 30)
 * @returns ECharts heatmap option or undefined if no data
 */
export function createHeatmapChartOption(
  historicalData: LotteryDraw[] | undefined,
  limit: number = 30
): EChartsOption | undefined {
  if (!historicalData || historicalData.length === 0) {
    return undefined;
  }

  // Take only the most recent draws (already sorted desc from API)
  const recentDraws = historicalData.slice(0, limit);

  // Create heatmap data: [periodIndex, ballNumber, appeared]
  // periodIndex: 0 = most recent, limit-1 = oldest
  // ballNumber: 0-32 (representing balls 1-33)
  // appeared: 1 if ball appeared, 0 if not
  const heatmapData: [number, number, number][] = [];

  recentDraws.forEach((draw, periodIndex) => {
    for (let ballNum = 1; ballNum <= 33; ballNum++) {
      const appeared = draw.redBalls.includes(ballNum) ? 1 : 0;
      heatmapData.push([periodIndex, ballNum - 1, appeared]);
    }
  });

  // Prepare x-axis labels (period strings)
  const periodLabels = recentDraws.map((draw) => draw.period);

  // Prepare y-axis labels (ball numbers 01-33)
  const ballLabels = Array.from({ length: 33 }, (_, i) => (i + 1).toString().padStart(2, '0'));

  return {
    tooltip: {
      position: 'top',
      backgroundColor: '#0f172a',
      borderColor: '#1e293b',
      textStyle: { color: '#f8fafc' },
      formatter: (params: any) => {
        const periodIdx = params.data[0];
        const ballIdx = params.data[1];
        const appeared = params.data[2];
        const period = periodLabels[periodIdx];
        const ballNum = ballLabels[ballIdx];
        return `期号: ${period}<br/>红球: ${ballNum}<br/>${appeared ? '✓ 出现' : '✗ 未出现'}`;
      },
    },
    grid: {
      left: 60,
      right: 24,
      bottom: 80,
      top: 24,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: periodLabels,
      splitArea: {
        show: true,
        areaStyle: {
          color: ['#1e293b', '#0f172a'],
        },
      },
      axisLabel: {
        color: '#94a3b8',
        rotate: 45,
        fontSize: 10,
      },
      axisLine: {
        lineStyle: { color: '#475569' },
      },
    },
    yAxis: {
      type: 'category',
      data: ballLabels,
      splitArea: {
        show: true,
        areaStyle: {
          color: ['#1e293b', '#0f172a'],
        },
      },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 10,
      },
      axisLine: {
        lineStyle: { color: '#475569' },
      },
    },
    visualMap: {
      min: 0,
      max: 1,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 10,
      inRange: {
        color: ['#1e293b', '#f87171'], // Gray for absent, red for present
      },
      text: ['出现', '未出现'],
      textStyle: {
        color: '#94a3b8',
        fontSize: 11,
      },
    },
    series: [
      {
        name: '号码出现情况',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: false,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(248, 113, 113, 0.5)',
            borderColor: '#f87171',
            borderWidth: 2,
          },
        },
      },
    ],
  };
}

/**
 * Algorithm comparison dimensions and scores
 * 算法对比的五个维度评分体系
 */
interface AlgorithmScores {
  algorithm: string; // 算法名称
  accuracy: number; // 准确性 (0-100): 理论命中率和置信度
  speed: number; // 速度 (0-100): 计算速度
  stability: number; // 稳定性 (0-100): 结果一致性
  complexity: number; // 复杂度 (0-100): 模型复杂程度
  interpretability: number; // 可解释性 (0-100): 结果可理解性
}

/**
 * Predefined algorithm scores based on their characteristics
 * 基于算法特性的预定义评分
 */
const ALGORITHM_SCORES: Record<AlgorithmInfo['key'], AlgorithmScores> = {
  ensemble: {
    algorithm: '综合预测',
    accuracy: 80, // 最高准确性:融合多种算法
    speed: 65, // 中等速度:需要运行多个算法
    stability: 85, // 高稳定性:多算法平滑波动
    complexity: 75, // 较高复杂度:集成学习
    interpretability: 60, // 中等可解释:融合多种方法
  },
  frequency: {
    algorithm: '频率分析',
    accuracy: 55, // 中等准确性:基于历史频率
    speed: 95, // 最快速度:简单统计
    stability: 75, // 较高稳定性:统计规律稳定
    complexity: 30, // 最低复杂度:简单计数
    interpretability: 95, // 最高可解释:直观的频率统计
  },
  trend: {
    algorithm: '趋势分析',
    accuracy: 65, // 较好准确性:时间序列模式
    speed: 70, // 较快速度:ARIMA计算
    stability: 60, // 中等稳定性:受短期波动影响
    complexity: 60, // 中等复杂度:时间序列模型
    interpretability: 70, // 较高可解释:趋势可视化
  },
  random_forest: {
    algorithm: '随机森林',
    accuracy: 72, // 较高准确性:机器学习模型
    speed: 60, // 中等速度:需要训练多棵树
    stability: 80, // 高稳定性:集成学习抗噪
    complexity: 70, // 较高复杂度:多决策树
    interpretability: 50, // 中等偏低可解释:黑盒模型
  },
  lstm: {
    algorithm: 'LSTM神经网络',
    accuracy: 68, // 较高准确性:深度学习
    speed: 50, // 较慢速度:神经网络计算
    stability: 70, // 较高稳定性:长期记忆
    complexity: 90, // 最高复杂度:深度神经网络
    interpretability: 40, // 较低可解释:深度学习黑盒
  },
};

const ALGORITHM_COLORS: Record<AlgorithmInfo['key'], string> = {
  ensemble: '#fbbf24',
  frequency: '#34d399',
  trend: '#60a5fa',
  random_forest: '#a78bfa',
  lstm: '#fb7185',
};

/**
 * Create radar chart option for algorithm comparison
 * 创建算法对比雷达图
 *
 * @param selectedAlgorithms - Array of algorithm keys to compare (default: all 5)
 * @returns ECharts radar option
 */
export function createAlgorithmRadarOption(
  selectedAlgorithms?: AlgorithmInfo['key'][]
): EChartsOption {
  // Use all algorithms if not specified
  const algorithmsToCompare = selectedAlgorithms ?? [
    'ensemble',
    'frequency',
    'trend',
    'random_forest',
    'lstm',
  ];

  // Prepare radar indicators (5 dimensions)
  const indicators = [
    { name: '准确性', max: 100 },
    { name: '速度', max: 100 },
    { name: '稳定性', max: 100 },
    { name: '复杂度', max: 100 },
    { name: '可解释性', max: 100 },
  ];

  // Prepare series data for each algorithm
  const seriesData = algorithmsToCompare.map((key) => {
    const scores = ALGORITHM_SCORES[key];
    return {
      name: scores.algorithm,
      value: [
        scores.accuracy,
        scores.speed,
        scores.stability,
        scores.complexity,
        scores.interpretability,
      ],
    };
  });

  // Color mapping for different algorithms
  const colorMap: Record<string, string> = {
    '综合预测': '#f59e0b', // Amber
    '频率分析': '#10b981', // Green
    '趋势分析': '#3b82f6', // Blue
    '随机森林': '#8b5cf6', // Purple
    'LSTM神经网络': '#ec4899', // Pink
  };

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#0f172a',
      borderColor: '#1e293b',
      textStyle: { color: '#f8fafc' },
      formatter: (params: any) => {
        const data = params.data;
        return `
          <strong>${data.name}</strong><br/>
          准确性: ${data.value[0]}<br/>
          速度: ${data.value[1]}<br/>
          稳定性: ${data.value[2]}<br/>
          复杂度: ${data.value[3]}<br/>
          可解释性: ${data.value[4]}
        `;
      },
    },
    legend: {
      bottom: 10,
      textStyle: {
        color: '#94a3b8',
        fontSize: 11,
      },
      itemWidth: 12,
      itemHeight: 12,
    },
    radar: {
      indicator: indicators,
      shape: 'polygon',
      center: ['50%', '50%'],
      radius: '65%',
      axisName: {
        color: '#e2e8f0',
        fontSize: 12,
        fontWeight: 500,
      },
      splitArea: {
        areaStyle: {
          color: ['#1e293b', '#0f172a'],
          opacity: 0.6,
        },
      },
      axisLine: {
        lineStyle: {
          color: '#475569',
        },
      },
      splitLine: {
        lineStyle: {
          color: '#475569',
        },
      },
    },
    series: [
      {
        name: '算法对比',
        type: 'radar',
        data: seriesData.map((item) => ({
          ...item,
          lineStyle: {
            width: 2,
            color: colorMap[item.name] || '#94a3b8',
          },
          areaStyle: {
            opacity: 0.2,
            color: colorMap[item.name] || '#94a3b8',
          },
          itemStyle: {
            color: colorMap[item.name] || '#94a3b8',
          },
        })),
      },
    ],
  };
}

export function createPredictionHistoryOption(
  history: PredictionResult[] | undefined,
  algorithmFilter: AlgorithmInfo['key'] | 'all' = 'all'
): EChartsOption | undefined {
  if (!history || history.length === 0) {
    return undefined;
  }

  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime()
  );
  const filtered =
    algorithmFilter === 'all' ? sortedHistory : sortedHistory.filter((item) => item.algorithm === algorithmFilter);

  if (filtered.length === 0) {
    return undefined;
  }

  const averageConfidence = filtered.reduce((sum, item) => sum + item.confidence, 0) / filtered.length;

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#0f172a',
      borderColor: '#1e293b',
      textStyle: { color: '#f8fafc' },
      formatter: (params: any) => {
        const value = params.value;
        const date = new Date(value[0]);
        return `
          <div>
            <strong>${formatDate(date)}</strong><br/>
            置信度：${value[1].toFixed(1)} 分<br/>
            使用期数：${value[2]}<br/>
            算法：${params.data.algorithmName}
          </div>
        `;
      },
    },
    grid: { left: 48, right: 24, bottom: 40, top: 24 },
    xAxis: {
      type: 'time',
      axisLabel: {
        color: '#94a3b8',
        formatter: (value: number) => formatDate(new Date(value)),
      },
      axisLine: { lineStyle: { color: '#475569' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      min: 40,
      max: 100,
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    visualMap: {
      show: false,
      dimension: 2,
      min: Math.min(...filtered.map((item) => item.datasetSize)),
      max: Math.max(...filtered.map((item) => item.datasetSize)),
    },
    series: [
      {
        type: 'scatter',
        symbolSize: (value: number[]) => Math.min(32, Math.max(12, value[2] / 10)),
        itemStyle: {
          color: (params: any) => ALGORITHM_COLORS[params.data.algorithmKey as AlgorithmInfo['key']] || '#cbd5f5',
          shadowBlur: 12,
          shadowColor: 'rgba(15, 23, 42, 0.5)',
        },
        data: filtered.map((item) => ({
          value: [new Date(item.generatedAt).getTime(), item.confidence, item.datasetSize],
          algorithmKey: item.algorithm,
          algorithmName: ALGORITHM_SCORES[item.algorithm]?.algorithm ?? item.algorithm,
        })),
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#f97316', type: 'dashed' },
          data: [
            {
              yAxis: averageConfidence,
              label: {
                formatter: `平均置信度 ${averageConfidence.toFixed(1)} 分`,
                color: '#f97316',
              },
            },
          ],
        },
      },
    ],
  };
}

function formatDate(date: Date) {
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}
