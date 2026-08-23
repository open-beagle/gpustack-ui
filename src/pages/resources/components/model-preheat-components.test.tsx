import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModelPreheatS3Profile } from '../config/types';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';
import ModelPreheatS3ProfileModal from './model-preheat-s3-profile-modal';
import ModelPreheatS3Profiles from './model-preheat-s3-profiles';

const api = vi.hoisted(() => ({
  deleteModelPreheatS3Profile: vi.fn(),
  queryModelPreheatS3Profiles: vi.fn(),
  queryModelStorageCapabilities: vi.fn(),
  updateModelPreheatS3Profile: vi.fn()
}));

vi.mock('@umijs/max', () => ({ useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }) }));
vi.mock('../apis', async () => ({ ...(await vi.importActual('../apis')), ...api }));

const profile: ModelPreheatS3Profile = {
  id: 3, name: 'center-cache', endpoint: 'https://s3.example.com', bucket: 'models', prefix: '', tls_enabled: true, tls_verify: true, use_virtual_hosted_style: true, credential_configured: true, is_default: true, config_version: 1, connectivity_state: 'available', last_connectivity_check_id: null, last_connectivity_checked_at: null, created_at: '', updated_at: ''
};
const systemProfile: ModelPreheatS3Profile = {
  ...profile, id: 4, name: 'system-cache', description: '由系统下发', endpoint: 'https://system-s3.example.com', bucket: 'system-models', prefix: 'managed', region: 'cn-north-1', tls_enabled: true, tls_verify: true, use_virtual_hosted_style: false, source_fallback_enabled: true, default_slot: 'global', system_managed: true
};

beforeEach(() => {
  vi.clearAllMocks();
  api.queryModelPreheatS3Profiles.mockResolvedValue({ items: [profile], pagination: { page: 1, perPage: 10, total: 1, totalPage: 1 } });
  api.queryModelStorageCapabilities.mockResolvedValue({ credential_encryption_available: true });
});
afterEach(cleanup);

