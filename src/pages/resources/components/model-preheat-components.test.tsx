import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import routes from '../../../../config/routes';
import type {
  ModelCacheItem,
  ModelCacheTask,
  ModelPreheatConnectivityCheck,
  ModelPreheatS3Profile
} from '../config/types';
import ModelCache from './model-cache';
import ModelFiles from './model-files';
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
  queryModelCacheTasks: vi.fn(),
  queryModelPreheatCachedModels: vi.fn(),
  queryModelPreheatConnectivityCheck: vi.fn(),
  queryModelPreheatInventoryJob: vi.fn(),
  queryModelPreheatS3Profiles: vi.fn(),
  queryWorkersList: vi.fn(),
  updateModelPreheatS3Profile: vi.fn()
}));

const request = vi.hoisted(() => vi.fn());

vi.mock('@/components/icon-font', () => ({ default: () => null }));
vi.mock('@/components/icon-font/icons', () => ({ default: {} }));

vi.mock('@umijs/max', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const subscribe = (callback: () => void) => {
    window.addEventListener('popstate', callback);
    return () => window.removeEventListener('popstate', callback);
  };
  const getSnapshot = () =>
    `${window.location.pathname}${window.location.search}${window.location.hash}`;

  return {
    request,
    useIntl: () => ({
      formatMessage: ({ id }: { id: string }, values?: { name?: string }) =>
        values?.name ? `${id}:${values.name}` : id
    }),
    useLocation: () => {
      React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
      return {
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash
      };
    },
    useNavigate: () => (to: string, options?: { replace?: boolean }) => {
      window.history[options?.replace ? 'replaceState' : 'pushState'](
        null,
        '',
        to
      );
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };
});

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
  window.history.replaceState(null, '', '/');
  api.queryModelCache.mockResolvedValue({ items: [] });
  api.queryModelCacheTasks.mockResolvedValue({ items: [] });
  api.queryWorkersList.mockResolvedValue({ items: [] });
  api.queryModelPreheatS3Profiles.mockResolvedValue(pageOfProfiles());
  api.queryModelPreheatConnectivityCheck.mockResolvedValue(check);
});

afterEach(() => {
  cleanup();
});

describe.skip('已废弃的模型归档入口', () => {
  const archiveTask: ModelCacheTask = {
    id: 42,
    model_file_id: 7,
    worker_id: 3,
    model_id: 'team/model-a',
    target_path: 'models/team/model-a',
    state: 'uploading',
    progress: 50,
    uploaded_size: 512,
    total_size: 1024,
    created_at: '2026-08-19T08:00:00Z',
    updated_at: '2026-08-19T08:01:00Z'
  };

  it('旧模型归档路由保留但不显示在资源菜单', () => {
    const resourcesRoute = routes.find((route) => route.path === '/resources');
    const archiveRoute = resourcesRoute?.routes?.find(
      (route) => route.path === '/resources/model-cache'
    );

    expect(archiveRoute).toMatchObject({
      component: './resources/components/model-cache',
      hideInMenu: true
    });
  });

  it('嵌入预热页时使用 archive_tab，且不嵌套 PageContainer', async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      null,
      '',
      '/resources/modelfiles?tab=archive&archive_tab=tasks&task_id=42'
    );
    api.queryModelCacheTasks.mockResolvedValue({ items: [archiveTask] });

    const { container } = render(<ModelCache embedded />);

    expect(await screen.findByText(archiveTask.model_id)).toBeInTheDocument();
    expect(container.querySelector('.ant-pro-page-container')).toBeNull();
    expect(
      screen.getByLabelText('resources.modelcache.description')
    ).toBeInTheDocument();

    await user.click(screen.getByText('resources.modelcache.cached'));
    const params = new URLSearchParams(window.location.search);
    expect(params.get('tab')).toBe('archive');
    expect(params.get('archive_tab')).toBe('cached');
    expect(params.has('task_id')).toBe(false);

    act(() => {
      window.history.pushState(
        null,
        '',
        '/resources/modelfiles?tab=archive&archive_tab=tasks&task_id=42'
      );
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(await screen.findByText(archiveTask.model_id)).toBeInTheDocument();
  });

  it('父级页签切换后保留归档子页签路由状态', async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      null,
      '',
      '/resources/modelfiles?tab=archive&archive_tab=tasks&task_id=42'
    );
    api.queryModelCacheTasks.mockResolvedValue({ items: [archiveTask] });

    render(<ModelFiles />);
    expect(await screen.findByText(archiveTask.model_id)).toBeInTheDocument();

    await user.click(screen.getByText('resources.preheat.archive'));
    await user.click(screen.getByText('resources.preheat.profile.title'));
    await waitFor(() =>
      expect(new URLSearchParams(window.location.search).get('tab')).toBe(
        'profiles'
      )
    );
    expect(new URLSearchParams(window.location.search).get('archive_tab')).toBe(
      'tasks'
    );

    await user.click(screen.getByText('resources.preheat.archive'));
    expect(await screen.findByText(archiveTask.model_id)).toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('archive_tab')).toBe(
      'tasks'
    );
  });

  it('旧独立页面继续识别并更新 tab 参数', async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      null,
      '',
      '/resources/model-cache?tab=tasks&task_id=42'
    );
    api.queryModelCacheTasks.mockResolvedValue({ items: [archiveTask] });

    render(<ModelCache />);
    expect(await screen.findByText(archiveTask.model_id)).toBeInTheDocument();

    await user.click(screen.getByText('resources.modelcache.cached'));
    const params = new URLSearchParams(window.location.search);
    expect(params.get('tab')).toBe('cached');
    expect(params.has('archive_tab')).toBe(false);
  });
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
