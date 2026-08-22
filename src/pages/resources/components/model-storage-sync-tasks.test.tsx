import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModelStorageSyncTaskDetail } from '../config/types';
import ModelStorageSyncTasks from './model-storage-sync-tasks';

const api = vi.hoisted(() => ({
  queryModelStorageSyncTask: vi.fn(),
  queryModelStorageSyncTasks: vi.fn()
}));

vi.mock('@umijs/max', () => ({
  useIntl: () => ({
    formatMessage: (
      { id }: { id: string },
      values?: { worker?: string; profile?: string }
    ) => id.startsWith('resources.storage.transfer.')
      ? `${id}:${values?.worker || ''}:${values?.profile || ''}`
      : id
  })
}));

vi.mock('../apis', async () => ({
  ...(await vi.importActual('../apis')),
  ...api
}));

const task = (
  overrides: Partial<ModelStorageSyncTaskDetail> = {}
): ModelStorageSyncTaskDetail => ({
  id: 5,
  model_file_id: 7,
  worker_id: 12,
  profile_id: 3,
  profile_config_version: 2,
  source: 'modelscope',
  model_id: 'team/model',
  resolved_revision: 'main',
  state: 'ready',
  state_message: null,
  error_code: null,
  file_count: 1,
  total_size: 1024,
  transfer_source: 's3',
  transfer_profile_id: 3,
  source_worker_id: 12,
  profile: { id: 3, name: 'center-cache', config_version: 2, system_managed: false },
  request_digest: 'request-5',
  artifact_id: 'artifact-5',
  source_worker_name: 'a100-58',
  created_at: '',
  updated_at: '',
  ...overrides
});

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('同步任务获取方式', () => {
  it('s3 详情只展示 S3 Profile，不拼接来源节点', async () => {
    const detail = task();
    api.queryModelStorageSyncTasks.mockResolvedValue({
      items: [detail],
      pagination: { page: 1, per_page: 100, total: 1, total_page: 1 }
    });
    api.queryModelStorageSyncTask.mockResolvedValue(detail);
    const { container } = render(<ModelStorageSyncTasks />);
    await screen.findByText('team/model');
    fireEvent.click(container.querySelector('.anticon-eye')!.closest('button')!);
    expect(
      await screen.findByText('resources.storage.transfer.s3::center-cache')
    ).toBeInTheDocument();
  });

  it('peer_via_s3 详情同时展示来源节点和 S3 Profile', async () => {
    const detail = task({ transfer_source: 'peer_via_s3' });
    api.queryModelStorageSyncTasks.mockResolvedValue({
      items: [detail],
      pagination: { page: 1, per_page: 100, total: 1, total_page: 1 }
    });
    api.queryModelStorageSyncTask.mockResolvedValue(detail);
    const { container } = render(<ModelStorageSyncTasks />);
    await screen.findByText('team/model');
    fireEvent.click(container.querySelector('.anticon-eye')!.closest('button')!);
    expect(
      await screen.findByText(
        'resources.storage.transfer.peer_via_s3:a100-58:center-cache'
      )
    ).toBeInTheDocument();
  });
});