describe('预热组件回归', () => {
  it('确认弹窗在提交期间锁定确认、取消和关闭', async () => {
    const { rerender } = render(<ModelPreheatConfirmModal open title="确认" content="内容" okText="执行" onOk={vi.fn()} onCancel={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    rerender(<ModelPreheatConfirmModal open title="确认" content="内容" okText="执行" loading onOk={vi.fn()} onCancel={vi.fn()} />);
    expect(within(dialog).getByRole('button', { name: /执\s*行/ })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'common.button.cancel' })).toBeDisabled();
    expect(within(dialog).queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('编辑 Profile 时不回显凭据，留空保存不回传凭据字段', async () => {
    const user = userEvent.setup();
    api.updateModelPreheatS3Profile.mockResolvedValue(profile);
    render(<ModelPreheatS3ProfileModal open record={profile} onCancel={vi.fn()} onSaved={vi.fn()} />);
    expect(await screen.findByLabelText(/profile\.accessKey/)).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'common.button.save' }));
    await waitFor(() => expect(api.updateModelPreheatS3Profile).toHaveBeenCalled());
    expect(api.updateModelPreheatS3Profile.mock.calls[0][1]).not.toMatchObject({ access_key: expect.anything(), secret_key: expect.anything() });
  });

  it('系统管理 Profile 可从列表编辑，仅允许修改四个开关并使用精简 PATCH 载荷', async () => {
    const user = userEvent.setup();
    api.queryModelPreheatS3Profiles.mockResolvedValue({ items: [systemProfile], pagination: { page: 1, perPage: 10, total: 1, totalPage: 1 } });
    api.updateModelPreheatS3Profile.mockResolvedValue(systemProfile);
    render(<ModelPreheatS3Profiles />);
    const row = await screen.findByText(systemProfile.name).then((cell) => cell.closest('tr')!);
    await user.click(row.querySelector('.anticon-edit')!.closest('button')!);
    expect(await screen.findByLabelText('resources.preheat.profile.name')).toBeDisabled();
    expect(screen.getByLabelText('resources.preheat.profile.endpoint')).toBeDisabled();
    expect(screen.getByLabelText('resources.preheat.profile.bucket')).toBeDisabled();
    expect(screen.getByLabelText('resources.preheat.profile.accessKey')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'resources.storage.testConnection' })).not.toBeInTheDocument();
    expect(screen.queryByText('resources.storage.connectionScope')).not.toBeInTheDocument();
    const tlsEnabled = screen.getByRole('switch', { name: /resources\.preheat\.profile\.tlsEnabled/ });
    const tlsVerify = screen.getByRole('switch', { name: /resources\.preheat\.profile\.tlsVerify/ });
    const virtualHosted = screen.getByRole('switch', { name: /resources\.preheat\.profile\.virtualHosted/ });
    const sourceFallback = screen.getByRole('switch', { name: /resources\.storage\.sourceFallback/ });
    expect(tlsEnabled).toBeEnabled();
    expect(tlsVerify).toBeEnabled();
    expect(virtualHosted).toBeEnabled();
    expect(sourceFallback).toBeEnabled();
    const switchColumn = tlsEnabled.closest('.ant-form-item')!.parentElement!;
    expect(switchColumn).toHaveClass('ant-col-xs-24', 'ant-col-sm-12');
    expect(switchColumn).not.toHaveClass('ant-col-xl-6');
    expect(screen.getByLabelText('resources.storage.tlsEnabledHint')).toBeInTheDocument();
    expect(screen.getByLabelText('resources.storage.tlsVerifyHint')).toBeInTheDocument();
    expect(screen.getByLabelText('resources.storage.virtualHostedHint')).toBeInTheDocument();
    expect(screen.getByLabelText('resources.storage.sourceFallbackDetail')).toBeInTheDocument();
    await user.click(tlsEnabled);
    await user.click(tlsVerify);
    await user.click(virtualHosted);
    await user.click(sourceFallback);
    await user.click(screen.getByRole('button', { name: 'common.button.save' }));
    await waitFor(() => expect(api.updateModelPreheatS3Profile).toHaveBeenCalledWith(4, { default_slot: 'global', tls_enabled: false, tls_verify: false, use_virtual_hosted_style: true, source_fallback_enabled: false }));
  });

  it('系统管理 Profile 在凭据加密不可用时禁止保存并展示错误', async () => {
    api.queryModelStorageCapabilities.mockResolvedValue({ credential_encryption_available: false });
    render(<ModelPreheatS3ProfileModal open record={systemProfile} onCancel={vi.fn()} onSaved={vi.fn()} />);
    expect(await screen.findByText('resources.storage.encryptionUnavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.button.save' })).toBeDisabled();
    expect(screen.queryByText('resources.storage.connectionScope')).not.toBeInTheDocument();
  });

  it('Profile 名称与状态标签分层显示，避免窄列把中文名称压成竖排', async () => {
    const target = { ...systemProfile, name: '系统模型库', is_default: true };
    api.queryModelPreheatS3Profiles.mockResolvedValue({ items: [target], pagination: { page: 1, perPage: 10, total: 1, totalPage: 1 } });
    render(<ModelPreheatS3Profiles />);

    const name = await screen.findByText(target.name);
    const nameCell = name.closest('.model-preheat-profile-name-cell');
    expect(name).toHaveClass('model-preheat-profile-name-text');
    expect(nameCell).not.toBeNull();
    expect(nameCell?.querySelector('.model-preheat-profile-name-tags')).toContainElement(
      screen.getByText('resources.storage.systemProfile')
    );
    expect(nameCell?.querySelector('.model-preheat-profile-name-tags')).toContainElement(
      screen.getByText('resources.preheat.profile.default')
    );
    expect(name.closest('.model-preheat-profile-name-tags')).toBeNull();
  });

  it('系统非默认 Profile 可通过居中确认切换为默认并刷新共享列表', async () => {
    const user = userEvent.setup();
    const onProfilesChanged = vi.fn();
    const defaultProfile = { ...profile, id: 21, name: 'manual-default' };
    const target = { ...systemProfile, id: 22, name: 'system-secondary', is_default: false };
    api.queryModelPreheatS3Profiles.mockResolvedValue({ items: [defaultProfile, target], pagination: { page: 1, perPage: 10, total: 2, totalPage: 1 } });
    api.updateModelPreheatS3Profile.mockResolvedValue({ ...target, is_default: true });
    render(<ModelPreheatS3Profiles onProfilesChanged={onProfilesChanged} />);

    const row = await screen.findByText(target.name).then((cell) => cell.closest('tr')!);
    const setDefaultButton = within(row).getByRole('button', { name: 'resources.storage.setDefault' });
    expect(setDefaultButton).toBeEnabled();
    await user.click(setDefaultButton);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('resources.storage.setDefaultContent')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'resources.storage.setDefault' }));

    await waitFor(() => expect(api.updateModelPreheatS3Profile).toHaveBeenCalledWith(target.id, { default_slot: 'global' }));
    await waitFor(() => expect(api.queryModelPreheatS3Profiles).toHaveBeenCalledTimes(2));
    expect(onProfilesChanged).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['普通非默认', { ...profile, id: 11, name: 'manual-cache', is_default: false, system_managed: false }, 'resources.preheat.profile.deleteContent'],
    ['默认非系统', { ...profile, id: 12, name: 'default-cache', is_default: true, system_managed: false }, 'resources.preheat.profile.deleteContent.default'],
    ['系统非默认', { ...systemProfile, id: 13, name: 'system-cache', is_default: false }, 'resources.preheat.profile.deleteContent.system'],
    ['系统默认', { ...systemProfile, id: 14, name: 'system-default-cache', is_default: true }, 'resources.preheat.profile.deleteContent.systemDefault']
  ])('%s Profile 可确认删除并刷新共享列表', async (_state, target, contentId) => {
    const user = userEvent.setup();
    const onProfilesChanged = vi.fn();
    api.queryModelPreheatS3Profiles.mockResolvedValue({ items: [target], pagination: { page: 1, perPage: 10, total: 1, totalPage: 1 } });
    api.deleteModelPreheatS3Profile.mockResolvedValue(undefined);
    render(<ModelPreheatS3Profiles onProfilesChanged={onProfilesChanged} />);
    const row = await screen.findByText(target.name).then((cell) => cell.closest('tr')!);
    const deleteButton = row.querySelector('.anticon-delete')?.closest('button');
    expect(deleteButton).not.toBeNull();
    await user.click(deleteButton!);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(contentId)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'common.button.delete' }));
    await waitFor(() => expect(api.deleteModelPreheatS3Profile).toHaveBeenCalledWith(target.id));
    await waitFor(() => expect(api.queryModelPreheatS3Profiles).toHaveBeenCalledTimes(2));
    expect(onProfilesChanged).toHaveBeenCalledTimes(1);
  });
});
