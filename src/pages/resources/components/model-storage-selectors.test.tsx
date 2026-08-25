import { WatchEventType } from '@/config';
import useUpdateChunkedList from '@/hooks/use-update-chunk-list';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, Form } from 'antd';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MODEL_FILE_WATCH_EVENTS } from '../config/model-preheat';
import type { ModelStorageArtifact } from '../config/types';
import ArtifactSelect from './artifact-select';
import ModelFileSelect from './model-file-select';
import ModelRepositoryPicker from './model-repository-picker';
import ModelStorageAsyncState from './model-storage-async-state';
import WorkerFuzzySelect from './worker-fuzzy-select';
import WorkerUuidMultiSelect from './worker-uuid-multi-select';

const api = vi.hoisted(() => ({
  queryModelFilesList: vi.fn(),
  queryModelStorageArtifacts: vi.fn(),
  queryWorker: vi.fn(),
  queryWorkersList: vi.fn()
}));

vi.mock('@umijs/max', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id })
}));
vi.mock('../apis', async () => ({
  ...(await vi.importActual('../apis')),
  ...api
}));

const page = <T,>(items: T[], page = 1, total = items.length) => ({
  items,
  pagination: { page, perPage: 20, total, totalPage: Math.ceil(total / 20) }
});

const artifact: ModelStorageArtifact = {
  artifact_id: 'artifact-1',
  source: 'huggingface',
  model_id: 'org/model',
  resolved_revision: '1234567890abcdef',
  include_patterns: [],
  exclude_patterns: [],
  manifest_digest: 'digest',
  manifest_path: 'manifests/artifact-1.json',
  manifest_state: 'valid',
  file_count: 1,
  total_size: 1024,
  last_verified_at: '2026-08-24T00:00:00Z',
  created_by_task_id: 1,
  created_at: '2026-08-24T00:00:00Z',
  updated_at: '2026-08-24T00:00:00Z'
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe('模型存储选择器', () => {
  it('服务端选择器挂载后自动加载第一页空搜索', async () => {
    api.queryWorkersList.mockResolvedValue(page([]));
    api.queryModelFilesList.mockResolvedValue(page([]));
    api.queryModelStorageArtifacts.mockResolvedValue(page([]));
    api.queryModelStorageArtifacts.mockClear();

    render(
      <>
        <WorkerFuzzySelect value={undefined} onChange={vi.fn()} />
        <ModelFileSelect value={undefined} onChange={vi.fn()} />
        <ArtifactSelect profileId={3} value={undefined} onChange={vi.fn()} />
      </>
    );

    await waitFor(() => {
      expect(api.queryWorkersList).toHaveBeenCalledWith({
        page: 1,
        perPage: 20
      });
      expect(api.queryModelFilesList).toHaveBeenCalledWith({
        page: 1,
        perPage: 20
      });
      expect(api.queryModelStorageArtifacts).toHaveBeenCalledWith(3, {
        page: 1,
        perPage: 20
      });
    });
    expect(document.querySelector('.ant-empty')).toBeNull();
  });

  it('Artifact 切换 Profile 自动首刷、隔离旧结果并保留受控 ID', async () => {
    const old = createDeferred<ReturnType<typeof page<ModelStorageArtifact>>>();
    api.queryModelStorageArtifacts.mockImplementation((profileId: number) =>
      profileId === 1 ? old.promise : Promise.resolve(page([]))
    );
    const onArtifactChange = vi.fn();
    const onChange = vi.fn();
    const onValidityChange = vi.fn();
    const { rerender } = render(
      <ArtifactSelect
        profileId={1}
        value="existing-artifact"
        onChange={onChange}
        onArtifactChange={onArtifactChange}
        onValidityChange={onValidityChange}
      />
    );

    expect(screen.getByText('existing-artifact')).toBeInTheDocument();
    rerender(
      <ArtifactSelect
        profileId={2}
        value="existing-artifact"
        onChange={onChange}
        onArtifactChange={onArtifactChange}
        onValidityChange={onValidityChange}
      />
    );
    await waitFor(() =>
      expect(api.queryModelStorageArtifacts).toHaveBeenCalledWith(2, {
        page: 1,
        perPage: 20
      })
    );
    old.resolve(page([{ ...artifact, model_id: 'old/profile' }]));
    await waitFor(() =>
      expect(
        screen.queryByRole('option', { name: /old\/profile/, hidden: true })
      ).not.toBeInTheDocument()
    );
    expect(screen.getByText('existing-artifact')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    const placeholderOption = document.querySelector(
      '.ant-select-item-option-disabled'
    );
    expect(placeholderOption).not.toBeNull();
    expect(placeholderOption).toHaveTextContent('existing-artifact');
    expect(onArtifactChange).toHaveBeenLastCalledWith(undefined);
    expect(onChange).not.toHaveBeenCalled();
    expect(onValidityChange).toHaveBeenLastCalledWith('unresolved');
  });

  it('跨页 Artifact 经精确分页扫描验证后恢复', async () => {
    const historicalArtifact = {
      ...artifact,
      artifact_id: 'historical-artifact',
      model_id: 'org/historical'
    };
    api.queryModelStorageArtifacts.mockImplementation(
      (_profileId: number, params: { page: number }) =>
        Promise.resolve(
          params.page === 2
            ? page([historicalArtifact], 2, 21)
            : page([], 1, 21)
        )
    );
    const onChange = vi.fn();
    const onArtifactChange = vi.fn();
    const onValidityChange = vi.fn();
    render(
      <ArtifactSelect
        profileId={3}
        value="historical-artifact"
        onChange={onChange}
        onArtifactChange={onArtifactChange}
        onValidityChange={onValidityChange}
      />
    );

    await waitFor(() =>
      expect(onValidityChange).toHaveBeenLastCalledWith('valid')
    );
    expect(api.queryModelStorageArtifacts).toHaveBeenCalledWith(3, {
      page: 2,
      perPage: 20
    });
    expect(onArtifactChange).toHaveBeenLastCalledWith(historicalArtifact);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Artifact 仍在跨页验证时阻止 Form 提交', async () => {
    const pendingPage =
      createDeferred<ReturnType<typeof page<ModelStorageArtifact>>>();
    api.queryModelStorageArtifacts.mockImplementation(
      (_profileId: number, params: { page: number }) =>
        params.page === 2
          ? pendingPage.promise
          : Promise.resolve(page([], 1, 21))
    );
    const onFinish = vi.fn();
    const ArtifactGateForm = () => {
      const [validity, setValidity] = useState<
        'resolving' | 'valid' | 'unresolved'
      >('unresolved');
      const [selected, setSelected] = useState<ModelStorageArtifact>();
      return (
        <Form
          initialValues={{ artifact_id: 'pending-artifact' }}
          onFinish={onFinish}
        >
          <Form.Item
            name="artifact_id"
            rules={[
              { required: true },
              {
                validator: async (_, value) => {
                  if (validity === 'resolving')
                    throw new Error('artifact-resolving');
                  if (validity !== 'valid' || selected?.artifact_id !== value)
                    throw new Error('artifact-unresolved');
                }
              }
            ]}
          >
            <ArtifactSelect
              profileId={3}
              onArtifactChange={setSelected}
              onValidityChange={setValidity}
            />
          </Form.Item>
          <button type="submit">提交</button>
        </Form>
      );
    };

    render(<ArtifactGateForm />);
    await waitFor(() =>
      expect(api.queryModelStorageArtifacts).toHaveBeenCalledWith(3, {
        page: 2,
        perPage: 20
      })
    );
    fireEvent.click(screen.getByRole('button', { name: '提交' }));
    expect(await screen.findByText('artifact-resolving')).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
    pendingPage.resolve(page([], 2, 21));
  });

  it('Form 将 Artifact 从旧值清空后，旧分页扫描不得恢复表单值', async () => {
    const pendingPage =
      createDeferred<ReturnType<typeof page<ModelStorageArtifact>>>();
    const oldArtifact = {
      ...artifact,
      artifact_id: 'old-artifact',
      model_id: 'org/old'
    };
    api.queryModelStorageArtifacts.mockImplementation(
      (_profileId: number, params: { page: number }) =>
        params.page === 2
          ? pendingPage.promise
          : Promise.resolve(page([], 1, 21))
    );
    const onArtifactChange = vi.fn();
    const onValidityChange = vi.fn();
    const ArtifactClearForm = () => {
      const [form] = Form.useForm();
      return (
        <Form form={form} initialValues={{ artifact_id: 'old-artifact' }}>
          <Form.Item name="artifact_id">
            <ArtifactSelect
              profileId={3}
              onArtifactChange={onArtifactChange}
              onValidityChange={onValidityChange}
            />
          </Form.Item>
          <button
            type="button"
            onClick={() => form.setFieldValue('artifact_id', undefined)}
          >
            清空
          </button>
          <output data-testid="artifact-value">
            {Form.useWatch('artifact_id', form) || ''}
          </output>
        </Form>
      );
    };

    render(<ArtifactClearForm />);
    await waitFor(() =>
      expect(api.queryModelStorageArtifacts).toHaveBeenCalledWith(3, {
        page: 2,
        perPage: 20
      })
    );
    fireEvent.click(screen.getByRole('button', { name: '清空' }));
    expect(screen.getByTestId('artifact-value')).toHaveTextContent('');
    pendingPage.resolve(page([oldArtifact], 2, 21));
    await act(async () => Promise.resolve());

    expect(screen.getByTestId('artifact-value')).toHaveTextContent('');
    expect(onArtifactChange).not.toHaveBeenCalledWith(oldArtifact);
    expect(onValidityChange).toHaveBeenLastCalledWith('unresolved');
  });

  it('Artifact 回调函数身份变化不会重复扫描，卸载后旧请求失效', async () => {
    const pendingPage =
      createDeferred<ReturnType<typeof page<ModelStorageArtifact>>>();
    api.queryModelStorageArtifacts.mockImplementation(
      (_profileId: number, params: { page: number }) =>
        params.page === 2
          ? pendingPage.promise
          : Promise.resolve(page([], 1, 21))
    );
    const validityEvents: string[] = [];
    const InlineCallbackHarness = () => {
      const [, forceRender] = useState(0);
      return (
        <ArtifactSelect
          profileId={3}
          value="pending-artifact"
          onValidityChange={(validity) => {
            validityEvents.push(validity);
            forceRender((value) => value + 1);
          }}
        />
      );
    };

    const { unmount } = render(<InlineCallbackHarness />);
    await waitFor(() =>
      expect(api.queryModelStorageArtifacts).toHaveBeenCalledWith(3, {
        page: 2,
        perPage: 20
      })
    );
    expect(api.queryModelStorageArtifacts).toHaveBeenCalledTimes(3);
    unmount();
    pendingPage.resolve(
      page([{ ...artifact, artifact_id: 'pending-artifact' }], 2, 21)
    );
    await act(async () => Promise.resolve());

    expect(api.queryModelStorageArtifacts).toHaveBeenCalledTimes(3);
    expect(validityEvents).toEqual(['unresolved', 'resolving']);
  });

  it('Artifact 受控值快速切换时旧分页扫描不得覆盖新值', async () => {
    const oldPage =
      createDeferred<ReturnType<typeof page<ModelStorageArtifact>>>();
    const newArtifact = {
      ...artifact,
      artifact_id: 'new-artifact',
      model_id: 'org/new'
    };
    api.queryModelStorageArtifacts.mockImplementation(
      (_profileId: number, params: { page: number }) => {
        if (params.page === 2) return oldPage.promise;
        return Promise.resolve(page([], 1, 21));
      }
    );
    const onChange = vi.fn();
    const onArtifactChange = vi.fn();
    const onValidityChange = vi.fn();
    const { rerender } = render(
      <ArtifactSelect
        profileId={3}
        value="old-artifact"
        onChange={onChange}
        onArtifactChange={onArtifactChange}
        onValidityChange={onValidityChange}
      />
    );
    await waitFor(() =>
      expect(api.queryModelStorageArtifacts).toHaveBeenCalledWith(3, {
        page: 2,
        perPage: 20
      })
    );
    api.queryModelStorageArtifacts.mockResolvedValue(page([newArtifact]));
    rerender(
      <ArtifactSelect
        profileId={3}
        value="new-artifact"
        onChange={onChange}
        onArtifactChange={onArtifactChange}
        onValidityChange={onValidityChange}
      />
    );
    await waitFor(() =>
      expect(onValidityChange).toHaveBeenLastCalledWith('valid')
    );
    oldPage.resolve(
      page([{ ...artifact, artifact_id: 'old-artifact' }], 2, 21)
    );
    await act(async () => Promise.resolve());
    expect(onChange).not.toHaveBeenCalledWith(
      'old-artifact',
      expect.anything()
    );
    expect(onArtifactChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ artifact_id: 'old-artifact' })
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('选择搜索结果后保留完整 Artifact，并消除表单校验竞态', async () => {
    const user = userEvent.setup();
    const searchedArtifact = {
      ...artifact,
      artifact_id: 'artifact-search-result-12345678',
      model_id: 'org/historical',
      resolved_revision: 'feature/quantized',
      include_patterns: ['weights/model-Q8_0.gguf']
    };
    api.queryModelStorageArtifacts.mockImplementation(
      (_profileId: number, params: { search?: string }) =>
        Promise.resolve(page(params.search ? [searchedArtifact] : []))
    );
    const onFinish = vi.fn();
    const ArtifactForm = () => {
      const [validity, setValidity] = useState<
        'resolving' | 'valid' | 'unresolved'
      >('unresolved');
      const [selected, setSelected] = useState<ModelStorageArtifact>();
      return (
        <Form onFinish={onFinish}>
          <Form.Item
            name="artifact_id"
            rules={[
              {
                validator: async (_, value) => {
                  if (validity !== 'valid' || selected?.artifact_id !== value)
                    throw new Error('artifact-unresolved');
                }
              }
            ]}
          >
            <ArtifactSelect
              profileId={3}
              onArtifactChange={setSelected}
              onValidityChange={setValidity}
            />
          </Form.Item>
          <Button htmlType="submit">保存</Button>
        </Form>
      );
    };

    render(<ArtifactForm />);
    const combobox = screen.getByRole('combobox');
    await user.type(combobox, 'historical');
    await user.click(await screen.findByText('Hugging Face · org/historical'));
    await user.click(combobox);
    await user.type(combobox, 'refresh');
    await user.clear(combobox);
    await waitFor(() =>
      expect(api.queryModelStorageArtifacts).toHaveBeenLastCalledWith(3, {
        page: 1,
        perPage: 20
      })
    );
    await user.click(screen.getByRole('button', { name: /保.*存/ }));

    await waitFor(() =>
      expect(onFinish).toHaveBeenCalledWith({
        artifact_id: searchedArtifact.artifact_id
      })
    );
    expect(screen.queryByText('artifact-unresolved')).not.toBeInTheDocument();
    const selectedLabel = document.querySelector('.ant-select-selection-item');
    expect(selectedLabel).toHaveTextContent('org/historical');
    expect(selectedLabel).toHaveTextContent('feature/quantized');
    expect(selectedLabel).toHaveTextContent('Q8_0');
    expect(selectedLabel).toHaveTextContent('12345678');
  });

  it('仓库选择器自动首刷、切换来源后重刷，搜索输入不改表单值', async () => {
    const onChange = vi.fn();
    const huggingface = vi.fn().mockResolvedValue({ items: [], total: 0 });
    const modelscope = vi.fn().mockResolvedValue({
      items: [{ id: 'org/model', label: 'org/model' }],
      total: 1
    });
    const { rerender } = render(
      <ModelRepositoryPicker
        source="huggingface"
        value="existing/model"
        onChange={onChange}
        searchers={{ huggingface, modelscope }}
      />
    );

    await waitFor(() =>
      expect(huggingface).toHaveBeenCalledWith(
        expect.objectContaining({ query: '', page: 1, perPage: 20 })
      )
    );
    expect(screen.getByText('existing/model')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'typed-but-not-selected' }
    });
    await waitFor(() =>
      expect(huggingface).toHaveBeenLastCalledWith(
        expect.objectContaining({ query: 'typed-but-not-selected', page: 1 })
      )
    );
    expect(onChange).not.toHaveBeenCalled();

    rerender(
      <ModelRepositoryPicker
        source="model_scope"
        value="existing/model"
        onChange={onChange}
        searchers={{ huggingface, modelscope }}
      />
    );
    await waitFor(() =>
      expect(modelscope).toHaveBeenCalledWith(
        expect.objectContaining({ query: '', page: 1, perPage: 20 })
      )
    );
    expect(
      screen.queryByText('resources.storage.repository.advanced')
    ).not.toBeInTheDocument();
  });

  it('翻页和加载更多控制区位于 Select 下拉内部', async () => {
    api.queryWorkersList.mockResolvedValue(
      page(
        [
          {
            id: 1,
            name: 'worker-1',
            state: 'ready',
            ip: '',
            status: { gpu_devices: [] }
          }
        ],
        1,
        21
      )
    );
    api.queryModelFilesList.mockResolvedValue(page([], 1, 21));
    api.queryModelStorageArtifacts.mockResolvedValue(page([artifact], 1, 21));
    const repositorySearch = vi.fn().mockResolvedValue({
      items: [{ id: 'org/model', label: 'org/model' }],
      total: 21
    });
    render(
      <>
        <WorkerFuzzySelect value={undefined} onChange={vi.fn()} />
        <ArtifactSelect profileId={3} value={undefined} onChange={vi.fn()} />
        <ModelRepositoryPicker
          source="huggingface"
          value={undefined}
          onChange={vi.fn()}
          searchers={{ huggingface: repositorySearch }}
        />
      </>
    );

    await waitFor(() => expect(api.queryWorkersList).toHaveBeenCalled());
    const inputs = screen.getAllByRole('combobox');
    fireEvent.mouseDown(inputs[0]);
    let loadMoreButton = await screen.findByRole('button', {
      name: 'resources.storage.loadMore'
    });
    expect(loadMoreButton.closest('.ant-select-dropdown')).not.toBeNull();
    fireEvent.mouseDown(inputs[1]);
    loadMoreButton = await screen.findByRole('button', {
      name: 'resources.storage.loadMore'
    });
    expect(loadMoreButton.closest('.ant-select-dropdown')).not.toBeNull();
    fireEvent.mouseDown(inputs[2]);
    expect(
      document.querySelector('.ant-select-dropdown .ant-pagination')
    ).not.toBeNull();
  });

  it('Worker UUID 多选的加载更多也位于 Select 下拉内部', async () => {
    const worker = {
      id: 1,
      worker_uuid: 'worker-uuid-1',
      name: 'worker-1',
      state: 'ready',
      ip: '',
      model_storage_protocol_version: 1,
      status: { gpu_devices: [] }
    };
    api.queryWorkersList.mockResolvedValue(page([worker], 1, 21));
    render(
      <WorkerUuidMultiSelect workers={[]} value={[]} onChange={vi.fn()} />
    );
    await waitFor(() => expect(api.queryWorkersList).toHaveBeenCalled());
    fireEvent.mouseDown(screen.getByRole('combobox'));
    const loadMoreButton = await screen.findByRole('button', {
      name: 'resources.storage.loadMore'
    });
    expect(loadMoreButton.closest('.ant-select-dropdown')).not.toBeNull();
  });

  it('Artifact 保守展示请求过滤提示，wildcard 与同量化分片不承诺可选精度', async () => {
    api.queryModelStorageArtifacts.mockResolvedValue(
      page([
        artifact,
        {
          ...artifact,
          artifact_id: 'artifact-single',
          model_id: 'org/single',
          include_patterns: ['weights/model-Q4_K_M.gguf']
        },
        {
          ...artifact,
          artifact_id: 'artifact-wildcard',
          model_id: 'org/wildcard',
          include_patterns: ['weights/*Q8_0*.gguf', 'tokenizer.json'],
          exclude_patterns: ['weights/*draft*.gguf']
        },
        {
          ...artifact,
          artifact_id: 'artifact-sharded',
          model_id: 'org/sharded',
          exclude_patterns: ['weights/*legacy*.gguf'],
          include_patterns: [
            'weights/model-Q4_K_M-00001-of-00002.gguf',
            'weights/model-Q4_K_M-00002-of-00002.gguf'
          ]
        }
      ])
    );
    render(
      <ArtifactSelect
        profileId={3}
        value="artifact-wildcard"
        onChange={vi.fn()}
      />
    );
    await waitFor(() =>
      expect(api.queryModelStorageArtifacts).toHaveBeenCalled()
    );
    fireEvent.mouseDown(screen.getByRole('combobox'));

    await waitFor(() =>
      expect(
        document.querySelectorAll('.model-storage-artifact-option')
      ).toHaveLength(4)
    );
    document
      .querySelectorAll('.model-storage-artifact-option')
      .forEach((option) => expect(option.children).toHaveLength(2));

    const optionDetails = Array.from(
      document.querySelectorAll('.model-storage-artifact-option')
    )
      .map((option) => option.getAttribute('title'))
      .join('\n');
    expect(optionDetails).toContain(
      'resources.storage.artifact.includeFilterNotSpecified'
    );
    expect(optionDetails).toMatch(
      /resources\.storage\.artifact\.excludeFilterPattern.*draft/
    );
    expect(optionDetails).toMatch(
      /resources\.storage\.artifact\.excludeFilterPattern.*legacy/
    );
    expect(optionDetails).toMatch(
      /resources\.storage\.artifact\.ggufFilterPattern.*\*Q8_0\*\.gguf/
    );
    expect(optionDetails).toMatch(
      /resources\.storage\.artifact\.includeFilterPattern.*\*Q8_0\*\.gguf.*tokenizer\.json/
    );
    const q4SecondaryLines = Array.from(
      document.querySelectorAll(
        '.model-storage-artifact-option > div:last-child'
      )
    ).filter((line) => line.textContent?.includes('Q4_K_M'));
    expect(q4SecondaryLines).toHaveLength(2);
    q4SecondaryLines.forEach((line) =>
      expect(line.textContent?.match(/Q4_K_M/g)).toHaveLength(1)
    );
    expect(
      optionDetails.match(
        /resources\.storage\.artifact\.fixedDistributionHint/g
      )
    ).toHaveLength(4);
    expect(
      document.querySelector('.ant-select-selection-item')?.textContent
    ).not.toContain('*Q8_0*.gguf');
  });
  it('节点模型 SSE 的 UPDATE 可进入筛选集合，DELETE 可离开集合', () => {
    const setDataList = vi.fn();
    const { result } = renderHook(() =>
      useUpdateChunkedList({
        dataList: [],
        events: MODEL_FILE_WATCH_EVENTS,
        setDataList
      })
    );

    act(() => {
      result.current.updateChunkedList({
        type: WatchEventType.UPDATE,
        collection: [{ id: 7, state: 'ready' }],
        ids: [],
        data: null
      });
    });
    expect(result.current.cacheDataListRef.current).toEqual([
      { id: 7, state: 'ready' }
    ]);

    act(() => {
      result.current.updateChunkedList({
        type: WatchEventType.DELETE,
        collection: [],
        ids: [7],
        data: null
      });
    });
    expect(result.current.cacheDataListRef.current).toEqual([]);
  });

  it('Worker 和 Artifact 使用服务端搜索与 page/perPage 分页', async () => {
    const user = userEvent.setup();
    api.queryWorkersList.mockResolvedValue(
      page([
        {
          id: 1,
          name: 'a100-01',
          state: 'ready',
          ip: '10.0.0.1',
          status: { gpu_devices: [{ name: 'A100' }] }
        }
      ])
    );
    api.queryModelStorageArtifacts.mockResolvedValue(page([artifact]));
    render(
      <>
        <WorkerFuzzySelect value={undefined} onChange={vi.fn()} />
        <ArtifactSelect profileId={3} value={undefined} onChange={vi.fn()} />
      </>
    );

    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'a100' }
    });
    await waitFor(() =>
      expect(api.queryWorkersList).toHaveBeenLastCalledWith({
        page: 1,
        perPage: 20,
        search: 'a100'
      })
    );
    fireEvent.change(screen.getAllByRole('combobox')[1], {
      target: { value: 'model' }
    });
    await waitFor(() =>
      expect(api.queryModelStorageArtifacts).toHaveBeenLastCalledWith(3, {
        page: 1,
        perPage: 20,
        search: 'model'
      })
    );
  });

  it('三个服务端选择器可加载第二页并去重，不受前 100 条限制', async () => {
    const user = userEvent.setup();
    api.queryWorkersList.mockImplementation(
      ({ page: current }: { page: number }) =>
        Promise.resolve(
          page(
            current === 1
              ? [
                  {
                    id: 1,
                    name: 'worker-1',
                    state: 'ready',
                    ip: '',
                    status: { gpu_devices: [] }
                  }
                ]
              : [
                  {
                    id: 1,
                    name: 'worker-1-new',
                    state: 'ready',
                    ip: '',
                    status: { gpu_devices: [] }
                  },
                  {
                    id: 101,
                    name: 'worker-101',
                    state: 'ready',
                    ip: '',
                    status: { gpu_devices: [] }
                  }
                ],
            current,
            101
          )
        )
    );
    api.queryModelFilesList.mockImplementation(
      ({ page: current }: { page: number }) =>
        Promise.resolve(
          page(
            current === 1
              ? [
                  {
                    id: 1,
                    source: 'huggingface',
                    huggingface_repo_id: 'org/one',
                    huggingface_filename: '',
                    ollama_library_model_name: '',
                    model_scope_model_id: '',
                    model_scope_file_path: '',
                    local_path: '',
                    local_dir: '',
                    worker_id: 1,
                    size: 0,
                    download_progress: 100,
                    resolved_paths: [],
                    state: 'ready',
                    state_message: '',
                    created_at: '',
                    updated_at: ''
                  }
                ]
              : [
                  {
                    id: 101,
                    source: 'huggingface',
                    huggingface_repo_id: 'org/101',
                    huggingface_filename: '',
                    ollama_library_model_name: '',
                    model_scope_model_id: '',
                    model_scope_file_path: '',
                    local_path: '',
                    local_dir: '',
                    worker_id: 1,
                    size: 0,
                    download_progress: 100,
                    resolved_paths: [],
                    state: 'ready',
                    state_message: '',
                    created_at: '',
                    updated_at: ''
                  }
                ],
            current,
            101
          )
        )
    );
    api.queryModelStorageArtifacts.mockImplementation(
      (_profileId: number, { page: current }: { page: number }) =>
        Promise.resolve(
          page(
            current === 1
              ? [artifact]
              : [
                  {
                    ...artifact,
                    artifact_id: 'artifact-101',
                    model_id: 'org/101'
                  }
                ],
            current,
            101
          )
        )
    );
    render(
      <>
        <WorkerFuzzySelect value={undefined} onChange={vi.fn()} />
        <ModelFileSelect value={undefined} onChange={vi.fn()} />
        <ArtifactSelect profileId={3} value={undefined} onChange={vi.fn()} />
      </>
    );
    const inputs = screen.getAllByRole('combobox');
    fireEvent.change(inputs[0], { target: { value: 'worker' } });
    fireEvent.change(inputs[1], { target: { value: 'model' } });
    fireEvent.change(inputs[2], { target: { value: 'model' } });
    await waitFor(() =>
      expect(
        screen.getAllByRole('button', { name: 'resources.storage.loadMore' })
      ).toHaveLength(3)
    );
    fireEvent.click(
      screen.getAllByRole('button', { name: 'resources.storage.loadMore' })[0]
    );
    await waitFor(() =>
      expect(api.queryWorkersList).toHaveBeenCalledWith({
        page: 2,
        perPage: 20,
        search: 'worker'
      })
    );
    fireEvent.click(
      screen.getAllByRole('button', { name: 'resources.storage.loadMore' })[1]
    );
    await waitFor(() =>
      expect(api.queryModelFilesList).toHaveBeenCalledWith({
        page: 2,
        perPage: 20,
        search: 'model'
      })
    );
    fireEvent.click(
      screen.getAllByRole('button', { name: 'resources.storage.loadMore' })[2]
    );
    await waitFor(() => {
      expect(api.queryModelStorageArtifacts).toHaveBeenCalledWith(3, {
        page: 2,
        perPage: 20,
        search: 'model'
      });
    });
    expect(
      screen.getAllByRole('option', {
        name: /worker-101|org\/101/,
        hidden: true
      }).length
    ).toBeGreaterThan(0);
  });

  it('Worker 筛选会补取历史 ID，并保留不可执行节点作为筛选值', async () => {
    api.queryWorkersList.mockResolvedValue(page([]));
    api.queryWorker.mockResolvedValue({
      id: 101,
      name: 'retired-worker',
      state: 'not_ready',
      ip: '10.0.0.101',
      status: { gpu_devices: [{ name: 'A100' }] }
    });

    render(<WorkerFuzzySelect value={101} onChange={vi.fn()} />);

    await waitFor(() => expect(api.queryWorker).toHaveBeenCalledWith(101));
    expect(
      await screen.findByText('retired-worker · not_ready · 10.0.0.101 · A100')
    ).toBeInTheDocument();
  });

  it('仓库搜索取消旧请求且只采纳最新结果，并支持重试', async () => {
    const first = createDeferred<any>();
    const second = createDeferred<any>();
    let errorAttempts = 0;
    const search = vi.fn(({ query }: { query: string }) => {
      if (query === 'old') return first.promise;
      if (query === 'new') return second.promise;
      if (query === 'error') {
        errorAttempts += 1;
        return errorAttempts === 1
          ? Promise.reject(new Error('network'))
          : Promise.resolve({
              items: [{ id: 'retry/model', label: 'retry/model' }],
              total: 1
            });
      }
      return Promise.resolve({
        items: query ? [{ id: `${query}/model`, label: `${query}/model` }] : [],
        total: 1
      });
    });
    const user = userEvent.setup();
    render(
      <ModelRepositoryPicker
        source="huggingface"
        value={undefined}
        onChange={vi.fn()}
        searchers={{ huggingface: search }}
      />
    );
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'old' } });
    fireEvent.change(input, { target: { value: 'new' } });
    second.resolve({
      items: [{ id: 'new/model', label: 'new/model' }],
      total: 1
    });
    first.resolve({
      items: [{ id: 'old/model', label: 'old/model' }],
      total: 1
    });
    expect(
      await screen.findByRole('option', { name: 'new/model', hidden: true })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'old/model', hidden: true })
    ).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'error' } });
    expect(
      await screen.findByRole('button', { name: 'resources.storage.retry' })
    ).toBeInTheDocument();
    const callsBeforeRetry = search.mock.calls.length;
    await user.click(
      screen.getByRole('button', { name: 'resources.storage.retry' })
    );
    expect(search.mock.calls.length).toBeGreaterThan(callsBeforeRetry);
  });

  it('切换仓库来源立即隔离旧请求和错误', async () => {
    const old = createDeferred<any>();
    const onChange = vi.fn();
    const { rerender } = render(
      <ModelRepositoryPicker
        source="huggingface"
        value={undefined}
        onChange={onChange}
        searchers={{ huggingface: () => old.promise }}
      />
    );
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'old' }
    });
    rerender(
      <ModelRepositoryPicker
        source="model_scope"
        value={undefined}
        onChange={onChange}
        searchers={{ modelscope: async () => ({ items: [], total: 0 }) }}
      />
    );
    old.resolve({
      items: [{ id: 'old/source', label: 'old/source' }],
      total: 1
    });
    await waitFor(() =>
      expect(
        screen.queryByRole('option', { name: 'old/source', hidden: true })
      ).not.toBeInTheDocument()
    );
    expect(
      screen.queryByText('resources.storage.state.empty')
    ).not.toBeInTheDocument();
  });

  it('Ollama 无远程搜索时使用历史候选并保留精确输入入口', async () => {
    const user = userEvent.setup();
    render(
      <ModelRepositoryPicker
        source="ollama_library"
        value={undefined}
        onChange={vi.fn()}
        ollamaHistory={['qwen3:32b', 'llama3.3:70b']}
      />
    );
    const input = screen.getByRole('combobox');
    await user.type(input, 'qwen');
    expect(
      await screen.findByRole('option', { name: 'qwen3:32b', hidden: true })
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('resources.storage.repository.exactInput')
    ).not.toBeInTheDocument();
    await user.click(screen.getByText('resources.storage.repository.advanced'));
    expect(
      screen.getByLabelText('resources.storage.repository.exactInput')
    ).toBeInTheDocument();
  });

  it('刷新期间保留旧数据，初始加载、空结果与错误分别呈现', () => {
    const { rerender } = render(
      <ModelStorageAsyncState loading refreshing={false} data={[]}>
        <span>数据</span>
      </ModelStorageAsyncState>
    );
    expect(
      screen.getByText('resources.storage.state.loading')
    ).toBeInTheDocument();
    rerender(
      <ModelStorageAsyncState loading={false} refreshing data={[artifact]}>
        <span>数据</span>
      </ModelStorageAsyncState>
    );
    expect(screen.getByText('数据')).toBeInTheDocument();
    expect(
      screen.getByText('resources.storage.state.refreshing')
    ).toBeInTheDocument();
    rerender(
      <ModelStorageAsyncState
        loading={false}
        refreshing={false}
        data={[]}
        query="none"
      >
        <span>数据</span>
      </ModelStorageAsyncState>
    );
    expect(
      screen.getByText('resources.storage.state.noMatch')
    ).toBeInTheDocument();
  });

  it('禁用原因在首次 loading、错误和空态都可见', () => {
    const { rerender } = render(
      <ModelStorageAsyncState
        loading
        refreshing={false}
        data={[]}
        disabledReason="resources.storage.artifact.profileRequired"
      >
        <span>数据</span>
      </ModelStorageAsyncState>
    );
    expect(
      screen.getByText('resources.storage.artifact.profileRequired')
    ).toBeInTheDocument();
    rerender(
      <ModelStorageAsyncState
        loading={false}
        refreshing={false}
        data={[]}
        error={new Error('x')}
        disabledReason="resources.storage.artifact.profileRequired"
      >
        <span>数据</span>
      </ModelStorageAsyncState>
    );
    expect(
      screen.getByText('resources.storage.state.error')
    ).toBeInTheDocument();
    expect(
      screen.getByText('resources.storage.artifact.profileRequired')
    ).toBeInTheDocument();
  });
});
