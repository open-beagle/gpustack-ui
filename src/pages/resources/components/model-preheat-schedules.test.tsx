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
import { message } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ModelPreheatDistributionPolicy,
  ModelPreheatSchedule
} from '../config/types';
import ModelPreheatPolicies from './model-preheat-policies';
import ModelPreheatScheduleModal from './model-preheat-schedule-modal';
import ModelStorageSyncPolicies from './model-storage-sync-policies';

const api = vi.hoisted(() => ({
  createModelPreheatConnectivityCheck: vi.fn(),
  createModelPreheatSchedule: vi.fn(),
  queryModelPreheatConnectivityCheck: vi.fn(),
  queryModelFilesList: vi.fn(),
  queryModelPreheatS3Profile: vi.fn(),
  queryModelPreheatPolicies: vi.fn(),
  queryModelPreheatScheduleRun: vi.fn(),
  queryModelPreheatS3Profiles: vi.fn(),
  queryModelPreheatSchedules: vi.fn(),
  queryModelStorageSyncPolicyRun: vi.fn(),
  queryModelStorageSyncPolicies: vi.fn(),
  queryModelStorageArtifacts: vi.fn(),
  queryModelStorageCapabilities: vi.fn(),
  queryWorkersList: vi.fn(),
  reconcileModelPreheatPolicy: vi.fn(),
  runModelPreheatScheduleNow: vi.fn(),
  runModelStorageSyncPolicyNow: vi.fn(),
  updateModelPreheatSchedule: vi.fn()
}));

const router = vi.hoisted(() => ({
  location: { pathname: '/resources/modelfiles', search: '' },
  navigate: vi.fn()
}));

vi.mock('@umijs/max', () => ({
  request: vi.fn(),
  useLocation: () => router.location,
  useNavigate: () => router.navigate,
  useIntl: () => ({
    formatMessage: ({ id }: { id: string }) => id
  })
}));

vi.mock('../apis', async () => ({
  ...(await vi.importActual('../apis')),
  ...api
}));

