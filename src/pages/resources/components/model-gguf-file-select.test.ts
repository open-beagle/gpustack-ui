import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearOwnedGgufPatterns, groupGgufFiles } from '../config/model-gguf';
import ModelGgufFileSelect from './model-gguf-file-select';

const api = vi.hoisted(() => ({
  queryHuggingfaceModelFiles: vi.fn(),
  queryModelScopeModelFiles: vi.fn()
}));

vi.mock('@umijs/max', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id })
}));

vi.mock('@/pages/llmodels/apis', () => api);

beforeEach(() => {
  vi.clearAllMocks();
  api.queryHuggingfaceModelFiles.mockResolvedValue([]);
  api.queryModelScopeModelFiles.mockResolvedValue({ Data: { Files: [] } });
});

describe('GGUF 文件映射', () => {
  it('显示量化并把同一模型分片映射为精确 include pattern', () => {
    expect(
      groupGgufFiles([
        { path: 'weights/model-Q4_K_M-00001-of-00002.gguf', size: 10 },
        { path: 'weights/model-Q4_K_M-00002-of-00002.gguf', size: 20 },
        { path: 'weights/model-Q8_0.gguf', size: 40 }
      ])
    ).toEqual([
      {
        pattern: 'weights/model-Q4_K_M-*.gguf',
        quantization: 'Q4_K_M',
        size: 30
      },
      {
        pattern: 'weights/model-Q8_0.gguf',
        quantization: 'Q8_0',
        size: 40
      }
    ]);
  });

  it('只清理选择器自己写入且仍未被用户修改的旧 pattern', () => {
    const selected = ['weights/model-a-Q4_K_M.gguf'];
    expect(clearOwnedGgufPatterns(selected, selected)).toEqual([]);
    expect(clearOwnedGgufPatterns(['manual/*.gguf'], selected)).toEqual([
      'manual/*.gguf'
    ]);
    expect(clearOwnedGgufPatterns(selected, undefined)).toEqual(selected);
  });

  it('Hugging Face 文件请求携带当前 revision', async () => {
    render(
      React.createElement(ModelGgufFileSelect, {
        source: 'huggingface',
        modelId: 'org/model',
        revision: 'feature/quantized'
      })
    );

    await waitFor(() =>
      expect(api.queryHuggingfaceModelFiles).toHaveBeenCalledWith(
        { repo: 'org/model', revision: 'feature/quantized' },
        { signal: expect.any(AbortSignal) }
      )
    );
  });
});
