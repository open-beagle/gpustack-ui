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
  ModelPreheatDistributionPolicy,
  ModelPreheatDistributionPolicyRun,
  ModelPreheatS3Profile,
  ModelStorageArtifact
} from '../config/types';
import ModelDistributionPolicyModal from './model-distribution-policy-modal';
import ModelPreheatPolicies from './model-preheat-policies';

const api = vi.hoisted(() => ({
  createModelPreheatPolicy: vi.fn(),
  deleteModelPreheatPolicy: vi.fn(),
  queryModelPreheatPolicies: vi.fn(),
  queryModelPreheatPolicyRun: vi.fn(),
  queryModelPreheatS3Profiles: vi.fn(),
  queryModelStorageArtifacts: vi.fn(),
  queryWorkersList: vi.fn(),
  reconcileModelPreheatPolicy: vi.fn(),
  updateModelPreheatPolicy: vi.fn()
}));

vi.mock('@umijs/max', () => ({
  request: vi.fn(),
  useLocation: () => ({ pathname: '/resources/modelfiles', search: '' }),
  useNavigate: () => vi.fn(),
  useIntl: () => ({
    formatMessage: ({ id }: { id: string }) => id
  })
}));

vi.mock('../apis', async () => ({
  ...(await vi.importActual('../apis')),
  ...api
}));

