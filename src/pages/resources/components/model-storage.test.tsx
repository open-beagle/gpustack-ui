import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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

vi.mock('@umijs/max', () => ({ useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }) }));
vi.mock('../apis', async () => ({ ...(await vi.importActual('../apis')), ...api }));

const model: ModelFile = { id: 7, source: 'modelscope', model_scope_model_id: 'team/model-a', model_scope_file_path: 'weights/model.gguf', huggingface_repo_id: '', huggingface_filename: '', ollama_library_model_name: '', local_path: '', local_dir: '', worker_id: 2, size: 1024, download_progress: 100, resolved_paths: ['/models/model.gguf'], state: 'ready', state_message: '', resolved_revision: 'abc123', created_at: '', updated_at: '' };
const profile: ModelPreheatS3Profile = { id: 3, name: '默认模型库', endpoint: 'https://s3.example.com', bucket: 'models', prefix: '', tls_enabled: true, tls_verify: true, use_virtual_hosted_style: true, credential_configured: true, provisioning_source: 'manual', provisioning_key: null, system_managed: false, lifecycle_state: 'active', ever_used_at: null, default_slot: 'global', source_fallback_enabled: true, is_default: true, config_version: 1, connectivity_state: 'available', last_connectivity_check_id: 21, last_connectivity_checked_at: null, created_at: '', updated_at: '' };
const page = { items: [profile], pagination: { page: 1, perPage: 100, total: 1, totalPage: 1 } };

const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; };

beforeEach(() => {
  vi.clearAllMocks();
  api.queryModelPreheatS3Profiles.mockResolvedValue(page);
  api.queryModelStorageArtifacts.mockResolvedValue([]);
  api.queryModelStorageCapabilities.mockResolvedValue({ credential_encryption_available: true });
  api.queryModelPreheatConnectivityCheck.mockResolvedValue({ id: 21, profile_id: 3, profile_config_version: 1, state: 'available', summary: { success: 1, failed: 0, not_checked: 0 }, workers: [], created_at: '', updated_at: '', started_at: '', finished_at: '' });
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
    render(<ModelStorageSyncModal open model={model} profiles={[profile]} onCancel={vi.fn()} onCreated={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'resources.storage.sync.submit' }));
    expect(api.createModelStorageSyncTask).toHaveBeenCalledWith({ model_file_id: 7, profile_id: 3 }, expect.any(String));
    expect(within(dialog).getByRole('button', { name: 'common.button.cancel' })).toBeDisabled();
    expect(within(dialog).queryByRole('button', { name: 'Close' })).toBeNull();
    request.resolve({ id: 1 });
  });

  it('同步和库存选择器只展示 active Profile，连通性管理保留维护 Profile', async () => {
    const user = userEvent.setup();
    const maintenance = { ...profile, id: 8, name: '维护配置', lifecycle_state: 'maintenance' as const, is_default: true };
    render(<ModelStorageSyncModal open model={model} profiles={[maintenance, profile]} onCancel={vi.fn()} onCreated={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('combobox'));
    expect(await screen.findByRole('option', { name: profile.name })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: maintenance.name })).not.toBeInTheDocument();

    cleanup();
    api.queryModelPreheatS3Profiles.mockResolvedValue({ ...page, items: [maintenance, profile], pagination: { ...page.pagination, total: 2 } });
    render(<ModelStorage />);
    await user.click(await screen.findByText('resources.storage.artifacts'));
    await user.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('option', { name: profile.name })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: maintenance.name })).not.toBeInTheDocument();

    await user.click(screen.getByText('resources.storage.connectivity'));
    await user.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('option', { name: maintenance.name })).toBeInTheDocument();
  });

  it('编辑态测试连接要求重新输入凭据，并使用后端严格请求字段', async () => {
    const user = userEvent.setup();
    render(<ModelPreheatS3ProfileModal open record={profile} onCancel={vi.fn()} onSaved={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'resources.storage.testConnection' }));
    expect(api.testModelStorageConnection).not.toHaveBeenCalled();
    const passwords = screen.getAllByLabelText(/resources\.preheat\.profile\.(accessKey|secretKey)/);
    await user.type(passwords[0], 'access');
    await user.type(passwords[1], 'secret');
    await user.click(screen.getByRole('button', { name: 'resources.storage.testConnection' }));
    expect(api.testModelStorageConnection).toHaveBeenCalledWith(expect.objectContaining({ endpoint: profile.endpoint, bucket: profile.bucket, access_key: 'access', secret_key: 'secret', tls_enabled: true }));
  });

  it('节点检测通过居中确认发起 Worker API 并展示检测结果', async () => {
    const user = userEvent.setup();
    api.createModelPreheatConnectivityCheck.mockResolvedValue({ id: 22, profile_id: 3, profile_config_version: 1, state: 'available', summary: { success: 1, failed: 0, not_checked: 0 }, workers: [], created_at: '', updated_at: '', started_at: '', finished_at: '' });
    render(<ModelStorage />);
    await user.click(await screen.findByText('resources.storage.connectivity'));
    await user.click(screen.getByRole('button', { name: 'resources.storage.checkWorkers' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.closest('.ant-modal-wrap')).toHaveClass('ant-modal-centered');
    await user.click(within(dialog).getByRole('button', { name: 'resources.storage.checkWorkers' }));
    expect(api.createModelPreheatConnectivityCheck).toHaveBeenCalledWith(3, expect.any(String));
    expect((await screen.findAllByText('resources.preheat.connectivity.status')).length).toBeGreaterThan(0);
  });

  it('库存刷新在后端同步扫描完成后立即回拉 Artifact 列表', async () => {
    const user = userEvent.setup();
    api.refreshModelStorageArtifacts.mockResolvedValue({ job_id: 71 });
    render(<ModelStorage />);
    await screen.findByText('resources.storage.artifacts');
    await user.click(screen.getByText('resources.storage.artifacts'));
    await waitFor(() => expect(api.queryModelStorageArtifacts).toHaveBeenCalledTimes(1));
    api.queryModelStorageArtifacts.mockClear();
    await user.click(screen.getByRole('button', { name: /resources\.storage\.refresh/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /resources\.storage\.refresh/ }));
    expect(api.refreshModelStorageArtifacts).toHaveBeenCalledWith(3);
    await waitFor(() => expect(api.queryModelStorageArtifacts).toHaveBeenCalledWith(3));
  });
});
