import type {
  ModelPreheatConnectivityCheck,
  ModelPreheatConnectivityWorker,
  ModelPreheatCreate,
  ModelPreheatExecutionState,
  ModelPreheatS3Profile,
  ModelPreheatS3ProfileWrite,
  ModelPreheatTask,
  ModelPreheatWorker,
  ModelStorageModelSource,
  ModelStorageTransferSource
} from './types';

export type ModelPreheatTaskAction = 'pause' | 'resume' | 'cancel' | 'retry';

export interface ModelStorageTransferPresentation {
  messageId: string;
  includeProfile: boolean;
  includeWorker: boolean;
}

export type ModelFileSyncActionReason =
  | 'unsupported'
  | 'model_not_ready'
  | 'worker_unavailable'
  | 'no_default_profile'
  | 'already_from_default';

export interface ModelFileSyncActionState {
  visible: boolean;
  disabled: boolean;
  reason: ModelFileSyncActionReason | null;
}

export type ModelFileDeletePreflight = 'available' | 'active' | 'error';

export const MODEL_FILE_WATCH_EVENTS: Array<
  'INSERT' | 'UPDATE' | 'DELETE'
> = ['INSERT', 'UPDATE', 'DELETE'];

type ModelFileSyncTaskQuery = (params: {
  page: number;
  perPage: number;
  model_file_id: number;
  state: string;
}) => Promise<{ items: Array<{ state: string }> }>;

/** 删除前逐个活动状态查询，避免历史终态占据首条记录时误放行。 */
export async function getModelFileDeletePreflight(
  modelFileIds: number[],
  querySyncTasks: ModelFileSyncTaskQuery
): Promise<ModelFileDeletePreflight> {
  try {
    const results = await Promise.all(
      modelFileIds.flatMap((model_file_id) =>
        ['pending', 'scanning', 'publishing'].map((state) =>
          querySyncTasks({ page: 1, perPage: 1, model_file_id, state })
        )
      )
    );
    return results.some((result) => result.items.length > 0)
      ? 'active'
      : 'available';
  } catch {
    return 'error';
  }
}

export function retryModelFileDeletePreflight(
  retry: (() => void) | undefined,
  clearFailure: () => void
) {
  clearFailure();
  retry?.();
}

export interface ModelStorageRevisionPresentation {
  full: string;
  short: string;
  kind: 'modelscope_filelist' | 'revision';
}

const MODELSCOPE_FILELIST_REVISION_PREFIX = 'modelscope-filelist-v1-';
const LOCAL_SNAPSHOT_REVISION_PREFIX = 'local-snapshot-';

export function getModelStorageRevisionPresentation(
  revision: string
): ModelStorageRevisionPresentation {
  if (revision.startsWith(MODELSCOPE_FILELIST_REVISION_PREFIX)) {
    const fingerprint = revision.slice(
      MODELSCOPE_FILELIST_REVISION_PREFIX.length
    );
    return {
      full: revision,
      short: fingerprint.slice(0, 12),
      kind: 'modelscope_filelist'
    };
  }
  if (revision.startsWith(LOCAL_SNAPSHOT_REVISION_PREFIX)) {
    const fingerprint = revision.slice(LOCAL_SNAPSHOT_REVISION_PREFIX.length);
    return {
      full: revision,
      short: fingerprint.slice(0, 12),
      kind: 'revision'
    };
  }
  return {
    full: revision,
    short: revision.length > 16 ? revision.slice(0, 12) : revision,
    kind: 'revision'
  };
}

