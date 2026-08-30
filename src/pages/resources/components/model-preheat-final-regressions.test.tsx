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
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ModelPreheatConnectivityCheck,
  ModelPreheatDistributionPolicy,
  ModelPreheatS3Profile,
  ModelPreheatTask,
  ModelPreheatWorker,
  ModelStorageArtifact
} from '../config/types';
import ModelDistributionPolicyModal from './model-distribution-policy-modal';
import ModelPreheatModal from './model-preheat-modal';
import ModelPreheatPolicies from './model-preheat-policies';
import ModelPreheatS3Profiles from './model-preheat-s3-profiles';
import ModelPreheatScheduleModal from './model-preheat-schedule-modal';
import ModelPreheatTasks from './model-preheat-tasks';

const api = vi.hoisted(() => ({
  createModelPreheatConnectivityCheck: vi.fn(),
  createModelPreheatPolicy: vi.fn(),
  createModelPreheatSchedule: vi.fn(),
  deleteModelPreheatTask: vi.fn(),
  queryModelPreheatConnectivityCheck: vi.fn(),
  queryModelPreheatPolicies: vi.fn(),
  queryModelPreheatSchedules: vi.fn(),
  queryModelPreheatS3Profile: vi.fn(),
  queryModelPreheatS3Profiles: vi.fn(),
  queryModelPreheatTask: vi.fn(),
  queryModelPreheatTasks: vi.fn(),
  queryModelStorageArtifacts: vi.fn(),
  queryModelStorageCapabilities: vi.fn(),
  queryModelStorageSyncTask: vi.fn(),
  queryWorkersList: vi.fn()
}));
const repositoryApi = vi.hoisted(() => ({
  queryModelScopeModels: vi.fn(),
  queryHuggingfaceModels: vi.fn(),
  queryModelScopeModelFiles: vi.fn(),
  queryHuggingfaceModelFiles: vi.fn()
}));

