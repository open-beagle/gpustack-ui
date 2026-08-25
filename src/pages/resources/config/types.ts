export interface Gpu {
  uuid: string;
  name: string;
  vendor: string;
  index: number;
  core: {
    total: number;
    allocated: number;
    utilization_rate: number;
  };
  memory: {
    total: number;
    allocated: number;
    used: number;
    utilization_rate: number;
  };
  temperature: number;
}

export interface GPUDeviceItem {
  uuid: string;
  name: string;
  vendor: string;
  index: number;
  core: {
    total: number;
    utilization_rate: number;
  };
  memory: {
    total: number;
    utilization_rate: number;
    is_unified_memory: boolean;
    used: number;
    allocated: number;
  };
  temperature: number;
  id: string;
  worker_id: number;
  worker_name: string;
  worker_ip: string;
}

export interface Filesystem {
  name: string;
  mount_point: string;
  mount_from: string;
  total: number;
  used: number;
  free: number;
  available: number;
}

export interface Kernel {
  name: string;
  release: string;
  version: string;
  architecture: string;
}

export interface ListItem {
  name: string;
  hostname: string;
  address: string;
  labels: Record<string, string>;
  state: string;
  ip: string;
  state_message: string;
  status: {
    cpu: {
      total: number;
      allocated: number;
      utilization_rate: number;
    };
    memory: {
      total: number;
      used: number;
      allocated: number;
    };
    gpu_devices: GPUDeviceItem[];
    swap: {
      total: number;
      used: number;
    };
    filesystem: Filesystem[];
    os: {
      name: string;
      version: string;
    };
    kernel: Kernel;
    uptime: {
      uptime: number;
      boot_time: string;
    };
  };
  id: number;
  created_at: string;
  updated_at: string;
  worker_uuid: string;
  model_storage_protocol_version?: number;
}

export interface ModelFile {
  source: string;
  huggingface_repo_id: string;
  huggingface_filename: string;
  ollama_library_model_name: string;
  model_scope_model_id: string;
  model_scope_file_path: string;
  local_path: string;
  local_dir: string;
  worker_id: number;
  worker_uuid_snapshot?: string | null;
  worker_name_snapshot?: string | null;
  worker_name?: string | null;
  worker_available?: boolean;
  size: number;
  download_progress: number;
  resolved_paths: string[];
  state: string;
  state_message: string;
  requested_revision?: string | null;
  resolved_revision?: string | null;
  transfer_source?: ModelStorageTransferSource | null;
  transfer_profile_id?: number | null;
  transfer_profile_name?: string | null;
  source_worker_id?: number | null;
  source_worker_name?: string | null;
  id: number;
  created_at: string;
  updated_at: string;
}

export interface ModelFileFormData {
  source: string;
  huggingface_repo_id: string;
  huggingface_filename: string;
  ollama_library_model_name: string;
  model_scope_model_id: string;
  model_scope_file_path: string;
  local_path: string;
  local_dir: string;
}

export type ModelPreheatS3ConnectivityState =
  | 'no_workers'
  | 'pending'
  | 'checking'
  | 'available'
  | 'partial'
  | 'unavailable'
  | 'stale';

export type ModelPreheatConnectivityCheckState =
  | 'pending'
  | 'running'
  | 'available'
  | 'partial'
  | 'unavailable'
  | 'error';

export type ModelPreheatWorkerTaskState =
  | 'pending'
  | 'running'
  | 'paused'
  | 'ready'
  | 'error'
  | 'canceled'
  | 'skipped_worker_removed';

export type ModelPreheatExecutionState =
  | 'pending'
  | 'resolving'
  | 'scanning'
  | 'staging'
  | 'publishing'
  | 'distributing'
  | 'paused'
  | 'ready'
  | 'partial'
  | 'error'
  | 'canceled';

export type ModelPreheatTargetScope =
  | 'seed_worker'
  | 'same_gpu_model'
  | 'selected_workers';

export type ModelPreheatBackfillPolicy = 'always' | 'when_missing' | 'never';