export function getModelFileSyncActionState(
  model: {
    state: string;
    source: string;
    resolved_revision?: string | null;
    transfer_source?: ModelStorageTransferSource | null;
    transfer_profile_id?: number | null;
    worker_available?: boolean;
  },
  defaultProfileId?: number,
  requireDefaultProfile = true
): ModelFileSyncActionState {
  if (!['model_scope', 'huggingface', 'ollama_library'].includes(model.source)) {
    return { visible: true, disabled: true, reason: 'unsupported' };
  }
  if (model.state !== 'ready') {
    return { visible: true, disabled: true, reason: 'model_not_ready' };
  }
  if (model.worker_available === false) {
    return { visible: true, disabled: true, reason: 'worker_unavailable' };
  }
  if (requireDefaultProfile && defaultProfileId === undefined) {
    return { visible: true, disabled: true, reason: 'no_default_profile' };
  }
  if (
    defaultProfileId !== undefined &&
    ['s3', 'peer_via_s3'].includes(model.transfer_source || '') &&
    model.transfer_profile_id === defaultProfileId
  ) {
    return {
      visible: true,
      disabled: true,
      reason: 'already_from_default'
    };
  }
  return { visible: true, disabled: false, reason: null };
}

export function getModelFileStorageModelId(model: {
  source: string;
  model_scope_model_id?: string;
  huggingface_repo_id?: string;
  ollama_library_model_name?: string;
  local_path?: string;
}): string {
  if (model.source === 'ollama_library') {
    return model.ollama_library_model_name || '';
  }
  if (model.source === 'model_scope') {
    return model.model_scope_model_id || '';
  }
  if (model.source === 'huggingface') {
    return model.huggingface_repo_id || '';
  }
  return model.local_path || '';
}

export function getModelStorageSourceLabel(
  source: ModelStorageModelSource
): string {
  switch (source) {
    case 'model_scope':
    case 'modelscope':
      return 'ModelScope';
    case 'huggingface':
      return 'Hugging Face';
    case 'ollama_library':
      return 'Ollama Library';
  }
}

const STORAGE_STATUS_IDS: Record<string, string> = {
  pending: 'resources.storage.status.pending',
  running: 'resources.storage.status.running',
  ready: 'resources.storage.status.ready',
  error: 'resources.storage.status.error',
  canceled: 'resources.storage.status.canceled',
  valid: 'resources.storage.status.valid',
  invalid: 'resources.storage.status.invalid',
  missing: 'resources.storage.status.missing',
  stale: 'resources.storage.status.stale'
};

const STORAGE_ERROR_IDS: Record<string, string> = {
  artifact_not_ready: 'resources.storage.error.artifactNotReady',
  s3_profile_in_maintenance: 'resources.storage.error.profileMaintenance',
  s3_object_conflict: 'resources.storage.error.objectConflict',
  manifest_invalid: 'resources.storage.error.manifestInvalid',
  worker_not_current: 'resources.storage.error.workerUnavailable',
  worker_execution_failed: 'resources.storage.error.workerExecutionFailed'
};

export function getModelStorageFlowPresentation(
  sourceWorker: string | null | undefined,
  profile: string | null | undefined,
  targetWorker?: string | null
) {
  return {
    messageId: targetWorker
      ? 'resources.storage.flow.workerToProfileToWorker'
      : 'resources.storage.flow.workerToProfile',
    values: {
      worker: sourceWorker || '',
      profile: profile || '',
      targetWorker: targetWorker || ''
    }
  };
}

export function getModelStorageStatusPresentation(status?: string | null) {
  const value = status || 'unknown';
  return {
    value,
    messageId: STORAGE_STATUS_IDS[value] || 'resources.storage.status.unknown'
  };
}

export function getModelStorageErrorPresentation(errorCode?: string | null) {
  const value = errorCode || 'unknown';
  return {
    value,
    messageId: STORAGE_ERROR_IDS[value] || 'resources.storage.error.unknown'
  };
}

export function mergeModelStoragePage<T>(
  current: T[],
  incoming: T[],
  key: (item: T) => string | number
) {
  const merged = new Map(current.map((item) => [key(item), item]));
  incoming.forEach((item) => merged.set(key(item), item));
  return Array.from(merged.values());
}

