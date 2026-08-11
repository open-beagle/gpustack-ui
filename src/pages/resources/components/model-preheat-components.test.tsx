import {
  cleanup,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ModelCacheItem,
  ModelPreheatConnectivityCheck,
  ModelPreheatS3Profile
} from '../config/types';
import ModelCache from './model-cache';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';
import ModelPreheatS3Models from './model-preheat-s3-models';
import ModelPreheatS3ProfileModal from './model-preheat-s3-profile-modal';
import ModelPreheatS3Profiles from './model-preheat-s3-profiles';

const api = vi.hoisted(() => ({
  createModelPreheatInventoryJob: vi.fn(),
  createModelPreheatS3Profile: vi.fn(),
  deleteModelCache: vi.fn(),
  deleteModelPreheatS3Profile: vi.fn(),
  queryModelCache: vi.fn(),
  queryModelPreheatCachedModels: vi.fn(),
  queryModelPreheatConnectivityCheck: vi.fn(),
  queryModelPreheatInventoryJob: vi.fn(),
  queryModelPreheatS3Profiles: vi.fn(),
  updateModelPreheatS3Profile: vi.fn()
}));

const request = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({
  request,
  useIntl: () => ({
    formatMessage: ({ id }: { id: string }, values?: { name?: string }) =>
      values?.name ? `${id}:${values.name}` : id
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
  last_connectivity_check_id: 21,
  last_connectivity_checked_at: '2026-08-11T08:00:00Z',
  created_at: '2026-08-11T07:00:00Z',
  updated_at: '2026-08-11T08:00:00Z'
};

const check: ModelPreheatConnectivityCheck = {
  id: 22,
  profile_id: profile.id,
  profile_config_version: profile.config_version,
  state: 'available',
  summary: { success: 1, failed: 0, not_checked: 0 },
  workers: [],
  created_at: '2026-08-11T08:00:00Z',
  updated_at: '2026-08-11T08:00:01Z',
  started_at: '2026-08-11T08:00:00Z',
  finished_at: '2026-08-11T08:00:01Z'
};

const pageOfProfiles = () => ({
  items: [profile],
  pagination: { page: 1, per_page: 10, total: 1, total_page: 1 }
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

beforeEach(() => {
  vi.clearAllMocks();
  api.queryModelCache.mockResolvedValue({ items: [] });
  api.queryModelPreheatS3Profiles.mockResolvedValue(pageOfProfiles());
  api.queryModelPreheatConnectivityCheck.mockResolvedValue(check);
});

afterEach(() => {
  cleanup();
});

describe('业务确认弹窗', () => {
  it('居中展示，并在请求期间锁定确定、取消和右上角关闭', async () => {
    const onOk = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(
      <ModelPreheatConfirmModal
        open
        title="确认同步"
        content="同步当前配置"
        okText="同步"
        onOk={onOk}
        onCancel={onCancel}
      />
    );

    const dialog = await screen.findByRole('dialog');
    expect(dialog.closest('.ant-modal-wrap')).toHaveClass('ant-modal-centered');
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeEnabled();

    rerender(
      <ModelPreheatConfirmModal
        open
        title="确认同步"
        content="同步当前配置"
        okText="同步"
        loading
        onOk={onOk}
        onCancel={onCancel}
      />
    );

    expect(
      within(dialog).getByRole('button', { name: /同\s*步$/ })
    ).toBeDisabled();
    expect(
      within(dialog).getByRole('button', { name: 'common.button.cancel' })
    ).toBeDisabled();
    expect(within(dialog).queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('模型归档删除使用居中弹窗，并在请求期间锁定关闭操作', async () => {
    const user = userEvent.setup();
    const archivedModel: ModelCacheItem = {
      model_id: 'team/model-a',
      s3_path: 'models/team/model-a',
      file_count: 3,
      total_size: 1024,
      updated_at: '2026-08-19T08:00:00Z'
    };
    const deletion = deferred<void>();
    api.queryModelCache.mockResolvedValue({ items: [archivedModel] });
    api.deleteModelCache.mockImplementation(() => deletion.promise);
    render(<ModelCache />);

    const row = await screen
      .findByText(archivedModel.model_id)
      .then((cell) => cell.closest('tr')!);
    await user.click(
      within(row).getByRole('button', {
        name: 'resources.modelcache.deleteCache'
      })
    );

    const dialog = await screen.findByRole('dialog');
    expect(dialog.closest('.ant-modal-wrap')).toHaveClass('ant-modal-centered');
    await user.click(
      dialog.querySelector<HTMLButtonElement>('.ant-btn-primary')!
    );

    expect(
      within(dialog).getByRole('button', { name: 'common.button.cancel' })
    ).toBeDisabled();
    expect(within(dialog).queryByRole('button', { name: 'Close' })).toBeNull();

    deletion.resolve();
    await waitFor(() => expect(dialog).not.toBeVisible());
  });
});

describe('S3 配置交互', () => {
  it('连通性检测失败保持确认弹窗，重试复用 key，成功后重新打开换 key', async () => {
    const user = userEvent.setup();
    const firstRequest = deferred<ModelPreheatConnectivityCheck>();
    request
      .mockImplementationOnce(() => firstRequest.promise)
      .mockResolvedValue(check);
    render(<ModelPreheatS3Profiles />);

    const row = await screen
      .findByText(profile.name)
      .then((cell) => cell.closest('tr')!);
    const getRecheckButton = () =>
      row.querySelector('.anticon-reload')!.closest('button')!;
    const recheckButton = getRecheckButton();
    await user.click(recheckButton);
    const dialog = (
      await screen.findByText('resources.preheat.connectivity.recheckConfirm')
    ).closest<HTMLElement>('[role="dialog"]')!;
    const getConfirmButton = (target: HTMLElement) =>
      target.querySelector<HTMLButtonElement>('.ant-btn-primary')!;
    await user.click(getConfirmButton(dialog));

    expect(getConfirmButton(dialog)).toBeDisabled();
    expect(
      within(dialog).getByRole('button', {
        name: 'common.button.cancel'
      })
    ).toBeDisabled();
    expect(within(dialog).queryByRole('button', { name: 'Close' })).toBeNull();
    const firstKey = request.mock.calls[0][1].headers['Idempotency-Key'];

    firstRequest.reject(new Error('网络失败'));
    await waitFor(() => expect(getConfirmButton(dialog)).toBeEnabled());
    expect(dialog).toBeInTheDocument();

    await user.click(getConfirmButton(dialog));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1][1].headers['Idempotency-Key']).toBe(firstKey);
    await waitFor(() => expect(dialog).not.toBeVisible());

    await user.click(getRecheckButton());
    await waitFor(() => expect(dialog).toBeVisible());
    await user.click(getConfirmButton(dialog));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(3));
    expect(request.mock.calls[2][1].headers['Idempotency-Key']).not.toBe(
      firstKey
    );
  });

  it('编辑时凭据不回显，留空保存也不提交凭据字段', async () => {
    const user = userEvent.setup();
    api.updateModelPreheatS3Profile.mockResolvedValue(profile);
    render(
      <ModelPreheatS3ProfileModal
        open
        record={profile}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    const accessKey = await screen.findByLabelText(/profile\.accessKey/);
    const secretKey = screen.getByLabelText(/profile\.secretKey/);
    expect(accessKey).toHaveValue('');
    expect(secretKey).toHaveValue('');
    expect(accessKey).toHaveAttribute('type', 'password');
    expect(secretKey).toHaveAttribute('type', 'password');

    await user.click(
      screen.getByRole('button', { name: 'common.button.save' })
    );
    await waitFor(() =>
      expect(api.updateModelPreheatS3Profile).toHaveBeenCalledTimes(1)
    );
    const payload = api.updateModelPreheatS3Profile.mock.calls[0][1];
    expect(payload).not.toHaveProperty('access_key');
    expect(payload).not.toHaveProperty('secret_key');
  });
});

describe('S3 模型分页', () => {
  it('前进时发送 next_cursor，后退时恢复上一页 cursor', async () => {
    const user = userEvent.setup();
    api.queryModelPreheatCachedModels
      .mockResolvedValueOnce({ items: [], next_cursor: 'cursor-page-2' })
      .mockResolvedValueOnce({ items: [], next_cursor: null })
      .mockResolvedValueOnce({ items: [], next_cursor: 'cursor-page-2' });
    render(<ModelPreheatS3Models />);

    await waitFor(() =>
      expect(api.queryModelPreheatCachedModels).toHaveBeenCalledTimes(1)
    );
    expect(
      api.queryModelPreheatCachedModels.mock.calls[0][1].cursor
    ).toBeUndefined();

    await user.click(screen.getByRole('button', { name: 'right' }));
    await waitFor(() =>
      expect(api.queryModelPreheatCachedModels).toHaveBeenCalledTimes(2)
    );
    expect(api.queryModelPreheatCachedModels.mock.calls[1][1].cursor).toBe(
      'cursor-page-2'
    );

    await user.click(screen.getByRole('button', { name: 'left' }));
    await waitFor(() =>
      expect(api.queryModelPreheatCachedModels).toHaveBeenCalledTimes(3)
    );
    expect(
      api.queryModelPreheatCachedModels.mock.calls[2][1].cursor
    ).toBeUndefined();
  });
});