export interface ModelPreheatWorker {
  id: number;
  worker_uuid: string;
  name: string;
  state: string;
  model_storage_protocol_version?: number;
  status?: {
    gpu_devices?: Array<{ name: string }>;
  } | null;
}

export interface ModelPreheatS3ProfileBase {
  name: string;
  description?: string | null;
  endpoint: string;
  bucket: string;
  prefix?: string;
  tls_enabled?: boolean;
  tls_verify?: boolean;
  region?: string | null;
  use_virtual_hosted_style?: boolean;
  inventory_refresh_interval_seconds?: number | null;
  source_fallback_enabled?: boolean;
  default_slot?: string | null;
}

export type ModelPreheatS3ProfileLifecycleState = 'active' | 'maintenance';

export interface ModelPreheatS3ProfileWrite extends ModelPreheatS3ProfileBase {
  access_key?: string;
  secret_key?: string;
  lifecycle_state?: ModelPreheatS3ProfileLifecycleState;
}

export interface ModelPreheatS3Profile extends ModelPreheatS3ProfileBase {
  id: number;
  credential_configured: boolean;
  provisioning_source?: 'manual' | 'worker_local_s3';
  provisioning_key?: string | null;
  system_managed?: boolean;
  lifecycle_state: ModelPreheatS3ProfileLifecycleState;
  ever_used_at: string | null;
  default_slot?: string | null;
  source_fallback_enabled?: boolean;
  is_default: boolean;
  config_version: number;
  connectivity_state: ModelPreheatS3ConnectivityState;
  last_connectivity_check_id: number | null;
  last_connectivity_checked_at: string | null;
  inventory_refresh_interval_seconds?: number | null;
  inventory_last_attempt_at?: string | null;
  inventory_last_success_at?: string | null;
  inventory_last_scan_count?: number;
  inventory_last_error_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModelStorageCapabilities {
  credential_encryption_available: boolean;
  model_preheat_enabled?: boolean;
}

export interface ModelStorageConnectionStage {
  ok: boolean;
  error_code: string | null;
}

export interface ModelStorageConnectionTest {
  scope: 'server';
  ok: boolean;
  connection: ModelStorageConnectionStage;
  bucket: ModelStorageConnectionStage;
  write: ModelStorageConnectionStage;
  read: ModelStorageConnectionStage;
  delete: ModelStorageConnectionStage;
  error_code: string | null;
}

export interface ModelStorageConnectionTestRequest {
  endpoint: string;
  bucket: string;
  prefix: string;
  access_key: string;
  secret_key: string;
  tls_enabled: boolean;
  tls_verify: boolean;
  region?: string | null;
  use_virtual_hosted_style: boolean;
}

export type ModelStorageModelSource =
  | 'model_scope'
  | 'modelscope'
  | 'huggingface'
  | 'ollama_library';

export interface ModelStorageRequestIdentity extends Record<string, unknown> {
  source: ModelStorageModelSource;
  model_id: string;
}

export interface ModelStorageArtifact {
  artifact_id: string;
  source: ModelStorageModelSource;
  model_id: string;
  resolved_revision: string;
  include_patterns: string[];
  exclude_patterns: string[];
  manifest_digest: string;
  manifest_path: string;
  manifest_state: string;
  file_count: number;
  total_size: number;
  last_verified_at: string | null;
  created_by_task_id: number | null;
  created_at: string;
  updated_at: string;
}

export type ModelStorageTransferSource =
  | 'current_node'
  | 'peer_via_s3'
  | 's3'
  | 'modelscope'
  | 'huggingface';

export interface ModelStorageSyncTask {
  id: number;
  model_file_id: number;
  worker_id: number;
  worker_uuid?: string;
  profile_id: number;
  profile_config_version: number;
  source: ModelStorageModelSource;
  model_id: string;
  resolved_revision: string;
  revision_kind?: 'upstream' | 'local_snapshot';
  request_digest?: string;
  artifact_id?: string | null;
  state: 'pending' | 'scanning' | 'publishing' | 'ready' | 'error' | 'canceled';
  state_message: string | null;
  error_code: string | null;
  file_count: number;
  total_size: number;
  transfer_source: ModelStorageTransferSource | null;
  transfer_profile_id: number | null;
  source_worker_id: number | null;
  source_worker_name: string | null;
  profile_name: string | null;
  profile_endpoint: string | null;
  profile_bucket: string | null;
  profile_prefix: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModelStorageSyncTaskDetail {
  id: number;
  model_file_id: number;
  worker_id: number;
  profile_config_version: number;
  source: ModelStorageModelSource;
  model_id: string;
  resolved_revision: string;
  state: 'pending' | 'scanning' | 'publishing' | 'ready' | 'error' | 'canceled';
  state_message: string | null;
  error_code: string | null;
  file_count: number;
  total_size: number;
  transfer_source: ModelStorageTransferSource | null;
  transfer_profile_id: number | null;
  source_worker_id: number | null;
  source_worker_name: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
  profile: {
    id: number;
    name: string;
    endpoint: string | null;
    bucket: string | null;
    prefix: string | null;
    tls_enabled: boolean | null;
    tls_verify: boolean | null;
    region: string | null;
    use_virtual_hosted_style: boolean | null;
    config_version: number;
    system_managed: boolean;
  } | null;
  request_digest: string;
  artifact_id: string | null;
}

export type ModelStorageSyncScope =
  | 'single_model'
  | 'selected_workers'
  | 'all_ready_workers';

export interface ModelStorageSyncBatchCreate {
  profile_id: number;
  scope: ModelStorageSyncScope;
  model_file_id?: number;
  worker_ids?: number[];
}

export interface ModelStorageSyncBatchItem {
  model_file_id: number | null;
  worker_id: number | null;
  task_id: number | null;
  reason: string | null;
}

export interface ModelStorageSyncBatchResult {
  scope: ModelStorageSyncScope;
  planned: number;
  created: ModelStorageSyncBatchItem[];
  skipped: ModelStorageSyncBatchItem[];
  failed: ModelStorageSyncBatchItem[];
}

export interface ModelPreheatConnectivityWorker {
  worker_uuid: string;
  worker_id: number | null;
  worker_name: string | null;
  state: ModelPreheatWorkerTaskState;
  readable: boolean;
  writable: boolean;
  deletable: boolean;
  cleanup_failed: boolean;
  latency_ms: number | null;
  error_code: string | null;
  failed_stage: string | null;
}

export interface ModelPreheatConnectivityCheck {
  id: number;
  profile_id: number;
  profile_config_version: number;
  state: ModelPreheatConnectivityCheckState;
  summary: {
    success: number;
    failed: number;
    not_checked: number;
  };
  workers: ModelPreheatConnectivityWorker[];
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface ModelPreheatCreate {
  source: 'huggingface' | 'modelscope' | 'ollama_library';
  model_id: string;
  revision?: string | null;
  include_patterns: string[];
  exclude_patterns: string[];
  target_scope: ModelPreheatTargetScope;
  target_worker_ids: number[];
  seed_worker_id?: number | null;
  s3_profile_id: number;
  s3_backfill_policy: ModelPreheatBackfillPolicy;
  delivery_mode?: 's3_only' | 's3_and_workers';
  connectivity_failure_override?: boolean;
  keep_new_workers_in_sync: boolean;
}

export interface ModelPreheatTargetSnapshot {
  worker_uuid: string;
  worker_id: number;
  worker_name: string;
}

export interface ModelPreheatTask {
  id: number;
  attempt: number;
  source: string;
  model_id: string;
  requested_revision: string | null;
  resolved_revision: string | null;
  include_patterns: string[];
  exclude_patterns: string[];
  selection_digest: string;
  request_identity: Record<string, unknown>;
  request_digest: string;
  artifact_id: string | null;
  desired_state: 'running' | 'paused' | 'canceled';
  execution_state: ModelPreheatExecutionState;
  paused_from_state: ModelPreheatExecutionState | null;
  target_scope: ModelPreheatTargetScope;
  target_worker_uuids: string[];
  target_worker_snapshot: ModelPreheatTargetSnapshot[];
  s3_profile_id: number;
  s3_profile_config_version: number;
  s3_backfill_policy: ModelPreheatBackfillPolicy;
  delivery_mode?: 's3_only' | 's3_and_workers';
  keep_new_workers_in_sync: boolean;
  connectivity_failure_override?: boolean;
  transfer_source: ModelStorageTransferSource | null;
  transfer_profile_id: number | null;
  source_worker_id: number | null;
  state_message?: string | null;
  error_code?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  file_count?: number | null;
  total_size?: number | null;
  created_at: string;
  updated_at: string;
  deduplicated: boolean;
}

export interface ModelPreheatDistributionPolicy {
  id: number;
  name: string;
  enabled: boolean;
  trigger_mode: 'manual' | 'scheduled' | 'continuous';
  cron_expression: string | null;
  timezone: string;
  profile_id: number;
  profile_config_version: number;
  request_identity: ModelStorageRequestIdentity;
  request_digest: string;
  target_scope: ModelPreheatTargetScope;
  worker_selector: Record<string, unknown>;
  gpu_selector: Record<string, unknown>;
  created_by_task_id: number | null;
  source_artifact_id?: number | null;
  source_artifact?: string | null;
  source_sync_task_id?: number | null;
  profile_version_stale?: boolean;
  blocked_reason?: string | null;
  last_reconciled_at: string | null;
  next_run_at?: string | null;
  last_run_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type ModelStorageSyncPolicyTriggerMode = 'manual' | 'scheduled';

export interface ModelStorageSyncPolicyCreate {
  name: string;
  enabled: boolean;
  trigger_mode: ModelStorageSyncPolicyTriggerMode;
  cron_expression: string | null;
  timezone: string;
  profile_id: number;
  scope: ModelStorageSyncScope;
  model_file_id: number | null;
  worker_uuids: string[];
}

export interface ModelStorageSyncPolicy extends ModelStorageSyncPolicyCreate {
  id: number;
  next_run_at: string | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModelStorageSyncPolicyRun {
  id: number;
  policy_id: number;
  trigger: 'manual' | 'scheduled';
  state: 'pending' | 'ready' | 'error';
  error_code: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModelPreheatDistributionPolicyCreate {
  name: string;
  trigger_mode?: 'manual' | 'scheduled' | 'continuous';
  cron_expression?: string | null;
  timezone?: string;
  profile_id?: number;
  artifact_id?: string;
  sync_task_id?: number;
  target_scope: ModelPreheatTargetScope;
  worker_selector: { worker_uuids?: string[] };
  gpu_selector: { gpu_names?: string[] };
}

export type ModelPreheatScheduleRunState =
  | 'pending'
  | 'running'
  | 'paused'
  | 'ready'
  | 'skipped'
  | 'error';

export interface ModelPreheatScheduleCreate {
  name: string;
  trigger_mode: 'manual' | 'scheduled';
  cron_expression: string | null;
  timezone: string;
  window_duration_minutes: number;
  max_concurrency: number;
  bandwidth_limit_mbps?: number | null;
  source: 'huggingface' | 'modelscope' | 'ollama_library';
  model_id: string;
  revision?: string | null;
  include_patterns: string[];
  exclude_patterns: string[];
  target_scope: ModelPreheatTargetScope;
  target_worker_uuids: string[];
  seed_worker_uuid?: string | null;
  s3_profile_id: number;
  s3_backfill_policy: ModelPreheatBackfillPolicy;
  delivery_mode?: 's3_only' | 's3_and_workers';
  keep_new_workers_in_sync: boolean;
  connectivity_failure_override?: boolean;
}

export interface ModelPreheatSchedule extends ModelPreheatScheduleCreate {
  id: number;
  enabled: boolean;
  next_window_start_utc: string | null;
  last_window_start_utc: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModelPreheatScheduleRun {
  id: number;
  schedule_id: number;
  window_start_utc: string;
  window_end_utc: string;
  trigger: 'scheduled' | 'manual';
  state: ModelPreheatScheduleRunState;
  task_id: number | null;
  error_code: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}
