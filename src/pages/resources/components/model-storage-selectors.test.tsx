import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModelStorageArtifact } from '../config/types';
import ArtifactSelect from './artifact-select';
import ModelFileSelect from './model-file-select';
import ModelRepositoryPicker from './model-repository-picker';
import ModelStorageAsyncState from './model-storage-async-state';
import WorkerFuzzySelect from './worker-fuzzy-select';

const api = vi.hoisted(() => ({
  queryModelFilesList: vi.fn(),
  queryModelStorageArtifacts: vi.fn(),
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
  manifest_digest: 'digest',
  manifest_state: 'valid',
  file_count: 1,
  total_size: 1024,
  last_verified_at: '2026-08-24T00:00:00Z'
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
  it('Worker 和 Artifact 使用服务端搜索与 page/perPage 分页', async () => {
    const user = userEvent.setup();
    api.queryWorkersList.mockResolvedValue(
      page([{ id: 1, name: 'a100-01', state: 'ready', ip: '10.0.0.1', status: { gpu_devices: [{ name: 'A100' }] } }])
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
    api.queryWorkersList.mockImplementation(({ page: current }: { page: number }) => Promise.resolve(page(current === 1 ? [{ id: 1, name: 'worker-1', state: 'ready', ip: '', status: { gpu_devices: [] } }] : [{ id: 1, name: 'worker-1-new', state: 'ready', ip: '', status: { gpu_devices: [] } }, { id: 101, name: 'worker-101', state: 'ready', ip: '', status: { gpu_devices: [] } }], current, 101)));
    api.queryModelFilesList.mockImplementation(({ page: current }: { page: number }) => Promise.resolve(page(current === 1 ? [{ id: 1, source: 'huggingface', huggingface_repo_id: 'org/one', huggingface_filename: '', ollama_library_model_name: '', model_scope_model_id: '', model_scope_file_path: '', local_path: '', local_dir: '', worker_id: 1, size: 0, download_progress: 100, resolved_paths: [], state: 'ready', state_message: '', created_at: '', updated_at: '' }] : [{ id: 101, source: 'huggingface', huggingface_repo_id: 'org/101', huggingface_filename: '', ollama_library_model_name: '', model_scope_model_id: '', model_scope_file_path: '', local_path: '', local_dir: '', worker_id: 1, size: 0, download_progress: 100, resolved_paths: [], state: 'ready', state_message: '', created_at: '', updated_at: '' }], current, 101)));
    api.queryModelStorageArtifacts.mockImplementation((_profileId: number, { page: current }: { page: number }) => Promise.resolve(page(current === 1 ? [artifact] : [{ ...artifact, artifact_id: 'artifact-101', model_id: 'org/101' }], current, 101)));
    render(<><WorkerFuzzySelect value={undefined} onChange={vi.fn()} /><ModelFileSelect value={undefined} onChange={vi.fn()} /><ArtifactSelect profileId={3} value={undefined} onChange={vi.fn()} /></>);
    const inputs = screen.getAllByRole('combobox');
    fireEvent.change(inputs[0], { target: { value: 'worker' } });
    fireEvent.change(inputs[1], { target: { value: 'model' } });
    fireEvent.change(inputs[2], { target: { value: 'model' } });
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'resources.storage.loadMore' })).toHaveLength(3));
    fireEvent.click(screen.getAllByRole('button', { name: 'resources.storage.loadMore' })[0]);
    await waitFor(() => expect(api.queryWorkersList).toHaveBeenCalledWith({ page: 2, perPage: 20, search: 'worker' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'resources.storage.loadMore' })[1]);
    await waitFor(() => expect(api.queryModelFilesList).toHaveBeenCalledWith({ page: 2, perPage: 20, search: 'model' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'resources.storage.loadMore' })[2]);
    await waitFor(() => {
      expect(api.queryModelStorageArtifacts).toHaveBeenCalledWith(3, { page: 2, perPage: 20, search: 'model' });
    });
    expect(screen.getAllByRole('option', { name: /worker-101|org\/101/, hidden: true }).length).toBeGreaterThan(0);
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
          : Promise.resolve({ items: [{ id: 'retry/model', label: 'retry/model' }], total: 1 });
      }
      return Promise.resolve({ items: query ? [{ id: `${query}/model`, label: `${query}/model` }] : [], total: 1 });
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
    second.resolve({ items: [{ id: 'new/model', label: 'new/model' }], total: 1 });
    first.resolve({ items: [{ id: 'old/model', label: 'old/model' }], total: 1 });
    expect(await screen.findByRole('option', { name: 'new/model', hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'old/model', hidden: true })).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'error' } });
    expect(await screen.findByRole('button', { name: 'resources.storage.retry' })).toBeInTheDocument();
    const callsBeforeRetry = search.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'resources.storage.retry' }));
    expect(search.mock.calls.length).toBeGreaterThan(callsBeforeRetry);
  });

  it('切换仓库来源立即隔离旧请求和错误', async () => {
    const old = createDeferred<any>();
    const onChange = vi.fn();
    const { rerender } = render(<ModelRepositoryPicker source="huggingface" value={undefined} onChange={onChange} searchers={{ huggingface: () => old.promise }} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'old' } });
    rerender(<ModelRepositoryPicker source="model_scope" value={undefined} onChange={onChange} searchers={{ modelscope: async () => ({ items: [], total: 0 }) }} />);
    old.resolve({ items: [{ id: 'old/source', label: 'old/source' }], total: 1 });
    await waitFor(() => expect(screen.queryByRole('option', { name: 'old/source', hidden: true })).not.toBeInTheDocument());
    expect(screen.getByText('resources.storage.state.empty')).toBeInTheDocument();
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
    expect(await screen.findByRole('option', { name: 'qwen3:32b', hidden: true })).toBeInTheDocument();
    expect(screen.queryByLabelText('resources.storage.repository.exactInput')).not.toBeInTheDocument();
    await user.click(screen.getByText('resources.storage.repository.advanced'));
    expect(screen.getByLabelText('resources.storage.repository.exactInput')).toBeInTheDocument();
  });

  it('刷新期间保留旧数据，初始加载、空结果与错误分别呈现', () => {
    const { rerender } = render(
      <ModelStorageAsyncState loading refreshing={false} data={[]}>
        <span>数据</span>
      </ModelStorageAsyncState>
    );
    expect(screen.getByText('resources.storage.state.loading')).toBeInTheDocument();
    rerender(
      <ModelStorageAsyncState loading={false} refreshing data={[artifact]}>
        <span>数据</span>
      </ModelStorageAsyncState>
    );
    expect(screen.getByText('数据')).toBeInTheDocument();
    expect(screen.getByText('resources.storage.state.refreshing')).toBeInTheDocument();
    rerender(
      <ModelStorageAsyncState loading={false} refreshing={false} data={[]} query="none">
        <span>数据</span>
      </ModelStorageAsyncState>
    );
    expect(screen.getByText('resources.storage.state.noMatch')).toBeInTheDocument();
  });

  it('禁用原因在首次 loading、错误和空态都可见', () => {
    const { rerender } = render(<ModelStorageAsyncState loading refreshing={false} data={[]} disabledReason="resources.storage.artifact.profileRequired"><span>数据</span></ModelStorageAsyncState>);
    expect(screen.getByText('resources.storage.artifact.profileRequired')).toBeInTheDocument();
    rerender(<ModelStorageAsyncState loading={false} refreshing={false} data={[]} error={new Error('x')} disabledReason="resources.storage.artifact.profileRequired"><span>数据</span></ModelStorageAsyncState>);
    expect(screen.getByText('resources.storage.state.error')).toBeInTheDocument();
    expect(screen.getByText('resources.storage.artifact.profileRequired')).toBeInTheDocument();
  });
});
