import type {
  ModelStorageSyncPolicy,
  ModelStorageSyncPolicyCreate
} from './types';

export type TaskPolicyTab = 'sync' | 'preheat' | 'distribution';
export type TaskRecordTab = 'sync' | 'preheat' | 'distribution';

const policyTabs = new Set<TaskPolicyTab>(['sync', 'preheat', 'distribution']);
const taskTabs = new Set<TaskRecordTab>(['sync', 'preheat', 'distribution']);
const strategyParams = [
  'strategy',
  'sync_task',
  'source',
  'model',
  'revision',
  'profile'
];

const searchValue = (query: URLSearchParams) => {
  const value = query.toString();
  return value ? `?${value}` : '';
};

export const taskPolicyTabFromSearch = (search: string): TaskPolicyTab => {
  const query = new URLSearchParams(search);
  const requested = query.get('policy_tab') as TaskPolicyTab | null;
  if (requested && policyTabs.has(requested)) return requested;
  return query.get('strategy') === 'create' && query.has('sync_task')
    ? 'distribution'
    : 'sync';
};

export const taskRecordTabFromSearch = (search: string): TaskRecordTab => {
  const requested = new URLSearchParams(search).get(
    'task_tab'
  ) as TaskRecordTab | null;
  return requested && taskTabs.has(requested) ? requested : 'sync';
};

export const consumeModelStrategySearch = (search: string) => {
  const query = new URLSearchParams(search);
  strategyParams.forEach((key) => query.delete(key));
  return searchValue(query);
};

export const modelManagementSearchForTab = (search: string, tab: string) => {
  const query = new URLSearchParams(search);
  query.set('tab', tab);
  if (tab !== 'policies') strategyParams.forEach((key) => query.delete(key));
  return searchValue(query);
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
