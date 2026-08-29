import { describe, expect, it } from 'vitest';
import {
  buildWorkerLabelOptions,
  loadWorkerLabelOptions
} from './worker-label-options';

describe('Worker 标签候选项', () => {
  it('按键汇总多个 Worker 的值并去重排序', () => {
    expect(
      buildWorkerLabelOptions([
        { name: 'worker-b', labels: { zone: 'shanghai', gpu: 'a100' } },
        { name: 'worker-a', labels: { zone: 'beijing', gpu: 'a100' } },
        { name: 'worker-a', labels: { zone: 'beijing', os: 'linux' } }
      ])
    ).toEqual({
      gpu: ['a100'],
      os: ['linux'],
      'worker-name': ['worker-a', 'worker-b'],
      zone: ['beijing', 'shanghai']
    });
  });

  it('加载全部 Worker 分页后再生成候选项', async () => {
    const request = async (page: number, perPage: number) => ({
      items:
        page === 1
          ? [{ name: 'worker-a', labels: { zone: 'beijing' } }]
          : [{ name: 'worker-b', labels: { zone: 'shanghai', gpu: 'h100' } }],
      pagination: {
        page,
        perPage,
        total: 2,
        totalPage: 2
      }
    });

    await expect(loadWorkerLabelOptions(request)).resolves.toEqual({
      gpu: ['h100'],
      'worker-name': ['worker-a', 'worker-b'],
      zone: ['beijing', 'shanghai']
    });
  });
});