export function getModelStorageTransferPresentation(
  source: ModelStorageTransferSource | null
): ModelStorageTransferPresentation {
  switch (source) {
    case 'current_node':
      return {
        messageId: 'resources.storage.transfer.current_node',
        includeProfile: false,
        includeWorker: true
      };
    case 'peer_via_s3':
      return {
        messageId: 'resources.storage.transfer.peer_via_s3',
        includeProfile: true,
        includeWorker: true
      };
    case 's3':
      return {
        messageId: 'resources.storage.transfer.s3',
        includeProfile: true,
        includeWorker: false
      };
    case 'modelscope':
      return {
        messageId: 'resources.storage.transfer.modelscope',
        includeProfile: false,
        includeWorker: false
      };
    case 'huggingface':
      return {
        messageId: 'resources.storage.transfer.huggingface',
        includeProfile: false,
        includeWorker: false
      };
    default:
      return {
        messageId: 'resources.storage.transfer.unknown',
        includeProfile: false,
        includeWorker: false
      };
  }
}

export type ModelPreheatBlockingReasonCode =
  | 'profile_required'
  | 'target_workers_required'
  | 'seed_worker_not_ready'
  | 'seed_worker_gpu_required'
  | 'seed_worker_not_in_target_scope'
  | 'target_worker_not_found'
  | 'target_worker_not_ready'
  | 'connectivity_check_required'
  | 'connectivity_config_stale'
  | 'profile_connectivity_stale'
  | 'worker_connectivity_missing'
  | 'worker_connectivity_unavailable';

export interface ModelPreheatBlockingReason {
  code: ModelPreheatBlockingReasonCode;
  workerName?: string;
}

export interface ModelPreheatPreviewRow {
  worker: ModelPreheatWorker;
  connectivity: ModelPreheatConnectivityWorker | null;
}

export interface ModelPreheatPreview {
  rows: ModelPreheatPreviewRow[];
  blockingReasons: ModelPreheatBlockingReason[];
  canSubmit: boolean;
  singleWorker: boolean;
}

const createIdempotencyKey = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export class IdempotencyKeyLifecycle {
  private key: string | null = null;
  private requestFingerprint: string | null = null;

  constructor(private readonly generate: () => string = createIdempotencyKey) {}

  start() {
    this.key = this.generate();
    this.requestFingerprint = null;
    return this.key;
  }

  current() {
    if (!this.key) {
      throw new Error('幂等操作尚未开始');
    }
    return this.key;
  }

  keyForRequest(requestFingerprint: string) {
    if (
      this.requestFingerprint !== null &&
      this.requestFingerprint !== requestFingerprint
    ) {
      this.key = this.generate();
    }
    this.requestFingerprint = requestFingerprint;
    return this.current();
  }

  complete() {
    this.key = null;
    this.requestFingerprint = null;
  }

  abandon() {
    this.key = null;
    this.requestFingerprint = null;
  }
}

export class LatestRequestGate {
  private generation = 0;

  async run<T>(
    request: () => Promise<T>,
    apply: (value: T) => void,
    settle?: () => void
  ) {
    const generation = ++this.generation;
    try {
      const value = await request();
      if (generation !== this.generation) return false;
      apply(value);
      return true;
    } catch (error) {
      if (generation !== this.generation) return false;
      throw error;
    } finally {
      if (generation === this.generation) settle?.();
    }
  }

  invalidate() {
    this.generation += 1;
  }
}

export async function loadAllPaginated<T>(
  request: (page: number, perPage: number) => Promise<Global.PageResponse<T>>
) {
  const perPage = 100;
  const firstPage = await request(1, perPage);
  const items = [...firstPage.items];
  for (let page = 2; page <= firstPage.pagination.totalPage; page += 1) {
    const result = await request(page, perPage);
    items.push(...result.items);
  }
  return items;
}

export async function loadModelPreheatConnectivitySnapshot(
  profileId: number,
  loadProfile: (id: number) => Promise<ModelPreheatS3Profile>,
  loadCheck: (
    profileId: number,
    checkId: number
  ) => Promise<ModelPreheatConnectivityCheck>
) {
  const profile = await loadProfile(profileId);
  const check = profile.last_connectivity_check_id
    ? await loadCheck(profile.id, profile.last_connectivity_check_id)
    : null;
  return { profile, check };
}

