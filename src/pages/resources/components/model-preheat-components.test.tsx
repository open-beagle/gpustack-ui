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

  it('删除 Profile 成功后通知外层刷新共享选择', async () => {
    const user = userEvent.setup();
    const onProfilesChanged = vi.fn();
    api.deleteModelPreheatS3Profile.mockResolvedValue(undefined);
    render(<ModelPreheatS3Profiles onProfilesChanged={onProfilesChanged} />);
    const row = await screen.findByText(profile.name).then((cell) => cell.closest('tr')!);
    await user.click(row.querySelector('.anticon-delete')!.closest('button')!);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'common.button.delete' }));
    await waitFor(() => expect(onProfilesChanged).toHaveBeenCalledTimes(1));
  });
});
