import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ModelPreheatConnectivityCheck,
  ModelPreheatDistributionPolicy,
  ModelPreheatS3Profile,
  ModelPreheatTask,
  ModelPreheatWorker
} from '../config/types';
import ModelPreheatModal from './model-preheat-modal';
import ModelPreheatPolicies from './model-preheat-policies';
import ModelPreheatS3Models from './model-preheat-s3-models';
import ModelPreheatS3Profiles from './model-preheat-s3-profiles';
import ModelPreheatTasks from './model-preheat-tasks';

const api = vi.hoisted(() => ({
  queryModelPreheatCachedModels: vi.fn(),
  queryModelPreheatConnectivityCheck: vi.fn(),
  queryModelPreheatPolicies: vi.fn(),
  queryModelPreheatS3Profile: vi.fn(),
  queryModelPreheatS3Profiles: vi.fn(),
  queryModelPreheatTasks: vi.fn(),
  queryWorkersList: vi.fn()
}));

vi.mock('@umijs/max', () => ({
  request: vi.fn(),
  useIntl: () => ({
    formatMessage: ({ id }: { id: string }) => id
  })
}));

vi.mock('../apis', async () => ({
  ...(await vi.importActual('../apis')),
  ...api
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

const worker: ModelPreheatWorker = {
  id: 12,
  worker_uuid: 'worker-a',
  name: 'a100-58',
  state: 'ready',
  status: { gpu_devices: [{ name: 'NVIDIA A100' }] }
};

const policy = (id: number, name: string): ModelPreheatDistributionPolicy => ({
  id,
  name,
  enabled: true,
  cache_key: `cache-${id}`,
  profile_id: 3,
  profile_config_version: 2,
  target_scope: 'same_gpu_model',
  worker_selector: {},
  gpu_selector: {},
  created_by_task_id: 1,
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
  cache_key: 'cache-key',
  generation_id: 'generation',
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
  created_at: '2026-08-11T08:00:00Z',
  updated_at: '2026-08-11T08:00:00Z',
  deduplicated: false,
  ...overrides
});

const page = <T,>(items: T[], current = 1, total = items.length) => ({
  items,
  pagination: {
    page: current,
    per_page: 10,
    total,
    total_page: Math.max(1, Math.ceil(total / 10))
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
  const timeouts: Callback[] = [];
  let interval: Callback | null = null;
  const originalTimeout = window.setTimeout.bind(window);
  const originalInterval = window.setInterval.bind(window);

  vi.spyOn(window, 'setTimeout').mockImplementation(((
    handler: WindowTimerHandler,
    timeout?: number,
    ...args: unknown[]
  ) => {
    if (timeout === delay && typeof handler === 'function') {
      timeouts.push(() => handler(...args));
      return 9001;
    }
    return originalTimeout(handler, timeout, ...args);
  }) as typeof window.setTimeout);
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
    pending: () => timeouts.length + (interval ? 1 : 0),
    runNext: () => {
      const callback = timeouts.shift() || interval;
      if (!callback) throw new Error(`没有 ${delay}ms 轮询回调`);
      callback();
    }
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  api.queryModelPreheatS3Profiles.mockResolvedValue(page([profile]));
  api.queryModelPreheatS3Profile.mockResolvedValue(profile);
  api.queryModelPreheatConnectivityCheck.mockResolvedValue(terminalCheck);
  api.queryModelPreheatCachedModels.mockResolvedValue({
    items: [],
    next_cursor: null
  });
  api.queryModelPreheatPolicies.mockResolvedValue(page([]));
  api.queryModelPreheatTasks.mockResolvedValue(page([]));
  api.queryWorkersList.mockResolvedValue(page([worker]));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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
    fireEvent.click(
      row.querySelector('.anticon-cloud-sync')!.closest('button')!
    );
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
    fireEvent.click(
      row.querySelector('.anticon-cloud-sync')!.closest('button')!
    );
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
  it('库存页可重试 profile 初始加载', async () => {
    const user = userEvent.setup();
    api.queryModelPreheatS3Profiles
      .mockRejectedValueOnce(new Error('profile unavailable'))
      .mockResolvedValueOnce(page([profile]));
    render(<ModelPreheatS3Models />);

    await user.click(
      await screen.findByRole('button', { name: /common\.button\.retry/ })
    );

    await waitFor(() =>
      expect(api.queryModelPreheatS3Profiles).toHaveBeenCalledTimes(2)
    );
    await waitFor(() =>
      expect(api.queryModelPreheatCachedModels).toHaveBeenCalledWith(
        profile.id,
        expect.any(Object)
      )
    );
  });

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
});