export function shouldPollModelPreheatConnectivity(
  profile: ModelPreheatS3Profile,
  check: ModelPreheatConnectivityCheck | null
) {
  return (
    ['pending', 'checking'].includes(profile.connectivity_state) ||
    Boolean(check && ['pending', 'running'].includes(check.state))
  );
}

const latestWorkerRegistrations = (workers: ModelPreheatWorker[]) => {
  const latest = new Map<string, ModelPreheatWorker>();
  workers.forEach((worker) => {
    const current = latest.get(worker.worker_uuid);
    if (!current || current.id < worker.id) {
      latest.set(worker.worker_uuid, worker);
    }
  });
  return Array.from(latest.values());
};

export const MODEL_STORAGE_PROTOCOL_VERSION = 1;
export const MODEL_PREHEAT_CONNECTIVITY_TTL_MS = 10 * 60 * 1000;

export const eligibleModelPreheatWorkers = (workers: ModelPreheatWorker[]) =>
  latestWorkerRegistrations(workers).filter(
    (worker) =>
      worker.state === 'ready' &&
      worker.model_storage_protocol_version === MODEL_STORAGE_PROTOCOL_VERSION
  );

const normalizedGpuNames = (worker: ModelPreheatWorker) =>
  new Set(
    (worker.status?.gpu_devices || [])
      .map((gpu) => gpu.name.trim().toLocaleLowerCase().replace(/\s+/g, ' '))
      .filter(Boolean)
  );

const workerIdentityKey = (workerUuid: string, workerId: number | null) =>
  JSON.stringify([workerUuid, workerId]);

const resolveTargetWorkers = (
  values: ModelPreheatCreate,
  workers: ModelPreheatWorker[],
  reasons: ModelPreheatBlockingReason[]
) => {
  const latest = latestWorkerRegistrations(workers);
  const ready = eligibleModelPreheatWorkers(workers);
  const byId = new Map(ready.map((worker) => [worker.id, worker]));
  const readyById = new Map(ready.map((worker) => [worker.id, worker]));

  if (values.delivery_mode === 's3_only') {
    const eligible = eligibleModelPreheatWorkers(workers);
    const selected = values.seed_worker_id
      ? eligible.find((worker) => worker.id === values.seed_worker_id)
      : undefined;
    if (values.seed_worker_id && !selected) {
      reasons.push({ code: 'seed_worker_not_ready' });
      return [];
    }
    if (selected) return [selected];
    if (!eligible.length) {
      reasons.push({ code: 'seed_worker_not_ready' });
      return [];
    }
    return [eligible.sort((left, right) =>
      left.worker_uuid.localeCompare(right.worker_uuid)
    )[0]];
  }

  if (values.target_scope === 'selected_workers') {
    if (!values.target_worker_ids.length) {
      reasons.push({ code: 'target_workers_required' });
      return [];
    }
    const targets = values.target_worker_ids.flatMap((workerId) => {
      const worker = byId.get(workerId);
      if (!worker) {
        reasons.push({
          code: 'target_worker_not_found',
          workerName: String(workerId)
        });
        return [];
      }
      if (worker.state !== 'ready') {
        reasons.push({
          code: 'target_worker_not_ready',
          workerName: worker.name
        });
      }
      return [worker];
    });
    if (
      values.seed_worker_id &&
      !values.target_worker_ids.includes(values.seed_worker_id)
    ) {
      reasons.push({
        code: 'seed_worker_not_in_target_scope',
        workerName:
          byId.get(values.seed_worker_id)?.name || String(values.seed_worker_id)
      });
    }
    return targets;
  }

  const seed = values.seed_worker_id
    ? readyById.get(values.seed_worker_id)
    : undefined;
  if (!seed) {
    reasons.push({ code: 'seed_worker_not_ready' });
    return [];
  }
  if (values.target_scope === 'seed_worker') {
    return [seed];
  }

  const seedGpuNames = normalizedGpuNames(seed);
  if (!seedGpuNames.size) {
    reasons.push({
      code: 'seed_worker_gpu_required',
      workerName: seed.name
    });
    return [];
  }
  return ready.filter((worker) => {
    const workerGpuNames = normalizedGpuNames(worker);
    return Array.from(seedGpuNames).some((name) => workerGpuNames.has(name));
  });
};

