import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import type { FrequencyEntry, FrequencyStatsResponse, TrendPoint } from '../src/lib/api';
import { EChart } from '../src/components/charts/EChart.tsx';
import { createBlueChartOption, createRedChartOption, createTrendChartOption, getTopEntries } from '../src/pages/statistics-utils.ts';

type TestCase = {
  name: string;
  fn: () => void | Promise<void>;
};

const redFrequency: FrequencyEntry[] = [
  { number: 1, count: 2, percentage: 10 },
  { number: 2, count: 6, percentage: 30 },
  { number: 3, count: 6, percentage: 30 },
  { number: 4, count: 0, percentage: 0 },
];

const blueFrequency: FrequencyEntry[] = [
  { number: 1, count: 0, percentage: 0 },
  { number: 2, count: 4, percentage: 40 },
  { number: 3, count: 2, percentage: 20 },
];

const sampleStats: FrequencyStatsResponse = {
  datasetSize: 50,
  requestedRange: 100,
  redFrequency,
  blueFrequency,
  hotNumbers: redFrequency.slice(0, 2),
  coldNumbers: redFrequency.slice(-2),
  dateRange: null,
  generatedAt: new Date().toISOString(),
};

const trendPoints: TrendPoint[] = [
  { period: '2024001', drawDate: new Date('2024-01-01').toISOString(), redBalls: [2, 10, 18, 22, 30, 33], blueBall: 5 },
  { period: '2024002', drawDate: new Date('2024-01-03').toISOString(), redBalls: [3, 9, 12, 18, 25, 30], blueBall: 8 },
  { period: '2024003', drawDate: new Date('2024-01-05').toISOString(), redBalls: [1, 8, 16, 22, 27, 33], blueBall: 12 },
];

const tests: TestCase[] = [
  {
    name: 'getTopEntries sorts by descending count and respects limit',
    fn: () => {
      const result = getTopEntries(redFrequency, 3);
      assert.equal(result.length, 3);
      assert.deepEqual(
        result.map((entry) => entry.number),
        [2, 3, 1],
      );
    },
  },
  {
    name: 'createRedChartOption generates bar chart data',
    fn: () => {
      const option = createRedChartOption(sampleStats);
      assert.ok(option, 'Should return chart option');
      const categories = (option?.xAxis as { data: string[] }).data;
      assert.equal(categories.length, redFrequency.length);
      const series = option?.series as Array<{ data: number[] }>;
      assert.deepEqual(series[0].data, redFrequency.map((entry) => entry.count));
    },
  },
  {
    name: 'createBlueChartOption filters zero-count entries',
    fn: () => {
      const option = createBlueChartOption(sampleStats);
      assert.ok(option, 'Should return option when blue frequency exists');
      const series = option?.series as Array<{ data: Array<{ name: string }> }>;
      assert.deepEqual(
        series[0].data.map((item) => item.name),
        ['02', '03'],
      );
    },
  },
  {
    name: 'createTrendChartOption builds multi-series lines',
    fn: () => {
      const option = createTrendChartOption(trendPoints);
      assert.ok(option);
      const series = option?.series as Array<{ data: Array<number | null> }>;
      assert.equal(series.length, 6);
      assert.deepEqual(series[0].data, trendPoints.map((point) => point.redBalls[0]));
    },
  },
  {
    name: 'EChart renders fallback markup when no option is provided',
    fn: () => {
      const markup = renderToStaticMarkup(createElement(EChart, { emptyText: '暂无数据' }));
      assert.match(markup, /暂无数据/);
    },
  },
];

async function run() {
  let failed = 0;
  for (const testCase of tests) {
    try {
      await testCase.fn();
      console.log(`✓ ${testCase.name}`);
    } catch (error) {
      failed++;
      console.error(`✗ ${testCase.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} test(s) failed`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
