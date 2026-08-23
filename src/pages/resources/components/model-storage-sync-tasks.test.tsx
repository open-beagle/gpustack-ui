import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ModelFile,
  ModelStorageSyncTask,
  ModelStorageSyncTaskDetail
} from '../config/types';
import ModelStorageSyncBatchModal from './model-storage-sync-batch-modal';
import ModelStorageSyncTasks from './model-storage-sync-tasks';

const api = vi.hoisted(() => ({
  createModelStorageSyncBatch: vi.fn(),
  deleteModelStorageSyncTask: vi.fn(),
  queryModelFilesList: vi.fn(),
  queryModelPreheatS3Profiles: vi.fn(),
  queryModelStorageSyncTask: vi.fn(),
  queryModelStorageSyncTasks: vi.fn(),
  queryWorkersList: vi.fn()
}));

vi.mock('@umijs/max', () => ({
  useNavigate: () => vi.fn(),
  useIntl: () => ({
    formatMessage: (
      { id }: { id: string },
      values?: { worker?: string; profile?: string }
    ) =>
      id.startsWith('resources.storage.transfer.')
        ? `${id}:${values?.worker || ''}:${values?.profile || ''}`
        : id
  })
}));

vi.mock('../apis', async () => ({
  ...(await vi.importActual('../apis')),
  ...api
}));

const listTask = (
  overrides: Partial<ModelStorageSyncTask> = {}
): ModelStorageSyncTask => ({
  id: 5,
  model_file_id: 7,
  worker_id: 12,
  profile_id: 3,
  profile_config_version: 2,
  source: 'modelscope',
  model_id: 'team/model',
  resolved_revision: 'main',
  state: 'ready',
  state_message: null,
  error_code: null,
  file_count: 1,
  total_size: 1024,
  transfer_source: 's3',
  transfer_profile_id: 3,
  source_worker_id: 12,
  source_worker_name: 'a100-58',
  profile_name: 'center-cache',
  profile_endpoint: 'https://s3.example.com',
  profile_bucket: 'models',
  profile_prefix: 'team-a',
  started_at: null,
  finished_at: null,
  created_at: '',
  updated_at: '',
  ...overrides
});