export function buildModelPreheatPreview(
  values: ModelPreheatCreate,
  workers: ModelPreheatWorker[],
  profile?: ModelPreheatS3Profile,
  check?: ModelPreheatConnectivityCheck | null
): ModelPreheatPreview {
  const blockingReasons: ModelPreheatBlockingReason[] = [];
  const targets = resolveTargetWorkers(values, workers, blockingReasons);
  const latest = latestWorkerRegistrations(workers);

  if (!profile || profile.id !== values.s3_profile_id) {
    blockingReasons.push({ code: 'profile_required' });
  } else if (
    check &&
    check.profile_id === profile.id &&
    check.profile_config_version === profile.config_version
  ) {
    const connectivityByIdentity = new Map(
      check.workers.map((worker) => [
        workerIdentityKey(worker.worker_uuid, worker.worker_id),
        worker
      ])
    );
    targets.forEach((worker) => {
      const result = connectivityByIdentity.get(
        workerIdentityKey(worker.worker_uuid, worker.id)
      );
      const checkedAt = check.finished_at
        ? new Date(check.finished_at).getTime()
        : 0;
      const isRecent =
        checkedAt > 0 &&
        Date.now() - checkedAt < MODEL_PREHEAT_CONNECTIVITY_TTL_MS;
      if (result?.state === 'error' && isRecent) {
        blockingReasons.push({
          code: 'worker_connectivity_unavailable',
          workerName: worker.name
        });
      }
    });
  }

  const connectivityByIdentity = new Map(
    (check?.workers || []).map((worker) => [
      workerIdentityKey(worker.worker_uuid, worker.worker_id),
      worker
    ])
  );
  return {
    rows: targets.map((worker) => ({
      worker,
      connectivity:
        connectivityByIdentity.get(
          workerIdentityKey(worker.worker_uuid, worker.id)
        ) || null
    })),
    blockingReasons,
    canSubmit: blockingReasons.length === 0,
    singleWorker:
      latest.filter((worker) => worker.state === 'ready').length === 1 &&
      targets.length === 1
  };
}

export function buildModelPreheatCreatePayload(values: ModelPreheatCreate) {
  return {
    ...values,
    model_id: values.model_id.trim(),
    revision: values.revision?.trim() || null,
    include_patterns:
      values.source === 'ollama_library'
        ? []
        : (values.include_patterns || [])
            .map((value) => value.trim())
            .filter(Boolean),
    exclude_patterns:
      values.source === 'ollama_library'
        ? []
        : (values.exclude_patterns || [])
            .map((value) => value.trim())
            .filter(Boolean),
    target_worker_ids:
      values.delivery_mode === 's3_and_workers' &&
      values.target_scope === 'selected_workers'
        ? values.target_worker_ids
        : [],
    target_scope:
      values.delivery_mode === 's3_only' ? 'selected_workers' : values.target_scope,
    seed_worker_id: values.seed_worker_id || null,
    keep_new_workers_in_sync:
      values.delivery_mode === 's3_and_workers' && values.keep_new_workers_in_sync
  } satisfies ModelPreheatCreate;
}

