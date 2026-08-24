import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModelPreheatSchedule } from '../config/types';
import ModelPreheatPolicies from './model-preheat-policies';
import ModelPreheatScheduleModal from './model-preheat-schedule-modal';

const api = vi.hoisted(() => ({
  createModelPreheatConnectivityCheck: vi.fn(),
  createModelPreheatSchedule: vi.fn(),
  queryModelPreheatConnectivityCheck: vi.fn(),
  queryModelPreheatS3Profile: vi.fn(),
  queryModelPreheatPolicies: vi.fn(),
  queryModelPreheatS3Profiles: vi.fn(),
  queryModelPreheatSchedules: vi.fn(),
  queryWorkersList: vi.fn(),
  runModelPreheatScheduleNow: vi.fn(),
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

const schedule = (
  id: number,
  triggerMode: ModelPreheatSchedule['trigger_mode']
): ModelPreheatSchedule => ({
  id,
  name: `${triggerMode}-policy`,
  enabled: true,
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

beforeEach(() => {
  vi.clearAllMocks();
  router.location.search = '';
  api.queryModelPreheatPolicies.mockResolvedValue(page([]));
  api.queryModelPreheatSchedules.mockResolvedValue(
    page([schedule(1, 'manual'), schedule(2, 'scheduled')])
  );
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
    page([{
      id: 12,
      worker_uuid: 'worker-a',
      name: 'worker-a',
      state: 'ready',
      model_storage_protocol_version: 1
    }])
  );
  api.createModelPreheatSchedule.mockResolvedValue(schedule(1, 'manual'));
  api.runModelPreheatScheduleNow.mockResolvedValue({ id: 9 });
  api.updateModelPreheatSchedule.mockResolvedValue(schedule(1, 'manual'));
});

afterEach(cleanup);

describe('预热策略触发方式', () => {
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
      (await screen.findAllByRole('button', { name: 'common.button.save' })).at(-1)!
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
      (await screen.findAllByRole('button', { name: 'common.button.save' })).at(-1)!
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
      await user.click(screen.getByRole('button', { name: 'common.button.save' }));
      await user.click(
        (await screen.findAllByRole('button', {
          name: 'resources.preheat.connectivity.createAnyway'
        })).at(-1)!
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
    await user.click(screen.getByRole('button', { name: 'common.button.save' }));
    const recheck = (await screen.findAllByRole('button', {
      name: 'resources.preheat.connectivity.recheck'
    })).at(-1)!;
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
      (await screen.findAllByRole('button', {
        name: 'resources.preheat.connectivity.createAnyway'
      })).at(-1)!
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));

    rerender(modal(false));
    rerender(modal(true));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'common.button.save' }));
    await user.click(
      (await screen.findAllByRole('button', {
        name: 'resources.preheat.connectivity.recheck'
      })).at(-1)!
    );
    await waitFor(() =>
      expect(api.createModelPreheatConnectivityCheck).toHaveBeenCalledTimes(3)
    );

    expect(api.createModelPreheatConnectivityCheck.mock.calls[2][1]).not.toBe(
      api.createModelPreheatConnectivityCheck.mock.calls[0][1]
    );
  });

  it('依赖加载失败时展示错误且不产生未处理拒绝', async () => {
    api.queryWorkersList.mockRejectedValueOnce(new Error('workers unavailable'));
    render(
      <ModelPreheatScheduleModal
        open
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />
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

  it('立即执行失败后重试复用同一个幂等键', async () => {
    const user = userEvent.setup();
    api.runModelPreheatScheduleNow
      .mockRejectedValueOnce(new Error('temporary failure'))
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
    await user.click(submit);
    await waitFor(() =>
      expect(api.runModelPreheatScheduleNow).toHaveBeenCalledTimes(2)
    );

    expect(api.runModelPreheatScheduleNow.mock.calls[0][1]).toBe(
      api.runModelPreheatScheduleNow.mock.calls[1][1]
    );
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
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
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
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
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
    expect(
      await screen.findByLabelText('resources.preheat.model')
    ).toHaveValue('');
  });
});