const detailTask = (
  overrides: Partial<ModelStorageSyncTaskDetail> = {}
): ModelStorageSyncTaskDetail => ({
  id: 5,
  model_file_id: 7,
  worker_id: 12,
  profile_config_version: 2,
  source: 'modelscope',
  model_id: 'team/model',
  resolved_revision: 'main',
  state: 'ready',
  state_message: null,
  error_code: null,
  file_count: 1,
  total_size: 1024,
  transfer_source: 's3',
  transfer_profile_id: 3,
  source_worker_id: 12,
  source_worker_name: 'a100-58',
  started_at: null,
  finished_at: null,
  created_at: '',
  updated_at: '',
  profile: {
    id: 3,
    name: 'center-cache',
    endpoint: 'https://s3.example.com',
    bucket: 'models',
    prefix: 'team-a',
    tls_enabled: true,
    tls_verify: true,
    region: null,
    use_virtual_hosted_style: false,
    config_version: 2,
    system_managed: false
  },
  request_digest: 'request-5',
  artifact_id: 'artifact-5',
  ...overrides
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('同步任务获取方式', () => {
  it('失败任务显示业务状态并允许删除', async () => {
    const user = userEvent.setup();
    api.queryModelStorageSyncTasks.mockResolvedValue({
      items: [
        listTask({
          state: 'error',
          transfer_source: null,
          created_at: '2026-08-23T22:08:05+08:00'
        })
      ],
      pagination: { page: 1, perPage: 100, total: 1, totalPage: 1 }
    });
    api.deleteModelStorageSyncTask.mockResolvedValue(undefined);

    render(<ModelStorageSyncTasks />);

    expect(
      await screen.findByText('resources.storage.syncTask.state.error')
    ).toBeInTheDocument();
    expect(screen.getByText('2026-08-23 22:08:05')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'resources.storage.deleteSync' })
    );
    const dialog = screen.getByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', {
        name: 'resources.storage.deleteSync'
      })
    );

    await waitFor(() =>
      expect(api.deleteModelStorageSyncTask).toHaveBeenCalledWith(5)
    );
  });

  it('活动任务自动刷新并及时显示失败终态', async () => {
    vi.useFakeTimers();
    const pending = listTask({ state: 'pending', transfer_source: null });
    const failed = listTask({
      state: 'error',
      transfer_source: null,
      error_code: 'worker_execution_failed'
    });
    api.queryModelStorageSyncTasks
      .mockResolvedValueOnce({
        items: [pending],
        pagination: { page: 1, perPage: 100, total: 1, totalPage: 1 }
      })
      .mockResolvedValue({
        items: [failed],
        pagination: { page: 1, perPage: 100, total: 1, totalPage: 1 }
      });

    render(<ModelStorageSyncTasks />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(
      screen.getByText('resources.storage.syncTask.state.pending')
    ).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(api.queryModelStorageSyncTasks).toHaveBeenCalledTimes(2);
    expect(
      screen.getByText('resources.storage.syncTask.state.error')
    ).toBeInTheDocument();
  });

  it('忽略晚返回的旧轮询响应，终态不会回退为 pending', async () => {
    vi.useFakeTimers();
    const stalePolling = deferred<any>();
    const latestRefresh = deferred<any>();
    api.queryModelStorageSyncTasks
      .mockResolvedValueOnce({
        items: [listTask({ state: 'pending', transfer_source: null })],
        pagination: { page: 1, perPage: 100, total: 1, totalPage: 1 }
      })
      .mockReturnValueOnce(stalePolling.promise)
      .mockReturnValueOnce(latestRefresh.promise);

    render(<ModelStorageSyncTasks />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    fireEvent.click(screen.getByText('common.button.refresh'));

    latestRefresh.resolve({
      items: [listTask({ state: 'error', transfer_source: null })],
      pagination: { page: 1, perPage: 100, total: 1, totalPage: 1 }
    });
    await act(async () => {
      await latestRefresh.promise;
    });
    stalePolling.resolve({
      items: [listTask({ state: 'pending', transfer_source: null })],
      pagination: { page: 1, perPage: 100, total: 1, totalPage: 1 }
    });
    await act(async () => {
      await stalePolling.promise;
    });

    expect(
      screen.getByText('resources.storage.syncTask.state.error')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('resources.storage.syncTask.state.pending')
    ).not.toBeInTheDocument();
  });

  it('后台轮询接管手动刷新后会正常结束 loading', async () => {
    vi.useFakeTimers();
    const manualRefresh = deferred<any>();
    const latestPolling = deferred<any>();
    api.queryModelStorageSyncTasks
      .mockResolvedValueOnce({
        items: [listTask({ state: 'pending', transfer_source: null })],
        pagination: { page: 1, perPage: 100, total: 1, totalPage: 1 }
      })
      .mockReturnValueOnce(manualRefresh.promise)
      .mockReturnValueOnce(latestPolling.promise);

    render(<ModelStorageSyncTasks />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const refreshButton = screen
      .getByText('common.button.refresh')
      .closest('button');
    fireEvent.click(refreshButton!);
    expect(refreshButton).toHaveClass('ant-btn-loading');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    latestPolling.resolve({
      items: [listTask({ state: 'error', transfer_source: null })],
      pagination: { page: 1, perPage: 100, total: 1, totalPage: 1 }
    });
    await act(async () => {
      await latestPolling.promise;
    });

    expect(refreshButton).not.toHaveClass('ant-btn-loading');
  });

  it('关闭后重开时忽略旧的 Profile 和节点初始化响应', async () => {
    const user = userEvent.setup();
    const firstProfiles = deferred<any>();
    const firstWorkers = deferred<any>();
    const secondProfiles = deferred<any>();
    const secondWorkers = deferred<any>();
    api.queryModelPreheatS3Profiles
      .mockReturnValueOnce(firstProfiles.promise)
      .mockReturnValueOnce(secondProfiles.promise);
    api.queryWorkersList
      .mockReturnValueOnce(firstWorkers.promise)
      .mockReturnValueOnce(secondWorkers.promise);

    const { rerender } = render(
      <ModelStorageSyncBatchModal
        open
        onCancel={vi.fn()}
        onTasksChanged={vi.fn()}
      />
    );
    await waitFor(() =>
      expect(api.queryModelPreheatS3Profiles).toHaveBeenCalledTimes(1)
    );
    rerender(
      <ModelStorageSyncBatchModal
        open={false}
        onCancel={vi.fn()}
        onTasksChanged={vi.fn()}
      />
    );
    rerender(
      <ModelStorageSyncBatchModal
        open
        onCancel={vi.fn()}
        onTasksChanged={vi.fn()}
      />
    );
    await waitFor(() =>
      expect(api.queryModelPreheatS3Profiles).toHaveBeenCalledTimes(2)
    );
    secondProfiles.resolve({
      items: [
        {
          id: 8,
          name: 'profile-new',
          lifecycle_state: 'active',
          is_default: true
        }
      ],
      pagination: { page: 1, perPage: 100, total: 1, totalPage: 1 }
    });
    secondWorkers.resolve({
      items: [{ id: 18, name: 'worker-new', state: 'ready' }],
      pagination: { page: 1, perPage: 100, total: 1, totalPage: 1 }
    });
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('profile-new')).toBeInTheDocument();
    firstProfiles.resolve({
      items: [
        {
          id: 3,
          name: 'profile-old',
          lifecycle_state: 'active',
          is_default: true
        }
      ],
      pagination: { page: 1, perPage: 100, total: 1, totalPage: 1 }
    });
    firstWorkers.resolve({
      items: [{ id: 12, name: 'worker-old', state: 'ready' }],
      pagination: { page: 1, perPage: 100, total: 1, totalPage: 1 }
    });
    await firstProfiles.promise;
    await firstWorkers.promise;
    await user.click(within(dialog).getAllByRole('combobox')[0]);
    expect((await screen.findAllByText('profile-new')).length).toBeGreaterThan(
      0
    );
    expect(screen.queryByText('profile-old')).not.toBeInTheDocument();
  });

  it('节点切换后忽略旧模型列表响应，避免跨节点提交', async () => {
    const user = userEvent.setup();
    const first = deferred<Global.PageResponse<ModelFile>>();
    const second = deferred<Global.PageResponse<ModelFile>>();
    const model = (id: number, workerId: number, name: string): ModelFile => ({
      id,
      source: 'model_scope',
      model_scope_model_id: name,
      model_scope_file_path: 'weights.gguf',
      huggingface_repo_id: '',
      huggingface_filename: '',
      ollama_library_model_name: '',
      local_path: '',
      local_dir: '',
      worker_id: workerId,
      size: 1024,
      download_progress: 100,
      resolved_paths: ['weights.gguf'],
      state: 'ready',
      state_message: '',
      resolved_revision: 'revision',
      created_at: '',
      updated_at: ''
    });
    api.queryModelPreheatS3Profiles.mockResolvedValue({
      items: [
        {
          id: 3,
          name: 'default-s3',
          lifecycle_state: 'active',
          is_default: true
        }
      ],
      pagination: { page: 1, perPage: 100, total: 1, totalPage: 1 }
    });
    api.queryWorkersList.mockResolvedValue({
      items: [
        { id: 12, name: 'worker-a', state: 'ready' },
        { id: 18, name: 'worker-b', state: 'ready' }
      ],
      pagination: { page: 1, perPage: 100, total: 2, totalPage: 1 }
    });
    api.queryModelFilesList.mockImplementation(
      ({ worker_id }: { worker_id: number }) =>
        worker_id === 12 ? first.promise : second.promise
    );
    api.createModelStorageSyncBatch.mockResolvedValue({
      scope: 'single_model',
      planned: 1,
      created: [],
      skipped: [],
      failed: []
    });

    render(
      <ModelStorageSyncBatchModal
        open
        onCancel={vi.fn()}
        onTasksChanged={vi.fn()}
      />
    );
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getAllByRole('combobox')[2]);
    await user.click(await screen.findByText('worker-a'));
    await user.click(within(dialog).getAllByRole('combobox')[2]);
    await user.click(await screen.findByText('worker-b'));
    second.resolve({
      items: [model(18, 18, 'model-b')],
      pagination: { page: 1, perPage: 100, total: 1, totalPage: 1 }
    });
    await waitFor(() =>
      expect(api.queryModelFilesList).toHaveBeenCalledWith({
        page: 1,
        perPage: 100,
        worker_id: 18
      })
    );
    first.resolve({
      items: [model(12, 12, 'model-a')],
      pagination: { page: 1, perPage: 100, total: 1, totalPage: 1 }
    });
    await user.click(within(dialog).getAllByRole('combobox')[3]);
    expect(await screen.findByText('model-b (revision)')).toBeInTheDocument();
    expect(screen.queryByText('model-a (revision)')).not.toBeInTheDocument();
    await user.click(screen.getByText('model-b (revision)'));
    await user.click(
      within(dialog).getByRole('button', {
        name: 'resources.storage.sync.submit'
      })
    );
    await waitFor(() =>
      expect(api.createModelStorageSyncBatch).toHaveBeenCalledWith(
        { profile_id: 3, scope: 'single_model', model_file_id: 18 },
        expect.any(String)
      )
    );
  });

  it('批量创建会加载后续页面的节点和模型，并在刷新列表后保留结果页', async () => {
    const user = userEvent.setup();
    const model: ModelFile = {
      id: 31,
      source: 'model_scope',
      model_scope_model_id: 'team/model-page-2',
      model_scope_file_path: 'weights.gguf',
      huggingface_repo_id: '',
      huggingface_filename: '',
      ollama_library_model_name: '',
      local_path: '',
      local_dir: '',
      worker_id: 22,
      size: 1024,
      download_progress: 100,
      resolved_paths: ['weights.gguf'],
      state: 'ready',
      state_message: '',
      resolved_revision: 'revision-2',
      created_at: '',
      updated_at: ''
    };
    api.queryModelStorageSyncTasks.mockResolvedValue({
      items: [],
      pagination: { page: 1, perPage: 100, total: 0, totalPage: 1 }
    });
    api.queryModelPreheatS3Profiles.mockResolvedValue({
      items: [
        {
          id: 3,
          name: 'default-s3',
          lifecycle_state: 'active',
          is_default: true
        }
      ],
      pagination: { page: 1, perPage: 100, total: 1, totalPage: 1 }
    });
    api.queryWorkersList.mockImplementation(({ page }: { page: number }) =>
      Promise.resolve({
        items:
          page === 2 ? [{ id: 22, name: 'worker-page-2', state: 'ready' }] : [],
        pagination: { page, perPage: 100, total: 101, totalPage: 2 }
      })
    );
    api.queryModelFilesList.mockImplementation(({ page }: { page: number }) =>
      Promise.resolve({
        items: page === 2 ? [model] : [],
        pagination: { page, perPage: 100, total: 101, totalPage: 2 }
      })
    );
    api.createModelStorageSyncBatch.mockResolvedValue({
      scope: 'single_model',
      planned: 1,
      created: [{ model_file_id: 31, worker_id: 22, task_id: 9, reason: null }],
      skipped: [],
      failed: []
    });

    render(<ModelStorageSyncTasks />);
    await user.click(
      (await screen.findByText('resources.storage.syncBatch.create')).closest(
        'button'
      )!
    );
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getAllByRole('combobox')[2]);
    await user.click(await screen.findByText('worker-page-2'));
    await waitFor(() =>
      expect(api.queryModelFilesList).toHaveBeenCalledWith({
        page: 2,
        perPage: 100,
        worker_id: 22
      })
    );
    await user.click(within(dialog).getAllByRole('combobox')[3]);
    await user.click(await screen.findByText('team/model-page-2 (revision-2)'));
    await user.click(
      within(dialog).getByRole('button', {
        name: 'resources.storage.sync.submit'
      })
    );

    await waitFor(() =>
      expect(api.createModelStorageSyncBatch).toHaveBeenCalledWith(
        { profile_id: 3, scope: 'single_model', model_file_id: 31 },
        expect.any(String)
      )
    );
    expect(
      await within(dialog).findByText('resources.storage.syncBatch.result')
    ).toBeInTheDocument();
    expect(api.queryWorkersList).toHaveBeenCalledWith({
      page: 2,
      perPage: 100
    });
    expect(api.queryModelFilesList).toHaveBeenCalledWith({
      page: 2,
      perPage: 100,
      worker_id: 22
    });
  });

  it('列表和详情使用任务冻结的来源与 S3 目标，不查询当前配置', async () => {
    const list = listTask();
    const detail = detailTask();
    api.queryModelStorageSyncTasks.mockResolvedValue({
      items: [list],
      pagination: { page: 1, per_page: 100, total: 1, total_page: 1 }
    });
    api.queryModelStorageSyncTask.mockResolvedValue(detail);
    const { container } = render(<ModelStorageSyncTasks />);
    await screen.findByText('team/model');
    fireEvent.click(
      container.querySelector('.anticon-eye')!.closest('button')!
    );
    expect(await screen.findByText('a100-58')).toBeInTheDocument();
    expect(
      (await screen.findAllByText('center-cache · models/team-a')).length
    ).toBeGreaterThan(1);
    expect(api.queryModelPreheatS3Profiles).not.toHaveBeenCalled();
    expect(api.queryWorkersList).not.toHaveBeenCalled();
  });

  it('冻结字段缺失时只显示 ID 和配置版本', async () => {
    const list = listTask({
      transfer_source: 'peer_via_s3',
      source_worker_name: null,
      profile_name: null,
      profile_endpoint: null,
      profile_bucket: null,
      profile_prefix: null
    });
    const detail = detailTask({
      transfer_source: 'peer_via_s3',
      source_worker_name: null,
      profile: {
        id: 3,
        name: 'center-cache',
        endpoint: 'https://s3.example.com',
        bucket: null,
        prefix: null,
        tls_enabled: true,
        tls_verify: true,
        region: null,
        use_virtual_hosted_style: false,
        config_version: 2,
        system_managed: false
      }
    });
    api.queryModelStorageSyncTasks.mockResolvedValue({
      items: [list],
      pagination: { page: 1, per_page: 100, total: 1, total_page: 1 }
    });
    api.queryModelStorageSyncTask.mockResolvedValue(detail);
    const { container } = render(<ModelStorageSyncTasks />);
    await screen.findByText('team/model');
    fireEvent.click(
      container.querySelector('.anticon-eye')!.closest('button')!
    );
    expect(await screen.findByText('Worker #12')).toBeInTheDocument();
    expect(
      (await screen.findAllByText('S3 Profile #3 · v2')).length
    ).toBeGreaterThan(1);
    expect(api.queryModelPreheatS3Profiles).not.toHaveBeenCalled();
    expect(api.queryWorkersList).not.toHaveBeenCalled();
  });
});
