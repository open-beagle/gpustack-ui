import {
  cleanup,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModelFile, ModelPreheatS3Profile } from '../config/types';
import ModelPreheatS3ProfileModal from './model-preheat-s3-profile-modal';
import ModelStorage from './model-storage';
import ModelStorageSyncModal from './model-storage-sync-modal';

const api = vi.hoisted(() => ({
  createModelPreheatConnectivityCheck: vi.fn(),
  createModelStorageSyncTask: vi.fn(),
  queryModelPreheatConnectivityCheck: vi.fn(),
  queryModelPreheatS3Profiles: vi.fn(),
  queryModelStorageArtifacts: vi.fn(),
  queryModelStorageCapabilities: vi.fn(),
  refreshModelStorageArtifacts: vi.fn(),
  testModelStorageConnection: vi.fn()
}));

vi.mock('@umijs/max', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id })
}));
vi.mock('../apis', async () => ({
  ...(await vi.importActual('../apis')),
  ...api
}));

const model: ModelFile = {
  id: 7,
  source: 'modelscope',
  model_scope_model_id: 'team/model-a',
  model_scope_file_path: 'weights/model.gguf',
  huggingface_repo_id: '',
  huggingface_filename: '',
  ollama_library_model_name: '',
  local_path: '',
  local_dir: '',
  worker_id: 2,
  size: 1024,
  download_progress: 100,
  resolved_paths: ['/models/model.gguf'],
  state: 'ready',
  state_message: '',
  resolved_revision: 'abc123',
  created_at: '',
  updated_at: ''
};
const profile: ModelPreheatS3Profile = {
  id: 3,
  name: '默认模型库',
  endpoint: 'https://s3.example.com',
  bucket: 'models',
  prefix: '',
  tls_enabled: true,
  tls_verify: true,
  use_virtual_hosted_style: true,
  credential_configured: true,
  provisioning_source: 'manual',
  provisioning_key: null,
  system_managed: false,
  lifecycle_state: 'active',
  ever_used_at: null,
  default_slot: 'global',
  source_fallback_enabled: true,
  is_default: true,
  config_version: 1,
  connectivity_state: 'available',
  last_connectivity_check_id: 21,
  last_connectivity_checked_at: null,
  created_at: '',
  updated_at: ''
};
const page = {
  items: [profile],
  pagination: { page: 1, perPage: 100, total: 1, totalPage: 1 }
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

beforeEach(() => {
  vi.clearAllMocks();
  api.queryModelPreheatS3Profiles.mockResolvedValue(page);
  api.queryModelStorageArtifacts.mockResolvedValue([]);
  api.queryModelStorageCapabilities.mockResolvedValue({
    credential_encryption_available: true
  });
  api.queryModelPreheatConnectivityCheck.mockResolvedValue({
    id: 21,
    profile_id: 3,
    profile_config_version: 1,
    state: 'available',
    summary: { success: 1, failed: 0, not_checked: 0 },
    workers: [],
    created_at: '',
    updated_at: '',
    started_at: '',
    finished_at: ''
  });
});
afterEach(cleanup);

describe('统一模型存储交互', () => {
  it('没有默认 S3 配置时禁止创建同步任务', async () => {
    const maintenance = {
      ...profile,
      lifecycle_state: 'maintenance' as const,
      is_default: true
    };
    render(
      <ModelStorageSyncModal
        open
        model={model}
        profiles={[maintenance]}
        onCancel={vi.fn()}
        onCreated={vi.fn()}
      />
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('resources.storage.sync.noDefault')
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', {
        name: 'resources.storage.sync.submit'
      })
    ).toBeDisabled();
  });

  it('同步确认提交使用稳定 Idempotency-Key，提交中锁定关闭与取消', async () => {
    const user = userEvent.setup();
    const request = deferred<any>();
    api.createModelStorageSyncTask.mockReturnValue(request.promise);
    render(
      <ModelStorageSyncModal
        open
        model={model}
        profiles={[profile]}
        onCancel={vi.fn()}
        onCreated={vi.fn()}
      />
    );
    const dialog = await screen.findByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', {
        name: 'resources.storage.sync.submit'
      })
    );
    expect(api.createModelStorageSyncTask).toHaveBeenCalledWith(
      { model_file_id: 7, profile_id: 3 },
      expect.any(String)
    );
    expect(
      within(dialog).getByRole('button', { name: 'common.button.cancel' })
    ).toBeDisabled();
    expect(within(dialog).queryByRole('button', { name: 'Close' })).toBeNull();
    request.resolve({ id: 1 });
  });

  it('同步确认使用来源节点名称展示实际 Worker 到目标 S3 的流向', async () => {
    render(
      <ModelStorageSyncModal
        open
        model={{ ...model, worker_name: 'beagle-243' }}
        profiles={[profile]}
        onCancel={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getAllByText('beagle-243').length).toBeGreaterThan(0);
    expect(
      within(dialog).getByText('beagle-243 -> 默认模型库')
    ).toBeInTheDocument();
  });

  it('同步和库存选择器只展示 active Profile，连通性管理保留维护 Profile', async () => {
    const user = userEvent.setup();
    const maintenance = {
      ...profile,
      id: 8,
      name: '维护配置',
      lifecycle_state: 'maintenance' as const,
      is_default: true
    };
    render(
      <ModelStorageSyncModal
        open
        model={model}
        profiles={[maintenance, profile]}
        onCancel={vi.fn()}
        onCreated={vi.fn()}
      />
    );
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('combobox'));
    expect(
      await screen.findByRole('option', { name: profile.name })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: maintenance.name })
    ).not.toBeInTheDocument();

    cleanup();
    api.queryModelPreheatS3Profiles.mockResolvedValue({
      ...page,
      items: [maintenance, profile],
      pagination: { ...page.pagination, total: 2 }
    });
    render(<ModelStorage />);
    await user.click(
      await screen.findByRole('tab', { name: 'resources.storage.artifacts' })
    );
    const artifactProfileSelect = screen
      .getAllByRole('combobox')
      .find((element) => !element.closest('[aria-hidden="true"]'));
    expect(artifactProfileSelect).toBeDefined();
    await user.click(artifactProfileSelect!);
    expect(
      await screen.findByRole('option', { name: profile.name })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: maintenance.name })
    ).not.toBeInTheDocument();

    await user.click(screen.getByText('resources.storage.connectivity'));
    await user.click(screen.getByRole('combobox'));
    expect(
      await screen.findByRole('option', { name: maintenance.name })
    ).toBeInTheDocument();
  });

  it('编辑态测试连接要求重新输入凭据，并使用后端严格请求字段', async () => {
    const user = userEvent.setup();
    api.testModelStorageConnection.mockResolvedValue({
      scope: 'server',
      ok: false,
      connection: { ok: true, error_code: null },
      bucket: { ok: false, error_code: 's3_authentication_failed' },
      write: { ok: false, error_code: 'not_reached' },
      read: { ok: false, error_code: 'not_reached' },
      delete: { ok: false, error_code: 'not_reached' },
      error_code: 's3_authentication_failed'
    });
    render(
      <ModelPreheatS3ProfileModal
        open
        record={profile}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />
    );
    const testButton = await screen.findByRole('button', {
      name: 'resources.storage.testConnection'
    });
    expect(testButton).toBeDisabled();
    await user.click(
      screen.getByRole('button', {
        name: 'resources.storage.updateCredentials'
      })
    );
    const passwords = screen.getAllByLabelText(
      /resources\.preheat\.profile\.(accessKey|secretKey)/
    );
    await user.type(passwords[0], 'access');
    await user.type(passwords[1], 'secret');
    await user.click(
      screen.getByRole('button', { name: 'resources.storage.testConnection' })
    );
    expect(api.testModelStorageConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: profile.endpoint,
        bucket: profile.bucket,
        access_key: 'access',
        secret_key: 'secret',
        tls_enabled: true
      })
    );
    expect(
      await screen.findByText('resources.storage.connectionTest.scope.server')
    ).toBeInTheDocument();
    expect(
      screen.getByText('resources.storage.error.authenticationFailed')
    ).toBeInTheDocument();
    for (const [label, code] of [
      [
        'resources.storage.connectionTest.stage.bucket',
        's3_authentication_failed'
      ],
      ['resources.storage.connectionTest.stage.write', 'not_reached'],
      ['resources.storage.connectionTest.stage.read', 'not_reached'],
      ['resources.storage.connectionTest.stage.delete', 'not_reached']
    ]) {
      const stage = screen
        .getByText(label)
        .closest('.ant-descriptions-item-label')!
        .nextElementSibling as HTMLElement;
      expect(within(stage).getAllByText(code)).toHaveLength(1);
      expect(
        within(stage)
          .getByText(code)
          .closest('.ant-typography')
          ?.querySelector('.ant-typography-copy')
      ).not.toBeNull();
    }
  });

  it('节点检测直接发起 Worker API 并展示检测结果', async () => {
    const user = userEvent.setup();
    api.createModelPreheatConnectivityCheck.mockResolvedValue({
      id: 22,
      profile_id: 3,
      profile_config_version: 1,
      state: 'available',
      summary: { success: 1, failed: 0, not_checked: 0 },
      workers: [],
      created_at: '',
      updated_at: '',
      started_at: '',
      finished_at: ''
    });
    render(<ModelStorage />);
    await user.click(await screen.findByText('resources.storage.connectivity'));
    await user.click(
      screen.getByRole('button', { name: 'resources.storage.checkWorkers' })
    );
    await waitFor(() =>
      expect(api.createModelPreheatConnectivityCheck).toHaveBeenCalledWith(
        3,
        expect.any(String)
      )
    );
    expect(
      (await screen.findAllByText('resources.preheat.connectivity.status'))
        .length
    ).toBeGreaterThan(0);
  });

  it('库存扫描直接执行并在后端同步完成后立即回拉 Artifact 列表', async () => {
    const user = userEvent.setup();
    api.refreshModelStorageArtifacts.mockResolvedValue({ job_id: 71 });
    render(<ModelStorage />);
    await screen.findByRole('tab', { name: 'resources.storage.artifacts' });
    await user.click(
      screen.getByRole('tab', { name: 'resources.storage.artifacts' })
    );
    await waitFor(() =>
      expect(api.queryModelStorageArtifacts).toHaveBeenCalledTimes(1)
    );
    api.queryModelStorageArtifacts.mockClear();
    await user.click(
      screen.getByRole('button', { name: /resources\.storage\.refresh/ })
    );
    await waitFor(() =>
      expect(api.refreshModelStorageArtifacts).toHaveBeenCalledWith(
        3,
        expect.any(Object)
      )
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(api.queryModelStorageArtifacts).toHaveBeenCalledWith(
        3,
        { page: 1, perPage: 20 },
        { signal: expect.any(AbortSignal) }
      )
    );
  });

  it('库存扫描失败时保留旧数据并展示可重试错误', async () => {
    const user = userEvent.setup();
    api.queryModelStorageArtifacts.mockResolvedValue([
      {
        artifact_id: 'existing-artifact',
        source: 'modelscope',
        model_id: 'team/existing-model',
        resolved_revision: 'revision-1',
        manifest_digest: 'digest',
        manifest_state: 'valid',
        file_count: 1,
        total_size: 1024,
        last_verified_at: ''
      }
    ]);
    api.refreshModelStorageArtifacts.mockRejectedValue(
      new Error('inventory_scan_failed')
    );

    render(<ModelStorage />);
    await user.click(
      await screen.findByRole('tab', { name: 'resources.storage.artifacts' })
    );
    expect(await screen.findByText('team/existing-model')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /resources\.storage\.refresh/ })
    );

    expect(
      await screen.findByText('resources.storage.state.error')
    ).toBeInTheDocument();
    expect(screen.getByText('team/existing-model')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'resources.storage.retry' })
    ).toBeInTheDocument();
  });

  it('切换 Profile 后忽略旧扫描的成功回拉', async () => {
    const user = userEvent.setup();
    const backup = { ...profile, id: 4, name: '备份模型库', is_default: false };
    const refreshA = deferred<{ job_id: number }>();
    api.queryModelPreheatS3Profiles.mockResolvedValue({
      ...page,
      items: [profile, backup],
      pagination: { ...page.pagination, total: 2 }
    });
    api.queryModelStorageArtifacts
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    api.refreshModelStorageArtifacts.mockReturnValue(refreshA.promise);
    render(<ModelStorage />);
    await user.click(
      await screen.findByRole('tab', { name: 'resources.storage.artifacts' })
    );
    await waitFor(() =>
      expect(api.queryModelStorageArtifacts).toHaveBeenCalledTimes(1)
    );
    await user.click(
      screen.getByRole('button', { name: /resources\.storage\.refresh/ })
    );
    await waitFor(() =>
      expect(api.refreshModelStorageArtifacts).toHaveBeenCalledWith(
        3,
        expect.any(Object)
      )
    );
    const artifactProfileSelect = screen
      .getAllByRole('combobox')
      .find((element) => !element.closest('[aria-hidden="true"]'));
    expect(artifactProfileSelect).toBeDefined();
    await user.click(artifactProfileSelect!);
    await user.click(await screen.findByRole('option', { name: backup.name }));
    refreshA.resolve({ job_id: 71 });
    await Promise.resolve();
    await Promise.resolve();
    expect(api.queryModelStorageArtifacts).toHaveBeenCalledTimes(2);
  });

  it('S3 模型库保留 Ollama Artifact 的原始来源展示', async () => {
    const user = userEvent.setup();
    api.queryModelStorageArtifacts.mockResolvedValue([
      {
        artifact_id: 'ollama-artifact',
        source: 'ollama_library',
        model_id: 'qwen3:32b',
        resolved_revision: 'local-snapshot-1234567890abcdef',
        manifest_digest: 'digest',
        manifest_state: 'valid',
        file_count: 3,
        total_size: 1024,
        last_verified_at: ''
      }
    ]);

    render(<ModelStorage />);
    await user.click(
      await screen.findByRole('tab', { name: 'resources.storage.artifacts' })
    );

    expect(await screen.findByText('Ollama Library')).toBeInTheDocument();
    expect(screen.getByText('qwen3:32b')).toBeInTheDocument();
  });

  it('S3 模型跨页保留有效选择并在切换 Profile 时清空', async () => {
    const user = userEvent.setup();
    const backup = { ...profile, id: 4, name: '备份模型库', is_default: false };
    const artifact = (id: string, manifestState = 'valid') => ({
      artifact_id: id,
      source: 'modelscope',
      model_id: `team/${id}`,
      resolved_revision: 'main',
      include_patterns: [],
      exclude_patterns: [],
      manifest_digest: `digest-${id}`,
      manifest_path: `manifests/${id}.json`,
      manifest_state: manifestState,
      file_count: 1,
      total_size: 1024,
      last_verified_at: '',
      created_by_task_id: null,
      created_at: '',
      updated_at: ''
    });
    api.queryModelPreheatS3Profiles.mockResolvedValue({
      ...page,
      items: [profile, backup],
      pagination: { ...page.pagination, total: 2 }
    });
    api.queryModelStorageArtifacts.mockImplementation(
      (profileId: number, params: { page: number; perPage: number }) => {
        const items =
          profileId === backup.id
            ? []
            : params.page === 1
              ? [
                  artifact('artifact-a'),
                  artifact('artifact-invalid', 'invalid')
                ]
              : [artifact('artifact-b')];
        return Promise.resolve({
          items,
          pagination: {
            page: params.page,
            perPage: 20,
            total: 21,
            totalPage: 2
          }
        });
      }
    );

    render(<ModelStorage />);
    await user.click(
      await screen.findByRole('tab', { name: 'resources.storage.artifacts' })
    );
    const firstRow = (await screen.findByText('team/artifact-a')).closest(
      'tr'
    )!;
    const artifactTable = firstRow.closest('.ant-table-wrapper') as HTMLElement;
    const invalidRow = screen.getByText('team/artifact-invalid').closest('tr')!;
    expect(within(invalidRow).getByRole('checkbox')).toBeDisabled();
    await user.click(within(firstRow).getByRole('checkbox'));
    expect(
      screen.getByText('resources.storage.distributionPolicy.selectedCount')
    ).toBeInTheDocument();

    await user.click(within(artifactTable).getByTitle('2'));
    const secondRow = (await screen.findByText('team/artifact-b')).closest(
      'tr'
    )!;
    await user.click(within(secondRow).getByRole('checkbox'));
    await user.click(within(artifactTable).getByTitle('1'));
    expect(
      within(
        (await screen.findByText('team/artifact-a')).closest('tr')!
      ).getByRole('checkbox')
    ).toBeChecked();

    const activeArtifactPane = screen.getByRole('tabpanel', {
      name: 'resources.storage.artifacts'
    });
    const profileSelector = within(activeArtifactPane)
      .getByText(profile.name)
      .closest('.ant-select')!
      .querySelector<HTMLElement>('[role="combobox"]')!;
    await user.click(profileSelector);
    const backupOption = (await screen.findAllByText(backup.name)).find(
      (element) =>
        element.closest('.ant-select-dropdown') &&
        !element.closest('.ant-select-dropdown-hidden')
    )!;
    await user.click(backupOption);
    await waitFor(() =>
      expect(api.queryModelStorageArtifacts).toHaveBeenCalledWith(
        backup.id,
        expect.objectContaining({ page: 1 }),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    );
    await waitFor(() =>
      expect(
        screen.queryByText('resources.storage.distributionPolicy.selectedCount')
      ).not.toBeInTheDocument()
    );
  });
});