const page = <T,>(items: T[]) => ({
  items,
  pagination: {
    page: 1,
    perPage: 10,
    total: items.length,
    totalPage: 1
  }
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const schedule = (
  id: number,
  triggerMode: ModelPreheatSchedule['trigger_mode']
): ModelPreheatSchedule => ({
  id,
  name: `${triggerMode}-policy`,
  enabled: true,
  selection_mode: 'fixed',
  trigger_mode: triggerMode,
  cron_expression: triggerMode === 'scheduled' ? '0 1 * * *' : null,
  timezone: 'UTC',
  window_duration_minutes: 60,
  max_concurrency: 1,
  bandwidth_limit_mbps: null,
  source: 'modelscope',
  model_id: 'Qwen/Test',
  revision: 'main',
  include_patterns: [],
  exclude_patterns: [],
  target_scope: 'selected_workers',
  target_worker_uuids: ['worker-a'],
  seed_worker_uuid: null,
  s3_profile_id: 3,
  s3_backfill_policy: 'when_missing',
  keep_new_workers_in_sync: false,
  next_window_start_utc:
    triggerMode === 'scheduled' ? '2026-08-24T01:00:00Z' : null,
  last_window_start_utc:
    triggerMode === 'scheduled' ? '2026-08-23T01:00:00Z' : null,
  created_at: '2026-08-23T00:00:00Z',
  updated_at: '2026-08-23T00:00:00Z'
});

const distributionPolicy: ModelPreheatDistributionPolicy = {
  id: 41,
  name: 'distribution-policy',
  enabled: true,
  trigger_mode: 'continuous',
  cron_expression: null,
  timezone: 'UTC',
  profile_id: 3,
  profile_config_version: 1,
  request_identity: { source: 'modelscope', model_id: 'Qwen/Test' },
  request_digest: 'request-digest',
  target_scope: 'selected_workers',
  worker_selector: {},
  gpu_selector: {},
  created_by_task_id: null,
  artifact_ids: [],
  structural_editable: true,
  latest_run: null,
  last_reconciled_at: null,
  created_at: '',
  updated_at: ''
};

beforeEach(() => {
  vi.clearAllMocks();
  router.location.search = '';
  api.queryModelPreheatPolicies.mockResolvedValue(page([]));
  api.queryModelStorageArtifacts.mockResolvedValue(page([]));
  api.queryModelStorageCapabilities.mockResolvedValue({
    credential_encryption_available: true,
    model_preheat_enabled: true
  });
  api.queryModelPreheatSchedules.mockResolvedValue(
    page([schedule(1, 'manual'), schedule(2, 'scheduled')])
  );
  api.queryModelPreheatScheduleRun.mockResolvedValue({
    id: 11,
    schedule_id: 1,
    window_start_utc: '2026-08-24T01:00:00Z',
    window_end_utc: '2026-08-24T02:00:00Z',
    trigger: 'manual',
    state: 'ready',
    execution_state: 'ready',
    summary: {
      total: 1,
      pending: 0,
      running: 0,
      paused: 0,
      ready: 1,
      error: 0,
      failed: 0,
      skipped: 0,
      progress: 100,
      downloaded_bytes: 0,
      total_bytes: 0
    },
    tasks: [],
    task_id: 21,
    error_code: null,
    started_at: '2026-08-24T01:00:00Z',
    finished_at: '2026-08-24T01:01:00Z',
    created_at: '2026-08-24T01:00:00Z',
    updated_at: '2026-08-24T01:01:00Z'
  });
  api.queryModelStorageSyncPolicies.mockResolvedValue(
    page([
      {
        id: 31,
        name: 'sync-policy',
        enabled: true,
        trigger_mode: 'manual',
        cron_expression: null,
        timezone: 'UTC',
        profile_id: 3,
        scope: 'all_ready_workers',
        model_file_id: null,
        worker_uuids: [],
        next_run_at: null,
        last_run_at: null,
        latest_run: null,
        created_at: '',
        updated_at: ''
      }
    ])
  );
  api.queryModelStorageSyncPolicyRun.mockResolvedValue({
    id: 12,
    policy_id: 31,
    trigger: 'manual',
    state: 'ready',
    execution_state: 'ready',
    summary: {
      total: 1,
      pending: 0,
      running: 0,
      paused: 0,
      ready: 1,
      error: 0,
      failed: 0,
      skipped: 0,
      progress: 100,
      downloaded_bytes: 0,
      total_bytes: 0
    },
    tasks: [],
    window_start_utc: '2026-08-24T01:00:00Z',
    attempt: 1,
    response_payload: null,
    error_code: null,
    started_at: '2026-08-24T01:00:00Z',
    finished_at: '2026-08-24T01:01:00Z',
    created_at: '2026-08-24T01:00:00Z',
    updated_at: '2026-08-24T01:01:00Z'
  });
  api.queryModelPreheatS3Profiles.mockResolvedValue(
    page([
      {
        id: 3,
        name: 'center-cache',
        lifecycle_state: 'active',
        is_default: true,
        config_version: 1,
        last_connectivity_check_id: 21
      }
    ])
  );
  api.queryModelPreheatS3Profile.mockResolvedValue({
    id: 3,
    name: 'center-cache',
    lifecycle_state: 'active',
    config_version: 1,
    last_connectivity_check_id: 21
  });
  api.queryModelPreheatConnectivityCheck.mockResolvedValue({
    profile_id: 3,
    profile_config_version: 1,
    workers: [],
    finished_at: new Date().toISOString()
  });
  api.queryWorkersList.mockResolvedValue(
    page([
      {
        id: 12,
        worker_uuid: 'worker-a',
        name: 'worker-a',
        state: 'ready',
        model_storage_protocol_version: 1
      }
    ])
  );
  api.queryModelFilesList.mockResolvedValue(page([]));
  api.createModelPreheatSchedule.mockResolvedValue(schedule(1, 'manual'));
  api.runModelPreheatScheduleNow.mockResolvedValue({ id: 9 });
  api.updateModelPreheatSchedule.mockResolvedValue(schedule(1, 'manual'));
});

afterEach(() => {
  cleanup();
  message.destroy();
});

describe('预热策略触发方式', () => {
  it('同步策略使用服务端分页并在筛选、刷新和页大小变化时保留参数', async () => {
    const user = userEvent.setup();
    api.queryModelStorageSyncPolicies.mockResolvedValue({
      ...page([]),
      pagination: { page: 1, perPage: 10, total: 21, totalPage: 3 }
    });
    render(<ModelStorageSyncPolicies />);
    await waitFor(() =>
      expect(api.queryModelStorageSyncPolicies).toHaveBeenCalledWith({
        page: 1,
        perPage: 10
      })
    );

    await user.click(screen.getByTitle('2'));
    await waitFor(() =>
      expect(api.queryModelStorageSyncPolicies).toHaveBeenLastCalledWith({
        page: 2,
        perPage: 10
      })
    );

    const search = screen.getByRole('searchbox', {
      name: 'common.search.name.placeholder'
    });
    await user.type(search, 'team-a{enter}');
    await waitFor(() =>
      expect(api.queryModelStorageSyncPolicies).toHaveBeenLastCalledWith({
        page: 1,
        perPage: 10,
        search: 'team-a'
      })
    );
    await user.click(
      screen.getByRole('button', { name: /common\.button\.refresh/ })
    );
    await waitFor(() =>
      expect(api.queryModelStorageSyncPolicies).toHaveBeenLastCalledWith({
        page: 1,
        perPage: 10,
        search: 'team-a'
      })
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('20 / page'));
    await waitFor(() =>
      expect(api.queryModelStorageSyncPolicies).toHaveBeenLastCalledWith({
        page: 1,
        perPage: 20,
        search: 'team-a'
      })
    );
  });

  it('同步策略空闲时仍低频刷新以发现定时运行', async () => {
    let poll: (() => void) | undefined;
    const nativeSetTimeout = window.setTimeout.bind(window);
    vi.spyOn(window, 'setTimeout').mockImplementation(((
      handler: TimerHandler,
      timeout?: number,
      ...args: unknown[]
    ) => {
      if (typeof handler === 'function' && timeout === 15000) {
        poll = handler;
        return 7150;
      }
      return nativeSetTimeout(handler, timeout, ...args);
    }) as typeof window.setTimeout);

    render(<ModelStorageSyncPolicies />);
    await waitFor(() =>
      expect(api.queryModelStorageSyncPolicies).toHaveBeenCalledTimes(1)
    );
    expect(poll).toBeDefined();

    await act(async () => {
      poll?.();
    });
    await waitFor(() =>
      expect(api.queryModelStorageSyncPolicies).toHaveBeenCalledTimes(2)
    );
  });

  it('服务能力字段关闭时仍允许新建和立即执行', async () => {
    api.queryModelStorageCapabilities.mockResolvedValue({
      credential_encryption_available: true,
      model_preheat_enabled: false
    });

    render(<ModelPreheatPolicies mode="preheat" />);

    expect(
      await screen.findByRole('button', {
        name: /resources\.preheat\.policy\.create/
      })
    ).toBeEnabled();
    expect(
      screen.getAllByRole('button', {
        name: 'resources.preheat.schedule.runNow'
      })[0]
    ).toBeEnabled();
    expect(
      screen.queryByText('resources.preheat.disabledByServer')
    ).not.toBeInTheDocument();
  });

  it('能力查询失败时不阻断新建和立即执行', async () => {
    api.queryModelStorageCapabilities.mockRejectedValue(new Error('network'));

    render(<ModelPreheatPolicies mode="preheat" />);

    expect(
      await screen.findByRole('button', {
        name: /resources\.preheat\.policy\.create/
      })
    ).toBeEnabled();
    expect(
      screen.getAllByRole('button', {
        name: 'resources.preheat.schedule.runNow'
      })[0]
    ).toBeEnabled();
    expect(
      screen.queryByText('resources.preheat.capabilityLoadFailed')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'common.button.retry' })
    ).not.toBeInTheDocument();
  });

  it('策略名称位于表单顶部，且编辑时模型 ID 稳定回显', async () => {
    render(
      <ModelPreheatScheduleModal
        open
        record={schedule(8, 'scheduled')}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    const name = await screen.findByLabelText('resources.preheat.policy.name');
    const source = screen.getByLabelText('models.form.source');
    const model = screen.getByLabelText('resources.preheat.model');

    expect(
      name.compareDocumentPosition(source) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(model).toBeInTheDocument();
    expect(screen.getAllByText('Qwen/Test').length).toBeGreaterThan(0);
  });

  it('S3-only 策略隐藏目标节点控件，并支持 Ollama 来源', async () => {
    render(
      <ModelPreheatScheduleModal
        open
        initialValues={{
          name: 'ollama-s3-only',
          source: 'ollama_library',
          model_id: 'qwen3:32b',
          delivery_mode: 's3_only'
        }}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('resources.preheat.targetScope')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('resources.preheat.targetWorkers')
    ).not.toBeInTheDocument();
  });

  it('手动策略不要求 Cron，并以 null 提交 cron_expression', async () => {
    const user = userEvent.setup();
    render(
      <ModelPreheatScheduleModal
        open
        initialValues={{
          name: 'manual-policy',
          trigger_mode: 'manual',
          source: 'modelscope',
          model_id: 'Qwen/Test',
          revision: '   '
        }}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    expect(
      await screen.findByLabelText('resources.preheat.schedule.triggerMode')
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('resources.preheat.schedule.cron')
    ).not.toBeInTheDocument();
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
          trigger_mode: 'manual',
          cron_expression: null,
          revision: null,
          target_worker_uuids: ['worker-a'],
          s3_profile_id: 3
        })
      )
    );
  });

  it('从手动切换为每天后由共享编辑器同步 scheduled payload', async () => {
    const user = userEvent.setup();
    render(
      <ModelPreheatScheduleModal
        open
        initialValues={{
          name: 'scheduled-policy',
          trigger_mode: 'manual',
          source: 'modelscope',
          model_id: 'Qwen/Test'
        }}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    await user.click(
      await screen.findByLabelText('resources.preheat.schedule.triggerMode')
    );
    await user.click(
      await screen.findByText('resources.preheat.schedule.preset.daily')
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
          trigger_mode: 'scheduled',
          cron_expression: '00 00 * * *'
        })
      )
    );
  });

  it('编辑时清空版本会提交 null', async () => {
    const user = userEvent.setup();
    render(
      <ModelPreheatScheduleModal
        open
        record={schedule(3, 'scheduled')}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    const advanced = await screen.findByText('resources.form.advanced');
    expect(advanced.closest('.ant-collapse-header')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    await user.click(advanced);
    const revision = await screen.findByLabelText('resources.preheat.revision');
    await user.clear(revision);
    await user.click(
      screen.getByRole('button', { name: 'common.button.save' })
    );
    await user.click(
      (await screen.findAllByRole('button', { name: 'common.button.save' })).at(
        -1
      )!
    );

    await waitFor(() =>
      expect(api.updateModelPreheatSchedule).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ revision: null })
      )
    );
  });

  it.each(['s3_and_workers', 's3_only'] as const)(
    '%s 在当前连通性检查明确失败时持久化 override',
    async (deliveryMode) => {
      const user = userEvent.setup();
      api.queryModelPreheatConnectivityCheck.mockResolvedValueOnce({
        profile_id: 3,
        profile_config_version: 1,
        finished_at: new Date().toISOString(),
        workers: [
          {
            worker_uuid: 'worker-a',
            worker_id: 12,
            worker_name: 'worker-a',
            state: 'error'
          }
        ]
      });
      render(
        <ModelPreheatScheduleModal
          open
          initialValues={{
            name: `${deliveryMode}-override`,
            source: 'modelscope',
            model_id: 'Qwen/Test',
            delivery_mode: deliveryMode
          }}
          onCancel={vi.fn()}
          onSaved={vi.fn()}
        />
      );

      await screen.findByRole('dialog');
      await user.click(
        screen.getByRole('button', { name: 'common.button.save' })
      );
      await user.click(
        (
          await screen.findAllByRole('button', {
            name: 'resources.preheat.connectivity.createAnyway'
          })
        ).at(-1)!
      );

      await waitFor(() =>
        expect(api.createModelPreheatSchedule).toHaveBeenCalledWith(
          expect.objectContaining({
            delivery_mode: deliveryMode,
            connectivity_failure_override: true
          })
        )
      );
    }
  );

  it('Schedule 重检失败后同轮复用幂等键，保存成功并重新打开后使用新键', async () => {
    const user = userEvent.setup();
    api.queryModelPreheatConnectivityCheck.mockResolvedValue({
      profile_id: 3,
      profile_config_version: 1,
      finished_at: new Date().toISOString(),
      workers: [
        {
          worker_uuid: 'worker-a',
          worker_id: 12,
          worker_name: 'worker-a',
          state: 'error'
        }
      ]
    });
    api.createModelPreheatConnectivityCheck
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ id: 22 });
    const onSaved = vi.fn();
    const initialValues = {
      name: 'retry-check',
      source: 'modelscope' as const,
      model_id: 'Qwen/Test'
    };
    const modal = (open: boolean) => (
      <ModelPreheatScheduleModal
        open={open}
        initialValues={initialValues}
        onCancel={vi.fn()}
        onSaved={onSaved}
      />
    );
    const { rerender } = render(modal(true));

    await screen.findByRole('dialog');
    await user.click(
      screen.getByRole('button', { name: 'common.button.save' })
    );
    const recheck = (
      await screen.findAllByRole('button', {
        name: 'resources.preheat.connectivity.recheck'
      })
    ).at(-1)!;
    await user.click(recheck);
    await waitFor(() =>
      expect(api.createModelPreheatConnectivityCheck).toHaveBeenCalledTimes(1)
    );
    await user.click(recheck);
    await waitFor(() =>
      expect(api.createModelPreheatConnectivityCheck).toHaveBeenCalledTimes(2)
    );
    expect(api.createModelPreheatConnectivityCheck.mock.calls[0][1]).toBe(
      api.createModelPreheatConnectivityCheck.mock.calls[1][1]
    );

    await user.click(
      (
        await screen.findAllByRole('button', {
          name: 'resources.preheat.connectivity.createAnyway'
        })
      ).at(-1)!
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));

    rerender(modal(false));
    rerender(modal(true));
    await screen.findByRole('dialog');
    await user.click(
      screen.getByRole('button', { name: 'common.button.save' })
    );
    await user.click(
      (
        await screen.findAllByRole('button', {
          name: 'resources.preheat.connectivity.recheck'
        })
      ).at(-1)!
    );
    await waitFor(() =>
      expect(api.createModelPreheatConnectivityCheck).toHaveBeenCalledTimes(3)
    );

    expect(api.createModelPreheatConnectivityCheck.mock.calls[2][1]).not.toBe(
      api.createModelPreheatConnectivityCheck.mock.calls[0][1]
    );
  });

  it('依赖加载失败时展示错误且不产生未处理拒绝', async () => {
    api.queryWorkersList.mockRejectedValueOnce(
      new Error('workers unavailable')
    );
    render(
      <ModelPreheatScheduleModal open onCancel={vi.fn()} onSaved={vi.fn()} />
    );

    expect(
      await screen.findByText('resources.preheat.dependencies.loadFailed')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'common.button.save' })
    ).toBeDisabled();
  });

  it('列表区分手动和定时策略，手动策略可立即执行', async () => {
    const user = userEvent.setup();
    render(<ModelPreheatPolicies />);
    await user.click(
      await screen.findByRole('tab', {
        name: 'resources.preheat.policy.scheduled'
      })
    );

    const manualRow = (await screen.findByText('manual-policy')).closest('tr')!;
    expect(
      within(manualRow).getAllByText(
        'resources.preheat.schedule.triggerMode.manual'
      ).length
    ).toBeGreaterThan(0);
    const scheduledRow = screen.getByText('scheduled-policy').closest('tr')!;
    expect(within(scheduledRow).getByText('0 1 * * *')).toBeInTheDocument();

    await user.click(
      within(manualRow).getByRole('button', {
        name: 'resources.preheat.schedule.runNow'
      })
    );
    const dialog = screen.getByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', {
        name: 'resources.preheat.schedule.runNow'
      })
    );

    await waitFor(() =>
      expect(api.runModelPreheatScheduleNow).toHaveBeenCalledWith(
        1,
        expect.any(String)
      )
    );
  });

  it('立即执行失败后重试使用新的幂等键', async () => {
    const user = userEvent.setup();
    api.runModelPreheatScheduleNow
      .mockRejectedValueOnce({
        response: { data: { reason: 'model_preheat_disabled' } }
      })
      .mockResolvedValueOnce({ id: 10 });
    render(<ModelPreheatPolicies />);
    await user.click(
      await screen.findByRole('tab', {
        name: 'resources.preheat.policy.scheduled'
      })
    );
    const row = (await screen.findByText('manual-policy')).closest('tr')!;
    await user.click(
      within(row).getByRole('button', {
        name: 'resources.preheat.schedule.runNow'
      })
    );
    const submit = within(screen.getByRole('dialog')).getByRole('button', {
      name: 'resources.preheat.schedule.runNow'
    });
    await user.click(submit);
    await waitFor(() =>
      expect(api.runModelPreheatScheduleNow).toHaveBeenCalledTimes(1)
    );
    expect(
      screen.getByText('resources.storage.error.modelPreheatDisabled')
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('dialog')).getAllByText('model_preheat_disabled')
    ).toHaveLength(1);
    expect(
      within(screen.getByRole('dialog'))
        .getByText('model_preheat_disabled')
        .closest('.ant-typography')
        ?.querySelector('.ant-typography-copy')
    ).not.toBeNull();
    await user.click(submit);
    await waitFor(() =>
      expect(api.runModelPreheatScheduleNow).toHaveBeenCalledTimes(2)
    );

    expect(api.runModelPreheatScheduleNow.mock.calls[0][1]).not.toBe(
      api.runModelPreheatScheduleNow.mock.calls[1][1]
    );
  });

  it('同步策略立即执行失败在居中确认框显示本地化原因', async () => {
    const user = userEvent.setup();
    api.runModelStorageSyncPolicyNow.mockRejectedValueOnce({
      response: { data: { reason: 'model_sync_source_not_found' } }
    });
    render(<ModelStorageSyncPolicies />);
    const row = (await screen.findByText('sync-policy')).closest('tr')!;
    await user.click(
      within(row).getByRole('button', {
        name: 'resources.preheat.schedule.runNow'
      })
    );
    const dialog = screen.getByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: 'common.button.confirm' })
    );

    expect(
      await within(dialog).findByText(
        'resources.storage.error.syncSourceNotFound'
      )
    ).toBeInTheDocument();
    expect(
      within(dialog).getAllByText('model_sync_source_not_found')
    ).toHaveLength(1);
    expect(
      within(dialog)
        .getByText('model_sync_source_not_found')
        .closest('.ant-typography')
        ?.querySelector('.ant-typography-copy')
    ).not.toBeNull();
  });

  it('同步策略立即执行成功后打开运行详情并轮询活动状态', async () => {
    const user = userEvent.setup();
    let poll: (() => void) | undefined;
    const nativeSetTimeout = window.setTimeout.bind(window);
    vi.spyOn(window, 'setTimeout').mockImplementation(((
      handler: TimerHandler,
      timeout?: number,
      ...args: unknown[]
    ) => {
      if (typeof handler === 'function' && timeout === 2000) {
        poll = handler;
        return 7101;
      }
      return nativeSetTimeout(handler, timeout, ...args);
    }) as typeof window.setTimeout);
    api.runModelStorageSyncPolicyNow.mockResolvedValueOnce({ id: 12 });
    api.queryModelStorageSyncPolicyRun
      .mockResolvedValueOnce({
        id: 12,
        policy_id: 31,
        trigger: 'manual',
        state: 'pending',
        execution_state: 'running',
        summary: {
          total: 1,
          pending: 0,
          running: 1,
          paused: 0,
          ready: 0,
          error: 0,
          failed: 0,
          skipped: 0,
          progress: 40,
          downloaded_bytes: 400,
          total_bytes: 1000
        },
        tasks: [],
        window_start_utc: '2026-08-24T01:00:00Z',
        attempt: 1,
        response_payload: null,
        error_code: null,
        started_at: '2026-08-24T01:00:00Z',
        finished_at: null,
        created_at: '2026-08-24T01:00:00Z',
        updated_at: '2026-08-24T01:00:30Z'
      })
      .mockResolvedValueOnce({
        id: 12,
        policy_id: 31,
        trigger: 'manual',
        state: 'ready',
        execution_state: 'ready',
        summary: {
          total: 1,
          pending: 0,
          running: 0,
          paused: 0,
          ready: 1,
          error: 0,
          failed: 0,
          skipped: 0,
          progress: 100,
          downloaded_bytes: 1000,
          total_bytes: 1000
        },
        tasks: [],
        window_start_utc: '2026-08-24T01:00:00Z',
        attempt: 1,
        response_payload: null,
        error_code: null,
        started_at: '2026-08-24T01:00:00Z',
        finished_at: '2026-08-24T01:01:00Z',
        created_at: '2026-08-24T01:00:00Z',
        updated_at: '2026-08-24T01:01:00Z'
      });
    render(<ModelStorageSyncPolicies />);

    const row = (await screen.findByText('sync-policy')).closest('tr')!;
    await user.click(
      within(row).getByRole('button', {
        name: 'resources.preheat.schedule.runNow'
      })
    );
    const dialog = screen.getByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: 'common.button.confirm' })
    );

    await screen.findByText('resources.storage.distributionPolicy.runDetail');
    expect(api.runModelStorageSyncPolicyNow).toHaveBeenCalledTimes(1);
    expect(api.queryModelStorageSyncPolicyRun).toHaveBeenCalledWith(31, 12);
    expect(
      await screen.findByText(
        'resources.storage.distributionPolicy.execution.running'
      )
    ).toBeInTheDocument();
    expect(poll).toBeDefined();
    await act(async () => poll?.());
    expect(api.queryModelStorageSyncPolicyRun).toHaveBeenCalledTimes(2);
    expect(
      await screen.findByText(
        'resources.storage.distributionPolicy.execution.ready'
      )
    ).toBeInTheDocument();
  });

  it('同步策略立即执行返回失败状态时打开详情且不提示成功', async () => {
    const user = userEvent.setup();
    api.runModelStorageSyncPolicyNow.mockResolvedValueOnce({
      id: 12,
      execution_state: 'error',
      error_code: 'worker_protocol_unsupported'
    });
    api.queryModelStorageSyncPolicyRun.mockResolvedValueOnce({
      id: 12,
      policy_id: 31,
      trigger: 'manual',
      state: 'error',
      execution_state: 'error',
      summary: {
        total: 1,
        pending: 0,
        running: 0,
        paused: 0,
        ready: 0,
        error: 1,
        failed: 0,
        skipped: 0,
        progress: 100,
        downloaded_bytes: 0,
        total_bytes: 0
      },
      tasks: [],
      window_start_utc: '2026-08-24T01:00:00Z',
      attempt: 1,
      response_payload: null,
      error_code: 'worker_protocol_unsupported',
      started_at: '2026-08-24T01:00:00Z',
      finished_at: '2026-08-24T01:01:00Z',
      created_at: '2026-08-24T01:00:00Z',
      updated_at: '2026-08-24T01:01:00Z'
    });
    render(<ModelStorageSyncPolicies />);

    const row = (await screen.findByText('sync-policy')).closest('tr')!;
    await user.click(
      within(row).getByRole('button', {
        name: 'resources.preheat.schedule.runNow'
      })
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'common.button.confirm'
      })
    );

    expect(
      await screen.findByText('worker_protocol_unsupported')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('common.message.success')
    ).not.toBeInTheDocument();
  });

  it('新建同步策略等待依赖完成后再打开且不闪现旧编辑值', async () => {
    const user = userEvent.setup();
    render(<ModelStorageSyncPolicies />);
    const row = (await screen.findByText('sync-policy')).closest('tr')!;
    await user.click(
      within(row).getByRole('button', { name: 'common.button.edit' })
    );
    const editDialog = await screen.findByRole('dialog');
    await waitFor(() =>
      expect(within(editDialog).getByDisplayValue('sync-policy')).toBeVisible()
    );
    await user.click(
      within(editDialog).getByRole('button', { name: 'common.button.cancel' })
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );

    const profiles = deferred<ReturnType<typeof page>>();
    const workers = deferred<ReturnType<typeof page>>();
    const models = deferred<ReturnType<typeof page>>();
    api.queryModelPreheatS3Profiles.mockReturnValueOnce(profiles.promise);
    api.queryWorkersList.mockReturnValueOnce(workers.promise);
    api.queryModelFilesList.mockReturnValueOnce(models.promise);

    const createButton = screen.getByRole('button', {
      name: /resources\.storage\.syncPolicy\.create/
    });
    await user.click(createButton);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(createButton).toBeDisabled();
    expect(createButton).toHaveClass('ant-btn-loading');

    profiles.resolve(
      page([
        {
          id: 3,
          name: 'center-cache',
          lifecycle_state: 'active',
          is_default: true
        }
      ])
    );
    workers.resolve(page([]));
    models.resolve(page([]));

    const createDialog = await screen.findByRole('dialog');
    expect(
      within(createDialog).getByText('resources.storage.syncPolicy.create')
    ).toBeInTheDocument();
    expect(within(createDialog).queryByDisplayValue('sync-policy')).toBeNull();
    expect(
      within(createDialog).getByText(
        'resources.storage.syncBatch.scope.all_ready_workers'
      )
    ).toBeInTheDocument();
  });

  it('同步策略依赖重试期间取消后迟到响应不会重新打开弹窗', async () => {
    const user = userEvent.setup();
    render(<ModelStorageSyncPolicies />);
    await screen.findByText('sync-policy');
    api.queryModelPreheatS3Profiles.mockRejectedValueOnce(
      new Error('dependency-failed')
    );

    await user.click(
      screen.getByRole('button', {
        name: /resources\.storage\.syncPolicy\.create/
      })
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('resources.storage.state.error')
    ).toBeInTheDocument();

    const profiles = deferred<ReturnType<typeof page>>();
    const workers = deferred<ReturnType<typeof page>>();
    const models = deferred<ReturnType<typeof page>>();
    api.queryModelPreheatS3Profiles.mockReturnValueOnce(profiles.promise);
    api.queryWorkersList.mockReturnValueOnce(workers.promise);
    api.queryModelFilesList.mockReturnValueOnce(models.promise);
    await user.click(
      within(dialog).getByRole('button', {
        name: 'resources.storage.retry'
      })
    );
    const retryButton = within(dialog).getByRole('button', {
      name: /resources\.storage\.retry/
    });
    expect(
      within(dialog).getByText('resources.storage.state.error')
    ).toBeVisible();
    expect(retryButton).toBeDisabled();
    expect(retryButton).toHaveClass('ant-btn-loading');
    expect(within(dialog).getByRole('textbox')).toBeDisabled();
    expect(
      within(dialog).getByRole('button', { name: 'common.button.save' })
    ).toBeDisabled();
    expect(
      within(dialog).getByRole('button', { name: 'common.button.cancel' })
    ).toBeEnabled();
    await user.click(
      within(dialog).getByRole('button', { name: 'common.button.cancel' })
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );

    profiles.resolve(page([]));
    workers.resolve(page([]));
    models.resolve(page([]));
    await act(async () => Promise.resolve());

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('分发策略失败时保留可复制的未知原始错误码', async () => {
    const user = userEvent.setup();
    api.queryModelPreheatPolicies.mockResolvedValueOnce(
      page([distributionPolicy])
    );
    api.reconcileModelPreheatPolicy.mockRejectedValueOnce({
      response: { data: { error_code: 'future_distribution_failure' } }
    });
    render(<ModelPreheatPolicies mode="distribution" />);
    const row = (await screen.findByText('distribution-policy')).closest('tr')!;
    await user.click(
      within(row).getByRole('button', {
        name: 'resources.preheat.policy.reconcile'
      })
    );
    const dialog = screen.getByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', {
        name: 'resources.preheat.policy.reconcile'
      })
    );

    expect(
      await within(dialog).findByText('resources.storage.error.unknown')
    ).toBeInTheDocument();
    expect(
      within(dialog).getAllByText('future_distribution_failure')
    ).toHaveLength(1);
    expect(
      within(dialog)
        .getByText('future_distribution_failure')
        .closest('.ant-typography')
        ?.querySelector('.ant-typography-copy')
    ).not.toBeNull();
  });

  it('立即执行提交中忽略快速重复点击', async () => {
    let resolveRun!: (value: { id: number }) => void;
    api.runModelPreheatScheduleNow.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRun = resolve;
      })
    );
    render(<ModelPreheatPolicies />);
    fireEvent.click(
      await screen.findByRole('tab', {
        name: 'resources.preheat.policy.scheduled'
      })
    );
    const row = (await screen.findByText('manual-policy')).closest('tr')!;
    fireEvent.click(
      within(row).getByRole('button', {
        name: 'resources.preheat.schedule.runNow'
      })
    );
    const submit = within(screen.getByRole('dialog')).getByRole('button', {
      name: 'resources.preheat.schedule.runNow'
    });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(api.runModelPreheatScheduleNow).toHaveBeenCalledTimes(1);
    resolveRun({ id: 11 });
    await screen.findByText('resources.storage.distributionPolicy.runDetail');
    expect(api.queryModelPreheatScheduleRun).toHaveBeenCalledWith(1, 11);
    expect(
      await screen.findByText(
        'resources.storage.distributionPolicy.execution.ready'
      )
    ).toBeInTheDocument();
  });

  it('一条 Schedule 操作提交中不锁定另一条记录', async () => {
    let resolveUpdate!: (value: ModelPreheatSchedule) => void;
    api.updateModelPreheatSchedule.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      })
    );
    render(<ModelPreheatPolicies />);
    fireEvent.click(
      await screen.findByRole('tab', {
        name: 'resources.preheat.policy.scheduled'
      })
    );
    const firstRow = (await screen.findByText('manual-policy')).closest('tr')!;
    const secondRow = screen.getByText('scheduled-policy').closest('tr')!;
    fireEvent.click(
      within(firstRow).getByRole('button', {
        name: 'resources.preheat.policy.disable'
      })
    );
    const confirmDialog = (await screen.findAllByRole('dialog')).at(-1)!;
    fireEvent.click(
      within(confirmDialog).getByRole('button', {
        name: 'resources.preheat.policy.disable'
      })
    );

    await waitFor(() =>
      expect(api.updateModelPreheatSchedule).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ enabled: false })
      )
    );
    expect(
      within(secondRow).getByRole('button', {
        name: 'resources.preheat.policy.disable'
      })
    ).not.toBeDisabled();

    resolveUpdate(schedule(1, 'manual'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });

  it('快捷入口取消后普通新建不会残留模型预填', async () => {
    const user = userEvent.setup();
    router.location.search =
      '?tab=policies&strategy=create&source=modelscope&model=quick/model&revision=main&profile=3';
    render(<ModelPreheatPolicies />);

    let dialog = await screen.findByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: 'common.button.cancel' })
    );
    await user.click(
      screen.getByRole('tab', {
        name: 'resources.preheat.policy.scheduled'
      })
    );
    await user.click(
      screen.getByRole('button', {
        name: /resources\.preheat\.policy\.create/
      })
    );
    expect(await screen.findByLabelText('resources.preheat.model')).toHaveValue(
      ''
    );
  });
});
