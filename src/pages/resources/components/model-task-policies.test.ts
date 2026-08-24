import { describe, expect, it } from 'vitest';
import {
  buildSyncPolicyPatch,
  taskPolicyTabFromSearch
} from '../config/model-policy';
import type {
  ModelStorageSyncPolicy,
  ModelStorageSyncPolicyCreate
} from '../config/types';

const policy: ModelStorageSyncPolicy = {
  id: 1,
  name: '同步策略',
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
  created_at: '2026-08-24T00:00:00Z',
  updated_at: '2026-08-24T00:00:00Z'
};

describe('任务策略页签和同步策略差量更新', () => {
  it('同步记录深链进入预热/分发页签', () => {
    expect(
      taskPolicyTabFromSearch('?tab=policies&strategy=create&sync_task=12')
    ).toBe('distribution');
    expect(taskPolicyTabFromSearch('?tab=policies')).toBe('sync');
  });

  it('纯改名只提交 name，未变化时不提交字段', () => {
    expect(
      buildSyncPolicyPatch(policy, {
        ...(policy as ModelStorageSyncPolicyCreate),
        name: '新名称'
      })
    ).toEqual({ name: '新名称' });
    expect(
      buildSyncPolicyPatch(policy, policy as ModelStorageSyncPolicyCreate)
    ).toEqual({});
  });
});