const page = <T,>(items: T[], total = items.length) => ({
  items,
  pagination: { page: 1, perPage: 10, total, totalPage: Math.ceil(total / 10) }
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};

const profile: ModelPreheatS3Profile = {
  id: 3,
  name: 'center-cache',
  endpoint: 'https://s3.example.com',
  bucket: 'models',
  credential_configured: true,
  lifecycle_state: 'active',
  ever_used_at: null,
  is_default: true,
  config_version: 1,
  connectivity_state: 'available',
  last_connectivity_check_id: null,
  last_connectivity_checked_at: null,
  created_at: '',
  updated_at: ''
};

const artifact = (id: string): ModelStorageArtifact => ({
  artifact_id: id,
  source: 'modelscope',
  model_id: `team/${id}`,
  resolved_revision: 'main',
  include_patterns: [],
  exclude_patterns: [],
  manifest_digest: `digest-${id}`,
  manifest_path: `manifests/${id}.json`,
  manifest_state: 'valid',
  file_count: 1,
  total_size: 1024,
  last_verified_at: null,
  created_by_task_id: null,
  created_at: '',
  updated_at: ''
});

const summary = {
  total: 4,
  pending: 0,
  running: 1,
  paused: 0,
  ready: 2,
  error: 1,
  failed: 0,
  skipped: 0,
  progress: 75,
  downloaded_bytes: 3072,
  total_bytes: 4096
};

const run = (
  executionState: ModelPreheatDistributionPolicyRun['execution_state']
): ModelPreheatDistributionPolicyRun => ({
  id: 71,
  policy_id: 41,
  policy_name: 'distribution-policy',
  model_id: null,
  trigger: 'manual',
  state: executionState === 'error' ? 'error' : 'pending',
  execution_state: executionState,
  summary,
  tasks: [],
  error_code:
    executionState === 'error' || executionState === 'partial_error'
      ? 'future_distribution_failure'
      : null,
  outcome: null,
  window_start_utc: '2026-08-29T08:00:00Z',
  started_at: '2026-08-29T08:00:00Z',
  finished_at: null,
  created_at: '2026-08-29T08:00:00Z',
  updated_at: '2026-08-29T08:00:01Z'
});

const policy = (
  overrides: Partial<ModelPreheatDistributionPolicy> = {}
): ModelPreheatDistributionPolicy => ({
  id: 41,
  name: 'distribution-policy',
  enabled: true,
  selection_mode: 'selected',
  trigger_mode: 'continuous',
  cron_expression: null,
  timezone: 'UTC',
  profile_id: 3,
  profile_config_version: 1,
  request_identity: { source: 'modelscope', model_id: 'team/artifact-a' },
  request_digest: 'request-digest',
  target_scope: 'selected_workers',
  worker_selector: { worker_uuids: ['worker-a'] },
  gpu_selector: {},
  created_by_task_id: null,
  source_artifact_id: null,
  source_artifact: null,
  artifact_ids: ['artifact-a', 'artifact-b'],
  source_sync_task_id: null,
  profile_version_stale: false,
  blocked_reason: null,
  structural_editable: true,
  latest_run: null,
  last_reconciled_at: null,
  next_run_at: null,
  last_run_at: null,
  created_at: '2026-08-29T08:00:00Z',
  updated_at: '2026-08-29T08:00:00Z',
  ...overrides
});

const selectWorker = async (user: ReturnType<typeof userEvent.setup>) => {
  const field = screen
    .getByText('resources.storage.syncBatch.selectWorker')
    .closest('.ant-form-item')!;
  await user.click(within(field).getByRole('combobox'));
  await user.click(await screen.findByText(/worker-a-name · ready/));
};

const submitModal = async (user: ReturnType<typeof userEvent.setup>) => {
  const save = screen.getByRole('button', { name: 'common.button.save' });
  await waitFor(() => expect(save).toBeEnabled());
  await user.click(save);
  const confirm = (await screen.findAllByRole('dialog')).at(-1)!;
  await user.click(
    within(confirm).getByRole('button', { name: 'common.button.save' })
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  api.queryModelPreheatS3Profiles.mockResolvedValue(page([profile]));
  api.queryWorkersList.mockResolvedValue(
    page([
      {
        id: 12,
        name: 'worker-a-name',
        worker_uuid: 'worker-a',
        state: 'ready',
        ip: '127.0.0.1',
        model_storage_protocol_version: 1,
        status: { gpu_devices: [], filesystem: [] }
      }
    ])
  );
  api.queryModelStorageArtifacts.mockResolvedValue(
    page([artifact('artifact-a'), artifact('artifact-b')])
  );
  api.queryModelPreheatPolicies.mockResolvedValue(page([]));
  api.createModelPreheatPolicy.mockResolvedValue(policy());
  api.updateModelPreheatPolicy.mockResolvedValue(policy());
  api.reconcileModelPreheatPolicy.mockResolvedValue(policy());
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('分发策略 D1 闭环', () => {
  it('Artifact 以当前 Profile 的有效库存为权威', async () => {
    const user = userEvent.setup();
    const backup = {
      ...profile,
      id: 4,
      name: 'backup-cache',
      is_default: false
    };
    const invalid = {
      ...artifact('artifact-invalid'),
      manifest_state: 'invalid'
    };
    api.queryModelPreheatS3Profiles.mockResolvedValue(page([profile, backup]));
    api.queryModelStorageArtifacts.mockImplementation((profileId: number) =>
      Promise.resolve(
        page(
          profileId === backup.id
            ? [artifact('artifact-b')]
            : [artifact('artifact-a'), invalid]
        )
      )
    );
    render(
      <ModelDistributionPolicyModal
        open
        initialProfileId={profile.id}
        initialSelectionMode="selected"
        initialArtifacts={[artifact('artifact-deleted'), invalid]}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />
    );
    await waitFor(() =>
      expect(api.queryModelStorageArtifacts).toHaveBeenCalledWith(
        profile.id,
        expect.any(Object)
      )
    );
    const artifactField = screen
      .getByText('resources.storage.distributionPolicy.artifacts')
      .closest('.ant-form-item')!;
    await user.click(within(artifactField).getByRole('combobox'));
    expect(screen.queryByText(/artifact-deleted/)).not.toBeInTheDocument();
    expect(screen.queryByText(/artifact-invalid/)).not.toBeInTheDocument();
    expect((await screen.findAllByText(/artifact-a/)).length).toBeGreaterThan(
      0
    );
    await user.keyboard('{Escape}');

    const profileField = screen
      .getByText('resources.storage.targetProfile')
      .closest('.ant-form-item')!;
    await user.click(within(profileField).getByRole('combobox'));
    const backupOption = (await screen.findAllByText(backup.name)).find(
      (item) => item.closest('.ant-select-dropdown')
    )!;
    await user.click(backupOption);
    await waitFor(() =>
      expect(api.queryModelStorageArtifacts).toHaveBeenCalledWith(
        backup.id,
        expect.any(Object)
      )
    );
    await user.click(within(artifactField).getByRole('combobox'));
    expect(screen.queryByText(/artifact-a/)).not.toBeInTheDocument();
    expect((await screen.findAllByText(/artifact-b/)).length).toBeGreaterThan(
      0
    );
  });

  it('selected 和 all_current 创建请求严格区分 Artifact 字段', async () => {
    let user = userEvent.setup();
    render(
      <ModelDistributionPolicyModal
        open
        initialProfileId={3}
        initialSelectionMode="selected"
        initialArtifacts={[artifact('artifact-b'), artifact('artifact-a')]}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />
    );
    await user.type(
      await screen.findByLabelText('resources.preheat.policy.name'),
      'selected-policy'
    );
    await selectWorker(user);
    await submitModal(user);
    await waitFor(() =>
      expect(api.createModelPreheatPolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          selection_mode: 'selected',
          artifact_ids: ['artifact-a', 'artifact-b']
        })
      )
    );

    cleanup();
    vi.clearAllMocks();
    api.queryModelPreheatS3Profiles.mockResolvedValue(page([profile]));
    api.queryWorkersList.mockResolvedValue(
      page([
        {
          id: 12,
          name: 'worker-a-name',
          worker_uuid: 'worker-a',
          state: 'ready',
          ip: '127.0.0.1',
          model_storage_protocol_version: 1,
          status: { gpu_devices: [], filesystem: [] }
        }
      ])
    );
    api.queryModelStorageArtifacts.mockResolvedValue(
      page([artifact('artifact-a')])
    );
    api.createModelPreheatPolicy.mockResolvedValue(policy());
    user = userEvent.setup();
    render(
      <ModelDistributionPolicyModal
        open
        initialProfileId={3}
        initialSelectionMode="all_current"
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />
    );
    await user.type(
      await screen.findByLabelText('resources.preheat.policy.name'),
      'all-current-policy'
    );
    await selectWorker(user);
    await submitModal(user);
    await waitFor(() =>
      expect(api.createModelPreheatPolicy).toHaveBeenCalled()
    );
    const payload = api.createModelPreheatPolicy.mock.calls[0][0];
    expect(payload.selection_mode).toBe('all_current');
    expect(payload).not.toHaveProperty('artifact_id');
    expect(payload).not.toHaveProperty('artifact_ids');
  });

  it('未执行策略 PATCH 完整结构，已执行策略只 PATCH 非结构字段', async () => {
    let user = userEvent.setup();
    render(
      <ModelDistributionPolicyModal
        open
        record={policy({ structural_editable: true })}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />
    );
    const editableName = await screen.findByLabelText(
      'resources.preheat.policy.name'
    );
    await user.clear(editableName);
    await user.type(editableName, 'editable-policy');
    await submitModal(user);
    await waitFor(() =>
      expect(api.updateModelPreheatPolicy).toHaveBeenCalledWith(
        41,
        expect.objectContaining({
          name: 'editable-policy',
          selection_mode: 'selected',
          artifact_ids: ['artifact-a', 'artifact-b'],
          profile_id: 3
        })
      )
    );
    expect(api.createModelPreheatPolicy).not.toHaveBeenCalled();

    cleanup();
    vi.clearAllMocks();
    api.queryModelPreheatS3Profiles.mockResolvedValue(page([profile]));
    api.queryWorkersList.mockResolvedValue(page([]));
    api.queryModelStorageArtifacts.mockResolvedValue(page([]));
    api.updateModelPreheatPolicy.mockResolvedValue(policy());
    user = userEvent.setup();
    render(
      <ModelDistributionPolicyModal
        open
        record={policy({
          structural_editable: false,
          latest_run: run('ready')
        })}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />
    );
    const lockedName = await screen.findByLabelText(
      'resources.preheat.policy.name'
    );
    expect(lockedName).toBeEnabled();
    expect(
      screen
        .getByText('resources.storage.targetProfile')
        .closest('.ant-form-item')!
        .querySelector('input')
    ).toBeDisabled();
    await user.clear(lockedName);
    await user.type(lockedName, 'locked-policy-renamed');
    await submitModal(user);
    await waitFor(() =>
      expect(api.updateModelPreheatPolicy).toHaveBeenCalled()
    );
    expect(api.updateModelPreheatPolicy.mock.calls[0]).toEqual([
      41,
      {
        name: 'locked-policy-renamed',
        trigger_mode: 'continuous',
        cron_expression: null,
        timezone: 'UTC'
      }
    ]);
  });

  it('展示真实运行态、汇总、错误并通过 GET 打开安全任务详情', async () => {
    const latest = run('partial_error');
    api.queryModelPreheatPolicies.mockResolvedValue(
      page([policy({ latest_run: latest, last_run_at: latest.started_at })], 21)
    );
    api.queryModelPreheatPolicyRun.mockResolvedValue({
      ...latest,
      tasks: [
        {
          id: 79,
          model_file_id: null,
          worker_id: 10,
          worker_uuid: 'worker-running',
          artifact_id: 'artifact-running',
          state: 'running',
          progress: 25,
          downloaded_bytes: 256,
          total_bytes: 1024,
          error_code: 'must_not_show',
          state_message: 'downloading'
        },
        {
          id: 80,
          model_file_id: null,
          worker_id: 11,
          worker_uuid: 'worker-paused',
          artifact_id: 'artifact-paused',
          state: 'paused',
          progress: 30,
          downloaded_bytes: 300,
          total_bytes: 1024,
          error_code: null,
          state_message: 'pause_requested'
        },
        {
          id: 78,
          model_file_id: null,
          worker_id: 9,
          worker_uuid: 'worker-skipped',
          artifact_id: 'artifact-skipped',
          state: 'skipped',
          progress: 0,
          downloaded_bytes: 0,
          total_bytes: 1024,
          error_code: null,
          state_message: null
        },
        {
          id: 81,
          model_file_id: null,
          worker_id: 12,
          worker_uuid: 'worker-a',
          artifact_id: 'artifact-a',
          state: 'error',
          progress: 50,
          downloaded_bytes: 512,
          total_bytes: 1024,
          error_code: 'future_distribution_failure',
          state_message: 'worker_failed'
        }
      ]
    });

    render(<ModelPreheatPolicies mode="distribution" />);
    const row = (await screen.findByText('distribution-policy')).closest('tr')!;
    expect(
      within(row).getByText(
        'resources.storage.distributionPolicy.execution.partial_error'
      )
    ).toBeInTheDocument();
    expect(
      within(row).getByText(
        'resources.storage.distributionPolicy.progressCount'
      )
    ).toBeInTheDocument();
    expect(
      within(row).getByText('resources.storage.error.unknown')
    ).toBeInTheDocument();
    expect(
      screen.getByText('resources.storage.pagination.total')
    ).toBeInTheDocument();
    await userEvent.click(
      within(row).getByRole('button', {
        name: 'resources.storage.distributionPolicy.runDetail'
      })
    );
    await waitFor(() =>
      expect(api.queryModelPreheatPolicyRun).toHaveBeenCalledWith(71)
    );
    const dialog = (await screen.findAllByRole('dialog')).at(-1)!;
    expect(within(dialog).getByText('artifact-a')).toBeInTheDocument();
    expect(within(dialog).getByText('worker-a')).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'resources.storage.distributionPolicy.taskState.running'
      )
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'resources.storage.distributionPolicy.taskState.paused'
      )
    ).toBeInTheDocument();
    const skippedRow = within(dialog)
      .getByText('artifact-skipped')
      .closest('tr')!;
    expect(
      within(skippedRow).getByText(
        'resources.storage.distributionPolicy.taskState.skipped'
      )
    ).toBeInTheDocument();
    expect(within(skippedRow).getByText('-')).toBeInTheDocument();
    expect(within(dialog).queryByText('downloading')).not.toBeInTheDocument();
    expect(
      within(dialog).queryByText('pause_requested')
    ).not.toBeInTheDocument();
    expect(within(dialog).queryByText('must_not_show')).not.toBeInTheDocument();
    expect(
      within(dialog).getAllByText('future_distribution_failure').length
    ).toBeGreaterThan(0);
    expect(
      within(dialog).queryByText(/lease|credential/i)
    ).not.toBeInTheDocument();
  });

  it('运行详情快速切换时只接受最新请求', async () => {
    const first = deferred<ModelPreheatDistributionPolicyRun>();
    const second = deferred<ModelPreheatDistributionPolicyRun>();
    const firstRun = { ...run('running'), id: 71 };
    const secondRun = { ...run('running'), id: 72 };
    api.queryModelPreheatPolicies.mockResolvedValue(
      page([
        policy({ id: 41, name: 'policy-a', latest_run: firstRun }),
        policy({ id: 42, name: 'policy-b', latest_run: secondRun })
      ])
    );
    api.queryModelPreheatPolicyRun.mockImplementation((id: number) =>
      id === 71 ? first.promise : second.promise
    );
    render(<ModelPreheatPolicies mode="distribution" />);
    const rowA = (await screen.findByText('policy-a')).closest('tr')!;
    const rowB = screen.getByText('policy-b').closest('tr')!;
    fireEvent.click(
      within(rowA).getByRole('button', {
        name: 'resources.storage.distributionPolicy.runDetail'
      })
    );
    fireEvent.click(
      within(rowB).getByRole('button', {
        name: 'resources.storage.distributionPolicy.runDetail'
      })
    );
    second.resolve({
      ...secondRun,
      tasks: [{ ...run('running').tasks[0], id: 82, artifact_id: 'artifact-b' }]
    });
    await screen.findByText('artifact-b');
    first.resolve({
      ...firstRun,
      tasks: [{ ...run('running').tasks[0], id: 81, artifact_id: 'artifact-a' }]
    });
    await act(async () => Promise.resolve());
    expect(screen.queryByText('artifact-a')).not.toBeInTheDocument();
  });

  it('waiting/running/paused 自动轮询，终态停止，手动执行后刷新真实状态', async () => {
    let poll: (() => void) | undefined;
    const nativeSetTimeout = window.setTimeout.bind(window);
    vi.spyOn(window, 'setTimeout').mockImplementation(((
      handler: TimerHandler,
      timeout?: number,
      ...args: unknown[]
    ) => {
      if (typeof handler === 'function' && timeout === 2000) {
        poll = handler;
        return 7001;
      }
      return nativeSetTimeout(handler, timeout, ...args);
    }) as typeof window.setTimeout);
    api.queryModelPreheatPolicies
      .mockResolvedValueOnce(page([policy({ latest_run: run('waiting') })]))
      .mockResolvedValueOnce(page([policy({ latest_run: run('running') })]))
      .mockResolvedValueOnce(page([policy({ latest_run: run('ready') })]));
    const view = render(<ModelPreheatPolicies mode="distribution" />);
    await screen.findByText(
      'resources.storage.distributionPolicy.execution.waiting'
    );
    expect(poll).toBeDefined();
    await act(async () => poll?.());
    await screen.findByText(
      'resources.storage.distributionPolicy.execution.running'
    );
    await act(async () => poll?.());
    await screen.findByText(
      'resources.storage.distributionPolicy.execution.ready'
    );
    const callsAtTerminal = api.queryModelPreheatPolicies.mock.calls.length;
    expect(callsAtTerminal).toBe(3);

    view.unmount();
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    api.queryModelPreheatPolicies.mockResolvedValue(
      page([policy({ latest_run: run('paused') })])
    );
    const timeout = vi.spyOn(window, 'setTimeout');
    render(<ModelPreheatPolicies mode="distribution" />);
    await screen.findByText(
      'resources.storage.distributionPolicy.execution.paused'
    );
    expect(timeout).toHaveBeenCalledWith(expect.any(Function), 2000);

    api.queryModelPreheatPolicies.mockResolvedValueOnce(
      page([policy({ latest_run: run('running') })])
    );
    api.reconcileModelPreheatPolicy.mockResolvedValue(policy());
    fireEvent.click(
      screen.getByRole('button', { name: 'resources.preheat.policy.reconcile' })
    );
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'resources.preheat.policy.reconcile'
      })
    );
    expect(
      await screen.findByText(
        'resources.storage.distributionPolicy.execution.running'
      )
    ).toBeInTheDocument();
  });

  it('轮询失败后继续并恢复到终态', async () => {
    let poll: (() => void) | undefined;
    const nativeSetTimeout = window.setTimeout.bind(window);
    vi.spyOn(window, 'setTimeout').mockImplementation(((
      handler: TimerHandler,
      timeout?: number,
      ...args: unknown[]
    ) => {
      if (typeof handler === 'function' && timeout === 2000) {
        poll = handler;
        return 7002;
      }
      return nativeSetTimeout(handler, timeout, ...args);
    }) as typeof window.setTimeout);
    api.queryModelPreheatPolicies
      .mockResolvedValueOnce(page([policy({ latest_run: run('running') })]))
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce(page([policy({ latest_run: run('ready') })]));
    render(<ModelPreheatPolicies mode="distribution" />);
    await screen.findByText(
      'resources.storage.distributionPolicy.execution.running'
    );
    const failedPoll = poll;
    await act(async () => failedPoll?.());
    expect(poll).not.toBe(failedPoll);
    await act(async () => poll?.());
    expect(
      await screen.findByText(
        'resources.storage.distributionPolicy.execution.ready'
      )
    ).toBeInTheDocument();
  });
});
