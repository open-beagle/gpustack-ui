import type {
  ModelStorageSyncPolicy,
  ModelStorageSyncPolicyCreate
} from './types';

export type TaskPolicyTab = 'sync' | 'preheat-distribution';

export const taskPolicyTabFromSearch = (search: string): TaskPolicyTab => {
  const query = new URLSearchParams(search);
  return query.get('strategy') === 'create' && query.has('sync_task')
    ? 'preheat-distribution'
    : 'sync';
};

const editableFields: Array<keyof ModelStorageSyncPolicyCreate> = [
  'name',
  'trigger_mode',
  'cron_expression',
  'timezone',
  'profile_id',
  'scope',
  'model_file_id',
  'worker_uuids'
];

export const buildSyncPolicyPatch = (
  current: ModelStorageSyncPolicy,
  next: ModelStorageSyncPolicyCreate
): Partial<ModelStorageSyncPolicyCreate> =>
  Object.fromEntries(
    editableFields
      .filter(
        (field) =>
          JSON.stringify(current[field]) !== JSON.stringify(next[field])
      )
      .map((field) => [field, next[field]])
  );