export async function prepareModelPreheatWithFreshSnapshot(options: {
  values: ModelPreheatCreate;
  loadWorkers: () => Promise<ModelPreheatWorker[]>;
  loadSnapshot: () => Promise<{
    profile: ModelPreheatS3Profile;
    check: ModelPreheatConnectivityCheck | null;
  }>;
}) {
  const { values, loadWorkers, loadSnapshot } = options;
  const [workers, { profile, check }] = await Promise.all([
    loadWorkers(),
    loadSnapshot()
  ]);
  const preview = buildModelPreheatPreview(values, workers, profile, check);
  return { profile, check, preview, workers };
}

export async function submitModelPreheatWithFreshSnapshot<T>(options: {
  values: ModelPreheatCreate;
  workers: ModelPreheatWorker[];
  idempotency: IdempotencyKeyLifecycle;
  loadWorkers: () => Promise<ModelPreheatWorker[]>;
  loadSnapshot: () => Promise<{
    profile: ModelPreheatS3Profile;
    check: ModelPreheatConnectivityCheck | null;
  }>;
  createTask: (payload: ModelPreheatCreate, key: string) => Promise<T>;
}) {
  const { values, idempotency, createTask } = options;
  const { profile, check, preview, workers } =
    await prepareModelPreheatWithFreshSnapshot(options);
  if (!preview.canSubmit) {
    return { submitted: false, task: null, profile, check, preview, workers };
  }

  const payload = buildModelPreheatCreatePayload(values);
  const idempotencyKey = idempotency.keyForRequest(JSON.stringify(payload));
  const task = await createTask(payload, idempotencyKey);
  idempotency.complete();
  return { submitted: true, task, profile, check, preview, workers };
}

export function buildModelPreheatS3ProfilePayload(
  values: ModelPreheatS3ProfileWrite,
  editing: boolean
) {
  const payload: ModelPreheatS3ProfileWrite = {
    name: values.name.trim(),
    description: values.description?.trim() || null,
    endpoint: values.endpoint.trim(),
    bucket: values.bucket.trim(),
    tls_enabled: values.tls_enabled ?? true,
    tls_verify: values.tls_verify ?? true,
    region: values.region?.trim() || '',
    inventory_refresh_interval_seconds:
      values.inventory_refresh_interval_seconds ?? null,
    use_virtual_hosted_style: values.use_virtual_hosted_style ?? true,
    source_fallback_enabled: values.source_fallback_enabled ?? true,
    default_slot: values.default_slot ?? null
  };
  if (!editing) {
    // 手工 Profile 新建时不支持对象前缀。
    payload.prefix = '';
  }
  const accessKey = values.access_key?.trim();
  const secretKey = values.secret_key?.trim();
  if (!editing || accessKey) {
    payload.access_key = accessKey || '';
  }
  if (!editing || secretKey) {
    payload.secret_key = secretKey || '';
  }
  return payload;
}

export function buildSystemManagedModelPreheatS3ProfilePayload(
  values: ModelPreheatS3ProfileWrite
): Pick<
  ModelPreheatS3ProfileWrite,
  | 'default_slot'
  | 'tls_enabled'
  | 'tls_verify'
  | 'use_virtual_hosted_style'
  | 'source_fallback_enabled'
> {
  return {
    default_slot: values.default_slot ?? null,
    tls_enabled: values.tls_enabled ?? true,
    tls_verify: values.tls_verify ?? true,
    use_virtual_hosted_style: values.use_virtual_hosted_style ?? true,
    source_fallback_enabled: values.source_fallback_enabled ?? true
  };
}

export function getModelPreheatTaskActions(
  desiredState: ModelPreheatTask['desired_state'],
  executionState: ModelPreheatExecutionState
): ModelPreheatTaskAction[] {
  if (desiredState === 'canceled') {
    return [];
  }
  if (desiredState === 'paused') {
    return ['resume', 'cancel'];
  }
  if (executionState === 'error') {
    return ['retry'];
  }
  if (
    [
      'pending',
      'resolving',
      'scanning',
      'staging',
      'publishing',
      'distributing',
      'paused'
    ].includes(executionState)
  ) {
    return ['pause', 'cancel'];
  }
  return [];
}
