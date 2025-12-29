import { describe, it, expect } from 'vitest';
import {
  getTopEntries,
  createRedChartOption,
  createHeatmapChartOption,
  createAlgorithmRadarOption,
} from '../statistics-utils';
import type { FrequencyEntry, FrequencyStatsResponse, LotteryDraw } from '../../lib/api';

describe('statistics-utils', () => {
  describe('getTopEntries', () => {
    it('返回指定数量的最高频率条目', () => {
      const entries: FrequencyEntry[] = [
        { number: 1, count: 10, percentage: 50 },
        { number: 2, count: 8, percentage: 40 },
        { number: 3, count: 6, percentage: 30 },
        { number: 4, count: 4, percentage: 20 },
      ];

      const result = getTopEntries(entries, 2);

      expect(result).toHaveLength(2);
      expect(result[0].number).toBe(1);
      expect(result[1].number).toBe(2);
    });

    it('按计数降序排列', () => {
      const entries: FrequencyEntry[] = [
        { number: 1, count: 5, percentage: 25 },
        { number: 2, count: 10, percentage: 50 },
        { number: 3, count: 8, percentage: 40 },
      ];

      const result = getTopEntries(entries, 3);

      expect(result[0].count).toBe(10);
      expect(result[1].count).toBe(8);
      expect(result[2].count).toBe(5);
    });

    it('相同计数时按号码升序排列', () => {
      const entries: FrequencyEntry[] = [
        { number: 5, count: 10, percentage: 50 },
        { number: 2, count: 10, percentage: 50 },
        { number: 8, count: 10, percentage: 50 },
      ];

      const result = getTopEntries(entries, 3);

      expect(result[0].number).toBe(2);
      expect(result[1].number).toBe(5);
      expect(result[2].number).toBe(8);
    });
  });

  describe('createRedChartOption', () => {
    it('返回undefined当无数据时', () => {
      const stats: FrequencyStatsResponse = {
        datasetSize: 0,
        requestedRange: 100,
        redFrequency: [],
        blueFrequency: [],
        hotNumbers: [],
        coldNumbers: [],
        dateRange: null,
        generatedAt: new Date().toISOString(),
      };

      const result = createRedChartOption(stats);
      expect(result).toBeUndefined();
    });

    it('生成有效的柱状图配置', () => {
      const stats: FrequencyStatsResponse = {
        datasetSize: 100,
        requestedRange: 100,
        redFrequency: [
          { number: 1, count: 10, percentage: 10 },
          { number: 2, count: 8, percentage: 8 },
        ],
        blueFrequency: [],
        hotNumbers: [],
        coldNumbers: [],
        dateRange: { from: '2024-01-01', to: '2024-12-31' },
        generatedAt: new Date().toISOString(),
      };

      const result = createRedChartOption(stats);

      expect(result).toBeDefined();
      expect(result?.xAxis).toBeDefined();
      expect(result?.yAxis).toBeDefined();
      expect(result?.series).toBeDefined();
    });
  });

  describe('createHeatmapChartOption', () => {
    it('返回undefined当无数据时', () => {
      const result = createHeatmapChartOption(undefined, 30);
      expect(result).toBeUndefined();
    });

    it('返回undefined当数据为空数组时', () => {
      const result = createHeatmapChartOption([], 30);
      expect(result).toBeUndefined();
    });

    it('生成正确的热力图数据点数量', () => {
      const draws: LotteryDraw[] = [
        {
          id: '1',
          period: '2024001',
          drawDate: '2024-01-01',
          redBalls: [1, 5, 10, 15, 20, 25],
          blueBall: 8,
          source: 'test',
          importedAt: '2024-01-01',
        },
        {
          id: '2',
          period: '2024002',
          drawDate: '2024-01-02',
          redBalls: [2, 6, 11, 16, 21, 26],
          blueBall: 9,
          source: 'test',
          importedAt: '2024-01-02',
        },
      ];

      const result = createHeatmapChartOption(draws, 2);

      expect(result).toBeDefined();
      expect(result?.series).toBeDefined();

      // 2期 × 33号码 = 66个数据点
      const heatmapSeries = result?.series as any[];
      expect(heatmapSeries[0].data).toHaveLength(66);
    });

    it('正确标记号码出现状态', () => {
      const draws: LotteryDraw[] = [
        {
          id: '1',
          period: '2024001',
          drawDate: '2024-01-01',
          redBalls: [1, 2, 3, 4, 5, 6],
          blueBall: 8,
          source: 'test',
          importedAt: '2024-01-01',
        },
      ];

      const result = createHeatmapChartOption(draws, 1);
      const heatmapSeries = result?.series as any[];
      const data = heatmapSeries[0].data as [number, number, number][];

      // 检查号码1(索引0)出现
      const ball1Data = data.find((d) => d[1] === 0);
      expect(ball1Data?.[2]).toBe(1); // 出现

      // 检查号码10(索引9)未出现
      const ball10Data = data.find((d) => d[1] === 9);
      expect(ball10Data?.[2]).toBe(0); // 未出现
    });
  });

  describe('createAlgorithmRadarOption', () => {
    it('生成包含5种算法的雷达图', () => {
      const result = createAlgorithmRadarOption();

      expect(result).toBeDefined();
      expect(result.radar).toBeDefined();

      const series = result.series as any[];
      expect(series[0].data).toHaveLength(5); // 5种算法
    });

    it('雷达图包含5个评分维度', () => {
      const result = createAlgorithmRadarOption();
      const radar = result.radar as any;

      expect(radar.indicator).toHaveLength(5);
      expect(radar.indicator[0].name).toBe('准确性');
      expect(radar.indicator[1].name).toBe('速度');
      expect(radar.indicator[2].name).toBe('稳定性');
      expect(radar.indicator[3].name).toBe('复杂度');
      expect(radar.indicator[4].name).toBe('可解释性');
    });

    it('可以指定特定算法进行对比', () => {
      const result = createAlgorithmRadarOption(['frequency', 'ensemble']);

      const series = result.series as any[];
      expect(series[0].data).toHaveLength(2); // 只有2种算法
    });

    it('所有评分值在0-100范围内', () => {
      const result = createAlgorithmRadarOption();
      const series = result.series as any[];

      series[0].data.forEach((item: any) => {
        item.value.forEach((score: number) => {
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        });
      });
    });
  });
});