vi.mock('@umijs/max', () => ({
  request: vi.fn(),
  useLocation: () => ({ pathname: '/resources/modelfiles', search: '' }),
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

vi.mock('../../llmodels/apis', async () => ({
  ...(await vi.importActual('../../llmodels/apis')),
  ...repositoryApi
}));

const profile: ModelPreheatS3Profile = {
  id: 3,
  name: 'center-cache',
  description: '主缓存',
  endpoint: 'https://s3.example.com',
  bucket: 'models',
  prefix: 'team-a',
  tls_enabled: true,
  tls_verify: true,
  region: 'cn-north-1',
  use_virtual_hosted_style: false,
  is_default: true,
  credential_configured: true,
  lifecycle_state: 'active',
  ever_used_at: null,
  config_version: 2,
  connectivity_state: 'available',
  last_connectivity_check_id: 22,
  last_connectivity_checked_at: '2026-08-11T08:00:00Z',
  created_at: '2026-08-11T07:00:00Z',
  updated_at: '2026-08-11T08:00:00Z'
};

const runningCheck: ModelPreheatConnectivityCheck = {
  id: 22,
  profile_id: 3,
  profile_config_version: 2,
  state: 'running',
  summary: { success: 0, failed: 0, not_checked: 1 },
  workers: [],
  created_at: '2026-08-11T08:00:00Z',
  updated_at: '2026-08-11T08:00:00Z',
  started_at: '2026-08-11T08:00:00Z',
  finished_at: null
};

const terminalCheck: ModelPreheatConnectivityCheck = {
  ...runningCheck,
  state: 'available',
  summary: { success: 1, failed: 0, not_checked: 0 },
  updated_at: '2026-08-11T08:00:10Z',
  finished_at: '2026-08-11T08:00:10Z'
};

const unavailableCheck: ModelPreheatConnectivityCheck = {
  ...terminalCheck,
  summary: { success: 0, failed: 1, not_checked: 0 },
  finished_at: new Date().toISOString(),
  workers: [
    {
      worker_uuid: 'worker-a',
      worker_id: 12,
      worker_name: 'a100-58',
      state: 'error',
      readable: false,
      writable: false,
      deletable: false,
      cleanup_failed: false,
      latency_ms: null,
      error_code: 'access_denied',
      failed_stage: 'write'
    }
  ]
};

const worker: ModelPreheatWorker = {
  id: 12,
  worker_uuid: 'worker-a',
  name: 'a100-58',
  state: 'ready',
  model_storage_protocol_version: 1,
  status: { gpu_devices: [{ name: 'NVIDIA A100' }] }
};

const policy = (id: number, name: string): ModelPreheatDistributionPolicy => ({
  id,
  name,
  enabled: true,
  selection_mode: 'fixed',
  trigger_mode: 'continuous',
  cron_expression: null,
  timezone: 'UTC',
  profile_id: 3,
  profile_config_version: 2,
  request_identity: { source: 'modelscope', model_id: `scheduled/${id}` },
  request_digest: `request-${id}`,
  target_scope: 'same_gpu_model',
  worker_selector: {},
  gpu_selector: {},
  created_by_task_id: 1,
  artifact_ids: [],
  structural_editable: true,
  latest_run: null,
  last_reconciled_at: null,
  created_at: '2026-08-11T08:00:00Z',
  updated_at: '2026-08-11T08:00:00Z'
});

const task = (overrides: Partial<ModelPreheatTask> = {}): ModelPreheatTask => ({
  id: 41,
  attempt: 1,
  source: 'modelscope',
  model_id: 'scheduled/model',
  requested_revision: 'main',
  resolved_revision: 'main',
  include_patterns: [],
  exclude_patterns: [],
  selection_digest: 'selection',
  request_identity: {},
  request_digest: 'request-digest',
  artifact_id: null,
  desired_state: 'running',
  execution_state: 'distributing',
  paused_from_state: null,
  target_scope: 'seed_worker',
  target_worker_uuids: ['worker-a'],
  target_worker_snapshot: [
    { worker_uuid: 'worker-a', worker_id: 12, worker_name: 'a100-58' }
  ],
  s3_profile_id: 3,
  s3_profile_config_version: 2,
  s3_backfill_policy: 'when_missing',
  keep_new_workers_in_sync: false,
  transfer_source: null,
  transfer_profile_id: null,
  source_worker_id: null,
  created_at: '2026-08-11T08:00:00Z',
  updated_at: '2026-08-11T08:00:00Z',
  deduplicated: false,
  ...overrides
});

const page = <T,>(items: T[], current = 1, total = items.length) => ({
  items,
  pagination: {
    page: current,
    perPage: 10,
    total,
    totalPage: Math.max(1, Math.ceil(total / 10))
  }
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const installPollScheduler = (delay: number) => {
  type Callback = () => void;
  type WindowTimerHandler = Parameters<typeof window.setTimeout>[0];
  const timeouts = new Map<number, Callback>();
  let nextTimeoutId = 9001;
  let interval: Callback | null = null;
  const originalTimeout = window.setTimeout.bind(window);
  const originalClearTimeout = window.clearTimeout.bind(window);
  const originalInterval = window.setInterval.bind(window);

  vi.spyOn(window, 'setTimeout').mockImplementation(((
    handler: WindowTimerHandler,
    timeout?: number,
    ...args: unknown[]
  ) => {
    if (timeout === delay && typeof handler === 'function') {
      const id = nextTimeoutId++;
      timeouts.set(id, () => handler(...args));
      return id;
    }
    return originalTimeout(handler, timeout, ...args);
  }) as typeof window.setTimeout);
  vi.spyOn(window, 'clearTimeout').mockImplementation(((id?: number) => {
    if (typeof id === 'number' && timeouts.delete(id)) return;
    originalClearTimeout(id);
  }) as typeof window.clearTimeout);
  vi.spyOn(window, 'setInterval').mockImplementation(((
    handler: WindowTimerHandler,
    timeout?: number,
    ...args: unknown[]
  ) => {
    if (timeout === delay && typeof handler === 'function') {
      interval = () => handler(...args);
      return 9002;
    }
    return originalInterval(handler, timeout, ...args);
  }) as typeof window.setInterval);

  return {
    pending: () => timeouts.size + (interval ? 1 : 0),
    runNext: () => {
      const entry = timeouts.entries().next().value as
        | [number, Callback]
        | undefined;
      if (entry) timeouts.delete(entry[0]);
      const callback = entry?.[1] || interval;
      if (!callback) throw new Error(`没有 ${delay}ms 轮询回调`);
      callback();
    }
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  api.deleteModelPreheatTask.mockResolvedValue({ ok: true });
  api.queryModelPreheatS3Profiles.mockResolvedValue(page([profile]));
  api.queryModelPreheatS3Profile.mockResolvedValue(profile);
  api.queryModelPreheatConnectivityCheck.mockResolvedValue(terminalCheck);
  api.queryModelPreheatPolicies.mockResolvedValue(page([]));
  api.queryModelPreheatSchedules.mockResolvedValue(page([]));
  api.createModelPreheatSchedule.mockResolvedValue({ id: 1 });
  api.createModelPreheatConnectivityCheck.mockResolvedValue({ id: 23 });
  api.queryModelPreheatTasks.mockResolvedValue(page([]));
  api.queryModelStorageCapabilities.mockResolvedValue({
    credential_encryption_available: true,
    model_preheat_enabled: true
  });
  api.queryModelPreheatTask.mockResolvedValue(task());
  api.queryWorkersList.mockResolvedValue(page([worker]));
  repositoryApi.queryModelScopeModels.mockResolvedValue({
    Data: {
      Model: {
        Models: [{ Path: 'team', Name: 'model', Revision: 'master' }],
        TotalCount: 1
      }
    }
  });
  repositoryApi.queryModelScopeModelFiles.mockResolvedValue({
    Data: { Files: [] }
  });
  repositoryApi.queryHuggingfaceModelFiles.mockResolvedValue([]);
});

describe('同步任务快捷创建分发策略', () => {
  it('按同步任务详情预填 Profile 和 Artifact', async () => {
    const user = userEvent.setup();
    const backupProfile = {
      ...profile,
      id: 4,
      name: 'backup-profile',
      is_default: false
    };
    const artifact: ModelStorageArtifact = {
      artifact_id: 'artifact-from-task',
      source: 'huggingface',
      model_id: 'org/model',
      resolved_revision: 'revision-a',
      include_patterns: ['weights/model-Q4_K_M.gguf'],
      exclude_patterns: [],
      manifest_digest: 'digest',
      manifest_path: 'manifests/artifact-from-task.json',
      manifest_state: 'valid',
      file_count: 1,
      total_size: 1024,
      last_verified_at: null,
      created_by_task_id: 41,
      created_at: '',
      updated_at: ''
    };
    api.queryModelStorageSyncTask.mockResolvedValue({
      id: 41,
      state: 'ready',
      artifact_id: artifact.artifact_id,
      profile: { id: profile.id, name: profile.name }
    });
    api.queryModelPreheatS3Profiles.mockResolvedValue(
      page([profile, backupProfile])
    );
    api.queryModelStorageArtifacts.mockImplementation((profileId: number) =>
      Promise.resolve(page(profileId === profile.id ? [artifact] : []))
    );

    render(
      <ModelDistributionPolicyModal
        open
        initialSyncTaskId={41}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(api.queryModelStorageSyncTask).toHaveBeenCalledWith(41)
    );
    expect(
      await screen.findByText(/^Hugging Face · org\/model/)
    ).toBeInTheDocument();
    expect(api.queryModelStorageArtifacts).toHaveBeenCalledWith(profile.id, {
      page: 1,
      perPage: 20
    });

    const profileSelect = screen
      .getByText('resources.storage.targetProfile')
      .closest('.ant-form-item')!
      .querySelector('[role="combobox"]')!;
    await user.click(profileSelect);
    await user.click(await screen.findByText(backupProfile.name));
    await waitFor(() =>
      expect(api.queryModelStorageArtifacts).toHaveBeenCalledWith(
        backupProfile.id,
        { page: 1, perPage: 20 }
      )
    );
    expect(screen.queryByText(/^Hugging Face · org\/model/)).toBeNull();
  });

  it('创建成功后同步通知父级并关闭表单与确认弹窗', async () => {
    const user = userEvent.setup();
    const artifact: ModelStorageArtifact = {
      artifact_id: 'artifact-ready',
      source: 'huggingface',
      model_id: 'org/model',
      resolved_revision: 'revision-a',
      include_patterns: [],
      exclude_patterns: [],
      manifest_digest: 'digest',
      manifest_path: 'manifests/artifact-ready.json',
      manifest_state: 'valid',
      file_count: 1,
      total_size: 1024,
      last_verified_at: null,
      created_by_task_id: 41,
      created_at: '',
      updated_at: ''
    };
    api.queryModelStorageArtifacts.mockResolvedValue(page([artifact]));
    api.createModelPreheatPolicy.mockResolvedValue({ id: 52 });
    const onSaved = vi.fn();
    const Harness = () => {
      const [open, setOpen] = useState(true);
      return (
        <ModelDistributionPolicyModal
          open={open}
          initialProfileId={profile.id}
          initialArtifactId={artifact.artifact_id}
          onCancel={() => setOpen(false)}
          onSaved={() => {
            onSaved();
            setOpen(false);
          }}
        />
      );
    };

    render(<Harness />);

    await screen.findByText(/^Hugging Face · org\/model/);
    await user.type(
      screen.getByLabelText('resources.preheat.policy.name'),
      'distribution-policy'
    );
    const workerSelect = screen
      .getByText('resources.storage.syncBatch.selectWorker')
      .closest('.ant-form-item')!
      .querySelector<HTMLElement>('[role="combobox"]')!;
    await user.click(workerSelect);
    await user.click(await screen.findByText(/a100-58 · ready/));
    await user.click(
      screen.getByRole('button', { name: 'common.button.save' })
    );
    const confirmDialog = (
      await screen.findByText('resources.preheat.confirm.title')
    ).closest<HTMLElement>('[role="dialog"]')!;
    await user.click(
      within(confirmDialog).getByRole('button', {
        name: 'common.button.save'
      })
    );

    await waitFor(() =>
      expect(api.createModelPreheatPolicy).toHaveBeenCalledTimes(1)
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('手动预热连接检测', () => {
  it('重新检测失败后重试复用同一个幂等键', async () => {
    const user = userEvent.setup();
    api.queryModelPreheatConnectivityCheck.mockResolvedValue(unavailableCheck);
    api.createModelPreheatConnectivityCheck
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ id: 23 });
    render(
      <ModelPreheatModal
        open
        initialValues={{
          source: 'modelscope',
          model_id: 'team/model',
          delivery_mode: 's3_only'
        }}
        onCancel={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    await screen.findByRole('dialog');
    const submitTask = await screen.findByRole('button', {
      name: 'resources.preheat.task.submit'
    });
    await waitFor(() => expect(submitTask).toBeEnabled());
    await user.click(submitTask);
    const recheck = (
      await screen.findAllByRole('button', {
        name: 'resources.preheat.connectivity.recheck'
      })
    ).at(-1)!;
    await user.click(recheck);
    const checkDialog = (await screen.findAllByRole('dialog')).at(-1)!;
    const submit = within(checkDialog).getByRole('button', {
      name: 'resources.storage.checkWorkers'
    });
    await user.click(submit);
    await waitFor(() =>
      expect(api.createModelPreheatConnectivityCheck).toHaveBeenCalledTimes(1)
    );
    await user.click(submit);
    await waitFor(() =>
      expect(api.createModelPreheatConnectivityCheck).toHaveBeenCalledTimes(2)
    );

    expect(api.createModelPreheatConnectivityCheck.mock.calls[0][1]).toBe(
      api.createModelPreheatConnectivityCheck.mock.calls[1][1]
    );
  });

  it('高级设置默认折叠，展开后仍可编辑 revision', async () => {
    const user = userEvent.setup();
    render(
      <ModelPreheatModal
        open
        initialValues={{
          source: 'modelscope',
          model_id: 'team/model',
          revision: 'main'
        }}
        onCancel={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    const advanced = await screen.findByText('resources.form.advanced');
    expect(advanced.closest('.ant-collapse-header')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    await user.click(advanced);
    expect(
      await screen.findByLabelText('resources.preheat.revision')
    ).toHaveValue('main');
  });
});

describe('策略分页请求代次', () => {
  it('快速翻页时不让旧页迟到响应覆盖当前页', async () => {
    api.queryModelPreheatPolicies.mockResolvedValueOnce(
      page([policy(1, 'initial-page-one')], 1, 20)
    );
    render(<ModelPreheatPolicies />);
    await screen.findByText('initial-page-one');

    const stalePage =
      deferred<ReturnType<typeof page<ModelPreheatDistributionPolicy>>>();
    api.queryModelPreheatPolicies
      .mockImplementationOnce(() => stalePage.promise)
      .mockResolvedValueOnce(page([policy(2, 'fresh-page-one')], 1, 20));

    fireEvent.click(screen.getByTitle('2'));
    await waitFor(() =>
      expect(api.queryModelPreheatPolicies).toHaveBeenCalledTimes(2)
    );
    fireEvent.click(screen.getByTitle('1'));
    await screen.findByText('fresh-page-one');

    stalePage.resolve(page([policy(3, 'stale-page-two')], 2, 20));
    await act(async () => {
      await stalePage.promise;
    });

    expect(screen.getByText('fresh-page-one')).toBeInTheDocument();
    expect(screen.queryByText('stale-page-two')).not.toBeInTheDocument();
  });
});

describe('定时策略', () => {
  it('从统一入口创建定时策略并使用节点 UUID', async () => {
    const user = userEvent.setup();
    render(
      <ModelPreheatScheduleModal
        open
        initialValues={{ model_id: 'team/model' }}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />
    );
    await screen.findByText('resources.preheat.schedule.create');
    await user.type(
      screen.getByLabelText('resources.preheat.policy.name'),
      'nightly-model'
    );
    await user.click(
      screen.getByRole('button', { name: 'common.button.save' })
    );
    await user.click(
      (await screen.findAllByRole('button', { name: 'common.button.save' })).at(
        -1
      )!
    );

    await waitFor(() =>
      expect(api.createModelPreheatSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'nightly-model',
          model_id: 'team/model',
          s3_profile_id: 3,
          target_worker_uuids: ['worker-a']
        })
      )
    );
  });
});

describe('连通性串行轮询', () => {
  it('慢请求未完成时不发起重叠请求', async () => {
    const scheduler = installPollScheduler(2000);
    const slowCheck = deferred<ModelPreheatConnectivityCheck>();
    api.queryModelPreheatS3Profiles.mockResolvedValue(
      page([{ ...profile, connectivity_state: 'checking' }])
    );
    api.queryModelPreheatConnectivityCheck
      .mockResolvedValueOnce(runningCheck)
      .mockImplementationOnce(() => slowCheck.promise);
    const { container } = render(<ModelPreheatS3Profiles />);

    const row = await screen
      .findByText(profile.name)
      .then((cell) => cell.closest('tr')!);
    fireEvent.click(row.querySelector('.anticon-eye')!.closest('button')!);
    await waitFor(() =>
      expect(api.queryModelPreheatConnectivityCheck).toHaveBeenCalledTimes(1)
    );
    await waitFor(() => expect(scheduler.pending()).toBe(1));

    act(() => scheduler.runNext());
    await waitFor(() =>
      expect(api.queryModelPreheatConnectivityCheck).toHaveBeenCalledTimes(2)
    );
    expect(scheduler.pending()).toBe(0);

    slowCheck.resolve(terminalCheck);
    await act(async () => {
      await slowCheck.promise;
    });
    expect(container).toBeInTheDocument();
  });

  it('连通性进入终态后重新加载 profile 列表', async () => {
    const scheduler = installPollScheduler(2000);
    const checkingProfile = {
      ...profile,
      connectivity_state: 'checking' as const
    };
    api.queryModelPreheatS3Profiles
      .mockResolvedValueOnce(page([checkingProfile]))
      .mockResolvedValueOnce(page([profile]));
    api.queryModelPreheatConnectivityCheck
      .mockResolvedValueOnce(runningCheck)
      .mockResolvedValueOnce(terminalCheck);
    render(<ModelPreheatS3Profiles />);

    const row = await screen
      .findByText(profile.name)
      .then((cell) => cell.closest('tr')!);
    fireEvent.click(row.querySelector('.anticon-eye')!.closest('button')!);
    await waitFor(() => expect(scheduler.pending()).toBe(1));
    act(() => scheduler.runNext());

    await waitFor(() =>
      expect(api.queryModelPreheatS3Profiles).toHaveBeenCalledTimes(2)
    );
    expect(
      await screen.findByText('resources.preheat.state.available')
    ).toBeInTheDocument();
  });
});

describe('首次依赖加载失败恢复', () => {
  it('创建弹窗可重试 worker 和 profile 依赖加载', async () => {
    const user = userEvent.setup();
    api.queryWorkersList
      .mockRejectedValueOnce(new Error('workers unavailable'))
      .mockResolvedValueOnce(page([worker]));
    render(<ModelPreheatModal open onCancel={vi.fn()} onCreated={vi.fn()} />);

    await user.click(
      await screen.findByRole('button', { name: /common\.button\.retry/ })
    );

    await waitFor(() => expect(api.queryWorkersList).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(api.queryModelPreheatS3Profiles).toHaveBeenCalledTimes(2)
    );
  });
});

describe('新任务 Profile 选择', () => {
  it('预热弹窗只展示 active Profile，并从 active 中选择默认项', async () => {
    const user = userEvent.setup();
    const maintenance = {
      ...profile,
      id: 6,
      name: 'maintenance-profile',
      lifecycle_state: 'maintenance' as const,
      is_default: true
    };
    api.queryModelPreheatS3Profiles.mockResolvedValueOnce(
      page([maintenance, profile])
    );
    render(<ModelPreheatModal open onCancel={vi.fn()} onCreated={vi.fn()} />);
    const profileSelect = (
      await screen.findByText('resources.preheat.profile.title')
    )
      .closest('.ant-form-item')!
      .querySelector('[role="combobox"]')!;
    await user.click(profileSelect);
    expect(
      await screen.findByRole('option', { name: profile.name })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: maintenance.name })
    ).not.toBeInTheDocument();
  });
});

describe('任务发现与串行轮询', () => {
  it('暂停确认等待期展示继续而不是暂停', async () => {
    api.queryModelPreheatTasks.mockResolvedValueOnce(
      page([task({ desired_state: 'paused', execution_state: 'distributing' })])
    );
    render(<ModelPreheatTasks />);

    const row = await screen
      .findByText('scheduled/model')
      .then((cell) => cell.closest('tr')!);
    expect(row.querySelector('.anticon-play-circle')).toBeInTheDocument();
    expect(row.querySelector('.anticon-pause-circle')).not.toBeInTheDocument();
  });

  it('详情将 peer_via_s3 显示为本地化业务文案，并携带来源节点与 S3 Profile', async () => {
    const peerTask = task({
      transfer_source: 'peer_via_s3',
      transfer_profile_id: 3,
      source_worker_id: 12
    });
    api.queryModelPreheatTasks.mockResolvedValueOnce(page([peerTask]));
    api.queryModelPreheatTask.mockResolvedValueOnce(peerTask);
    const { container } = render(<ModelPreheatTasks />);
    await screen.findByText('scheduled/model');
    fireEvent.click(
      container.querySelector('.anticon-eye')!.closest('button')!
    );
    expect(
      await screen.findByText(
        'resources.storage.transfer.peer_via_s3:a100-58:center-cache'
      )
    ).toBeInTheDocument();
  });

  it('详情展示后端可选的时间、文件统计和失败原因', async () => {
    const failedTask = {
      ...task({ execution_state: 'error' }),
      started_at: '2026-08-11T08:01:00',
      finished_at: '2026-08-11T08:02:00',
      file_count: 3,
      total_size: 2048,
      state_message: 'worker_execution_failed',
      error_code: 'worker_execution_failed'
    } as ModelPreheatTask;
    api.queryModelPreheatTasks.mockResolvedValueOnce(page([failedTask]));
    api.queryModelPreheatTask.mockResolvedValueOnce(failedTask);

    const { container } = render(<ModelPreheatTasks />);
    await screen.findByText('2026-08-11 08:01:00');
    fireEvent.click(
      container.querySelector('.anticon-eye')!.closest('button')!
    );

    expect(
      await screen.findByText('resources.storage.error.workerExecutionFailed')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'resources.storage.error.workerExecutionFailed.actionHint'
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText('worker_execution_failed')).toHaveLength(1);
    expect(screen.getByText('2.05 KB')).toBeInTheDocument();
  });

  it('终态预热任务通过居中确认弹窗删除', async () => {
    const user = userEvent.setup();
    const terminalTask = task({ execution_state: 'ready' });
    api.queryModelPreheatTasks.mockResolvedValueOnce(page([terminalTask]));

    render(<ModelPreheatTasks />);
    await screen.findByText('scheduled/model');
    await user.click(
      screen.getByRole('button', {
        name: 'resources.preheat.action.delete'
      })
    );

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('resources.preheat.action.deleteConfirm')
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', {
        name: 'resources.preheat.action.delete'
      })
    );

    await waitFor(() =>
      expect(api.deleteModelPreheatTask).toHaveBeenCalledWith(terminalTask.id)
    );
  });

  it('旧后端未返回可选详情字段时仍可打开详情', async () => {
    const legacyTask = task({ execution_state: 'ready' });
    api.queryModelPreheatTasks.mockResolvedValueOnce(page([legacyTask]));
    api.queryModelPreheatTask.mockResolvedValueOnce(legacyTask);

    const { container } = render(<ModelPreheatTasks />);
    await screen.findByText('scheduled/model');
    fireEvent.click(
      container.querySelector('.anticon-eye')!.closest('button')!
    );

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('resources.storage.startedAt')
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('resources.storage.finishedAt')
    ).toBeInTheDocument();
    expect(within(dialog).getAllByText('-').length).toBeGreaterThanOrEqual(2);
  });

  it('列表为空时仍继续轮询并发现 schedule 新任务', async () => {
    const scheduler = installPollScheduler(5000);
    api.queryModelPreheatTasks
      .mockResolvedValueOnce(page([]))
      .mockResolvedValueOnce(page([task()]));
    render(<ModelPreheatTasks />);

    await waitFor(() => expect(api.queryModelPreheatTasks).toHaveBeenCalled());
    await waitFor(() => expect(scheduler.pending()).toBe(1));
    act(() => scheduler.runNext());

    expect(await screen.findByText('scheduled/model')).toBeInTheDocument();
  });

  it('慢任务列表请求未完成时不重叠轮询', async () => {
    const scheduler = installPollScheduler(5000);
    const slowPage = deferred<ReturnType<typeof page<ModelPreheatTask>>>();
    api.queryModelPreheatTasks
      .mockResolvedValueOnce(page([task()]))
      .mockImplementationOnce(() => slowPage.promise);
    render(<ModelPreheatTasks />);

    await screen.findByText('scheduled/model');
    await waitFor(() => expect(scheduler.pending()).toBe(1));
    act(() => scheduler.runNext());
    await waitFor(() =>
      expect(api.queryModelPreheatTasks).toHaveBeenCalledTimes(2)
    );

    expect(scheduler.pending()).toBe(0);
    slowPage.resolve(page([task()]));
    await act(async () => {
      await slowPage.promise;
    });
  });

  it('终态列表手动刷新发现活动任务后恢复串行轮询', async () => {
    const scheduler = installPollScheduler(5000);
    api.queryModelPreheatTasks
      .mockResolvedValueOnce(page([task({ execution_state: 'ready' })]))
      .mockResolvedValueOnce(page([task({ execution_state: 'distributing' })]))
      .mockResolvedValueOnce(page([task({ execution_state: 'ready' })]));
    render(<ModelPreheatTasks />);

    await screen.findByText('scheduled/model');
    expect(scheduler.pending()).toBe(0);
    fireEvent.click(screen.getByText('common.button.refresh'));
    await waitFor(() =>
      expect(api.queryModelPreheatTasks).toHaveBeenCalledTimes(2)
    );
    await waitFor(() => expect(scheduler.pending()).toBe(1));
    act(() => scheduler.runNext());
    await waitFor(() =>
      expect(api.queryModelPreheatTasks).toHaveBeenCalledTimes(3)
    );
  });

  it('活动任务手动刷新会替换旧 timer，始终只保留一条轮询链', async () => {
    const scheduler = installPollScheduler(5000);
    api.queryModelPreheatTasks.mockResolvedValue(page([task()]));
    render(<ModelPreheatTasks />);

    await screen.findByText('scheduled/model');
    await waitFor(() => expect(scheduler.pending()).toBe(1));
    fireEvent.click(screen.getByText('common.button.refresh'));
    await waitFor(() =>
      expect(api.queryModelPreheatTasks).toHaveBeenCalledTimes(2)
    );
    await waitFor(() => expect(scheduler.pending()).toBe(1));
  });

  it('在途任务请求卸载后不重新安排 timer 或发起新查询', async () => {
    const scheduler = installPollScheduler(5000);
    const slowPage = deferred<ReturnType<typeof page<ModelPreheatTask>>>();
    api.queryModelPreheatTasks.mockReturnValueOnce(slowPage.promise);
    const view = render(<ModelPreheatTasks />);

    await waitFor(() =>
      expect(api.queryModelPreheatTasks).toHaveBeenCalledTimes(1)
    );
    view.unmount();
    slowPage.resolve(page([task()]));
    await act(async () => {
      await slowPage.promise;
    });
    expect(scheduler.pending()).toBe(0);
    expect(api.queryModelPreheatTasks).toHaveBeenCalledTimes(1);
  });
});
