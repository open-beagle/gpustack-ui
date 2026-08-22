import type {
  ModelPreheatConnectivityCheck,
  ModelPreheatConnectivityWorker,
  ModelPreheatCreate,
  ModelPreheatExecutionState,
  ModelPreheatInventoryJob,
  ModelPreheatS3Profile,
  ModelPreheatS3ProfileWrite,
  ModelPreheatTask,
  ModelPreheatWorker
} from './types';

export type ModelPreheatTaskAction = 'pause' | 'resume' | 'cancel' | 'retry';

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

export interface ScopedInventoryJob {
  profileId: number;
  job: ModelPreheatInventoryJob;
}

export function inventoryJobForProfile(
  scopedJob: ScopedInventoryJob | null,
  profileId?: number
) {
  if (!scopedJob || scopedJob.profileId !== profileId) return null;
  return scopedJob.job;
}

export async function refreshScopedInventoryJob(
  scopedJob: ScopedInventoryJob,
  loadJob: (
    profileId: number,
    jobId: number
  ) => Promise<ModelPreheatInventoryJob>
) {
  const job = await loadJob(scopedJob.profileId, scopedJob.job.id);
  return { profileId: scopedJob.profileId, job };
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
  const byId = new Map(latest.map((worker) => [worker.id, worker]));
  const ready = latest.filter((worker) => worker.state === 'ready');
  const readyById = new Map(ready.map((worker) => [worker.id, worker]));

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
  } else if (profile.connectivity_state === 'stale') {
    blockingReasons.push({ code: 'profile_connectivity_stale' });
  } else if (!check || check.profile_id !== profile.id) {
    blockingReasons.push({ code: 'connectivity_check_required' });
  } else if (check.profile_config_version !== profile.config_version) {
    blockingReasons.push({ code: 'connectivity_config_stale' });
  } else {
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
      if (!result) {
        blockingReasons.push({
          code: 'worker_connectivity_missing',
          workerName: worker.name
        });
      } else if (
        result.state !== 'ready' ||
        !result.readable ||
        !result.writable ||
        !result.deletable
      ) {
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
    include_patterns: (values.include_patterns || [])
      .map((value) => value.trim())
      .filter(Boolean),
    exclude_patterns: (values.exclude_patterns || [])
      .map((value) => value.trim())
      .filter(Boolean),
    target_worker_ids:
      values.target_scope === 'selected_workers' ? values.target_worker_ids : []
  } satisfies ModelPreheatCreate;
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
  const { values, idempotency, loadWorkers, loadSnapshot, createTask } =
    options;
  const [workers, { profile, check }] = await Promise.all([
    loadWorkers(),
    loadSnapshot()
  ]);
  const preview = buildModelPreheatPreview(values, workers, profile, check);
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
    prefix: values.prefix?.trim() || '',
    tls_enabled: values.tls_enabled ?? true,
    tls_verify: values.tls_verify ?? true,
    region: values.region?.trim() || '',
    use_virtual_hosted_style: values.use_virtual_hosted_style ?? true,
    source_fallback_enabled: values.source_fallback_enabled ?? true,
    default_slot: values.default_slot ?? null
  };
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
