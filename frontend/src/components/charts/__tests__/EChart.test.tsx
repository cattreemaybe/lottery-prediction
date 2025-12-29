import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EChart } from '../EChart';
import type { EChartsOption } from 'echarts';

// Mock echarts
vi.mock('echarts/core', () => ({
  use: vi.fn(),
  init: vi.fn(() => ({
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    clear: vi.fn(),
  })),
}));

describe('EChart Component', () => {
  it('显示加载状态', () => {
    render(<EChart loading={true} height={300} />);
    expect(screen.getByText('加载中…')).toBeInTheDocument();
  });

  it('显示空状态并使用自定义文本', () => {
    render(<EChart option={undefined} height={300} emptyText="无数据可显示" />);
    expect(screen.getByText('无数据可显示')).toBeInTheDocument();
  });

  it('显示默认空状态文本', () => {
    render(<EChart option={undefined} height={300} />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('使用指定高度渲染容器', () => {
    const option: EChartsOption = {
      series: [{ type: 'bar', data: [1, 2, 3] }],
    };

    const { container } = render(<EChart option={option} height={400} />);
    const chartDiv = container.querySelector('div[style*="height"]');

    expect(chartDiv).toBeInTheDocument();
    expect(chartDiv).toHaveStyle({ height: '400px' });
  });

  it('有option时即使loading=true也渲染图表', () => {
    const option: EChartsOption = {
      series: [{ type: 'bar', data: [1, 2, 3] }],
    };

    const { container } = render(<EChart option={option} loading={true} height={300} />);

    // 有option时优先渲染图表,不显示加载文本
    expect(screen.queryByText('加载中…')).not.toBeInTheDocument();
    const chartDiv = container.querySelector('div[style*="height"]');
    expect(chartDiv).toBeInTheDocument();
  });

  it('空状态容器有正确样式', () => {
    const { container } = render(<EChart option={undefined} height={300} />);

    const emptyContainer = container.querySelector('.border-dashed');
    expect(emptyContainer).toBeInTheDocument();
    expect(emptyContainer).toHaveTextContent('暂无数据');
  });
});
