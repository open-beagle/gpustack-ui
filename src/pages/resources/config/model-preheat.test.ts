import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  IdempotencyKeyLifecycle,
  LatestRequestGate,
  buildModelPreheatPreview,
  buildModelPreheatS3ProfilePayload,
  getModelPreheatTaskActions,
  inventoryJobForProfile,
  loadAllPaginated,
  loadModelPreheatConnectivitySnapshot,
  refreshScopedInventoryJob,
  shouldPollModelPreheatConnectivity,
  submitModelPreheatWithFreshSnapshot
} from './model-preheat';
import type {
  ModelPreheatConnectivityCheck,
  ModelPreheatCreate,
  ModelPreheatInventoryJob,
  ModelPreheatS3Profile,
  ModelPreheatWorker
} from './types';

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
  connectivity_state: 'partial',
  last_connectivity_check_id: 21,
  last_connectivity_checked_at: '2026-08-11T08:00:00Z',
  created_at: '2026-08-11T07:00:00Z',
  updated_at: '2026-08-11T08:00:00Z'
};

const workers: ModelPreheatWorker[] = [
  {
    id: 12,
    worker_uuid: 'worker-a',
    name: 'a100-58',
    state: 'ready',
    status: { gpu_devices: [{ name: ' NVIDIA   A100 ' }] }
  },
  {
    id: 18,
    worker_uuid: 'worker-b',
    name: 'a100-59',
    state: 'ready',
    status: { gpu_devices: [{ name: 'nvidia a100' }] }
  },
  {
    id: 7,
    worker_uuid: 'worker-a',
    name: 'a100-old-registration',
    state: 'not_ready',
    status: { gpu_devices: [{ name: 'NVIDIA A100' }] }
  }
];

const connectivity: ModelPreheatConnectivityCheck = {
  id: 21,
  profile_id: 3,
  profile_config_version: 2,
  state: 'partial',
  summary: { success: 2, failed: 1, not_checked: 0 },
  workers: [
    {
      worker_uuid: 'worker-a',
      worker_id: 12,
      worker_name: 'a100-58',
      state: 'ready',
      readable: true,
      writable: true,
      deletable: true,
      cleanup_failed: false,
      latency_ms: 32,
      error_code: null,
      failed_stage: null
    },
    {
      worker_uuid: 'worker-b',
      worker_id: 18,
      worker_name: 'a100-59',
      state: 'ready',
      readable: true,
      writable: true,
      deletable: true,
      cleanup_failed: false,
      latency_ms: 40,
      error_code: null,
      failed_stage: null
    },
    {
      worker_uuid: 'worker-c',
      worker_id: 25,
      worker_name: 'offline-node',
      state: 'error',
      readable: false,
      writable: false,
      deletable: false,
      cleanup_failed: false,
      latency_ms: null,
      error_code: 'tcp_connection_failed',
      failed_stage: 'tcp'
    }
  ],
  created_at: '2026-08-11T07:59:00Z',
  updated_at: '2026-08-11T08:00:00Z',
  started_at: '2026-08-11T07:59:00Z',
  finished_at: '2026-08-11T08:00:00Z'
};

const createValues: ModelPreheatCreate = {
  source: 'modelscope',
  model_id: 'Qwen/Qwen-Image-2512',
  revision: 'master',
  include_patterns: [],
  exclude_patterns: [],
  target_scope: 'same_gpu_model',
  target_worker_ids: [],
  seed_worker_id: 12,
  s3_profile_id: 3,
  s3_backfill_policy: 'when_missing',
  keep_new_workers_in_sync: true
};

const inventoryJob: ModelPreheatInventoryJob = {
  id: 31,
  profile_id: 3,
  profile_config_version: 2,
  kind: 'refresh',
  state: 'running',
  scanned_count: 12,
  valid_count: 10,
  invalid_count: 1,
  orphan_count: 1,
  deleted_count: 0,
  skipped_count: 0,
  failed_count: 0,
  error_code: null,
  started_at: '2026-08-11T08:00:00Z',
  finished_at: null,
  created_at: '2026-08-11T07:59:00Z',
  updated_at: '2026-08-11T08:00:00Z'
};

describe('模型预热提交预览', () => {
  it('按后端规则去重注册并解析同 GPU 型号目标', () => {
    const result = buildModelPreheatPreview(
      createValues,
      workers,
      profile,
      connectivity
    );

    assert.deepEqual(
      result.rows.map((row) => [row.worker.id, row.worker.worker_uuid]),
      [
        [12, 'worker-a'],
        [18, 'worker-b']
      ]
    );
    assert.equal(result.canSubmit, true);
    assert.deepEqual(result.blockingReasons, []);
  });

  it('目标节点未通过最新配置的连通性检查时阻断提交', () => {
    const result = buildModelPreheatPreview(
      {
        ...createValues,
        target_scope: 'selected_workers',
        target_worker_ids: [12, 18]
      },
      workers,
      profile,
      {
        ...connectivity,
        profile_config_version: 1,
        workers: connectivity.workers.slice(0, 1)
      }
    );

    assert.equal(result.canSubmit, false);
    assert.deepEqual(result.blockingReasons, [
      { code: 'connectivity_config_stale' }
    ]);
  });

  it('手工 seed 不在已选目标内时阻断提交', () => {
    const result = buildModelPreheatPreview(
      {
        ...createValues,
        target_scope: 'selected_workers',
        target_worker_ids: [12],
        seed_worker_id: 18
      },
      workers,
      profile,
      connectivity
    );

    assert.equal(result.canSubmit, false);
    assert.deepEqual(result.blockingReasons, [
      { code: 'seed_worker_not_in_target_scope', workerName: 'a100-59' }
    ]);
  });

  it('仅有一个在线目标节点时标记单节点免回下载提示', () => {
    const result = buildModelPreheatPreview(
      { ...createValues, target_scope: 'seed_worker' },
      workers.slice(0, 1),
      profile,
      { ...connectivity, workers: connectivity.workers.slice(0, 1) }
    );

    assert.equal(result.singleWorker, true);
    assert.equal(result.canSubmit, true);
  });

  it('后端已标记连接结果过期时不复用旧矩阵提交', () => {
    const result = buildModelPreheatPreview(
      createValues,
      workers,
      { ...profile, connectivity_state: 'stale' },
      connectivity
    );

    assert.equal(result.canSubmit, false);
    assert.deepEqual(result.blockingReasons, [
      { code: 'profile_connectivity_stale' }
    ]);
  });

  it('相同 UUID 重注册后不复用旧 worker ID 的连通性结果', () => {
    const reRegisteredWorkers = [
      ...workers,
      {
        ...workers[0],
        id: 30,
        name: 'a100-58-re-registered'
      }
    ];
    const result = buildModelPreheatPreview(
      {
        ...createValues,
        target_scope: 'seed_worker',
        seed_worker_id: 30
      },
      reRegisteredWorkers,
      profile,
      connectivity
    );

    assert.equal(result.canSubmit, false);
    assert.deepEqual(result.blockingReasons, [
      {
        code: 'worker_connectivity_missing',
        workerName: 'a100-58-re-registered'
      }
    ]);
    assert.equal(result.rows[0].connectivity, null);
  });
});

describe('S3 凭据写入边界', () => {
  it('编辑时不把服务端凭据状态或空白凭据写回', () => {
    const result = buildModelPreheatS3ProfilePayload(
      {
        ...profile,
        access_key: '   ',
        secret_key: ''
      },
      true
    );

    assert.deepEqual(result, {
      name: 'center-cache',
      description: '主缓存',
      endpoint: 'https://s3.example.com',
      bucket: 'models',
      prefix: 'team-a',
      tls_enabled: true,
      tls_verify: true,
      region: 'cn-north-1',
      use_virtual_hosted_style: false,
      is_default: true
    });
    assert.equal('credential_configured' in result, false);
  });
});

describe('任务操作状态', () => {
  it('只为当前状态返回后端允许的阻断式动作', () => {
    assert.deepEqual(getModelPreheatTaskActions('running', 'distributing'), [
      'pause',
      'cancel'
    ]);
    assert.deepEqual(getModelPreheatTaskActions('paused', 'paused'), [
      'resume',
      'cancel'
    ]);
    assert.deepEqual(getModelPreheatTaskActions('running', 'error'), ['retry']);
    assert.deepEqual(getModelPreheatTaskActions('running', 'ready'), []);
  });

  it('暂停确认尚未收敛时优先 desired state 展示继续操作', () => {
    assert.deepEqual(getModelPreheatTaskActions('paused', 'distributing'), [
      'resume',
      'cancel'
    ]);
    assert.deepEqual(
      getModelPreheatTaskActions('canceled', 'distributing'),
      []
    );
  });
});

describe('幂等键生命周期', () => {
  it('同一明确操作失败后复用，完成或放弃后重新操作生成新键', () => {
    const generated = ['key-1', 'key-2', 'key-3'];
    const lifecycle = new IdempotencyKeyLifecycle(() => generated.shift()!);

    assert.equal(lifecycle.start(), 'key-1');
    assert.equal(lifecycle.current(), 'key-1');
    assert.equal(lifecycle.current(), 'key-1');
    lifecycle.complete();
    assert.equal(lifecycle.start(), 'key-2');
    lifecycle.abandon();
    assert.equal(lifecycle.start(), 'key-3');
  });

  it('失败后相同请求复用键，修改请求体后换新键', () => {
    const generated = ['key-a', 'key-b'];
    const lifecycle = new IdempotencyKeyLifecycle(() => generated.shift()!);

    lifecycle.start();
    assert.equal(lifecycle.keyForRequest('payload-a'), 'key-a');
    assert.equal(lifecycle.keyForRequest('payload-a'), 'key-a');
    assert.equal(lifecycle.keyForRequest('payload-b'), 'key-b');
  });
});

describe('管理端全量分页加载', () => {
  it('遍历后端全部分页而不是把第一页 100 条当作全集', async () => {
    const calls: Array<[number, number]> = [];
    const items = await loadAllPaginated(async (page, perPage) => {
      calls.push([page, perPage]);
      return {
        items:
          page === 1 ? Array.from({ length: 100 }, (_, i) => i + 1) : [101],
        pagination: { page, perPage, total: 101, totalPage: 2 }
      };
    });

    assert.equal(items.length, 101);
    assert.equal(items[100], 101);
    assert.deepEqual(calls, [
      [1, 100],
      [2, 100]
    ]);
  });
});

describe('异步请求代次', () => {
  it('后发请求先完成时丢弃旧请求的迟到结果', async () => {
    const gate = new LatestRequestGate();
    let resolveOld!: (value: string) => void;
    let resolveCurrent!: (value: string) => void;
    const applied: string[] = [];
    const oldRequest = gate.run(
      () =>
        new Promise<string>((resolve) => {
          resolveOld = resolve;
        }),
      (value) => applied.push(value)
    );
    const currentRequest = gate.run(
      () =>
        new Promise<string>((resolve) => {
          resolveCurrent = resolve;
        }),
      (value) => applied.push(value)
    );

    resolveCurrent('profile-b');
    assert.equal(await currentRequest, true);
    resolveOld('profile-a');
    assert.equal(await oldRequest, false);
    assert.deepEqual(applied, ['profile-b']);
  });

  it('失效请求在完成后不再更新状态', async () => {
    const gate = new LatestRequestGate();
    let resolve!: (value: string) => void;
    const applied: string[] = [];
    const request = gate.run(
      () =>
        new Promise<string>((done) => {
          resolve = done;
        }),
      (value) => applied.push(value)
    );

    gate.invalidate();
    resolve('closed-modal');
    assert.equal(await request, false);
    assert.deepEqual(applied, []);
  });
});

describe('库存任务 profile 隔离', () => {
  it('切换 profile 后旧 job 不会锁住新 profile 的操作', () => {
    const scopedJob = { profileId: 3, job: inventoryJob };

    assert.equal(inventoryJobForProfile(scopedJob, 3)?.id, 31);
    assert.equal(inventoryJobForProfile(scopedJob, 4), null);
  });

  it('轮询始终使用 job 创建时的 profile 路径', async () => {
    const calls: Array<[number, number]> = [];
    const result = await refreshScopedInventoryJob(
      { profileId: 3, job: inventoryJob },
      async (profileId, jobId) => {
        calls.push([profileId, jobId]);
        return { ...inventoryJob, state: 'ready' };
      }
    );

    assert.deepEqual(calls, [[3, 31]]);
    assert.equal(result.profileId, 3);
    assert.equal(result.job.state, 'ready');
  });
});

describe('连通性快照刷新', () => {
  it('按最新 profile 指针读取当前配置版本的检测结果', async () => {
    const latestProfile = {
      ...profile,
      config_version: 3,
      last_connectivity_check_id: 22,
      connectivity_state: 'checking' as const
    };
    const latestCheck = {
      ...connectivity,
      id: 22,
      profile_config_version: 3,
      state: 'running' as const
    };
    const checkCalls: Array<[number, number]> = [];
    const snapshot = await loadModelPreheatConnectivitySnapshot(
      profile.id,
      async () => latestProfile,
      async (profileId, checkId) => {
        checkCalls.push([profileId, checkId]);
        return latestCheck;
      }
    );

    assert.equal(snapshot.profile.config_version, 3);
    assert.equal(snapshot.check?.id, 22);
    assert.deepEqual(checkCalls, [[3, 22]]);
    assert.equal(
      shouldPollModelPreheatConnectivity(snapshot.profile, snapshot.check),
      true
    );
    assert.equal(
      shouldPollModelPreheatConnectivity(profile, connectivity),
      false
    );
  });

  it('提交前使用新鲜 stale 状态阻断创建请求', async () => {
    const idempotency = new IdempotencyKeyLifecycle(() => 'unused-key');
    idempotency.start();
    let createCalled = false;
    const result = await submitModelPreheatWithFreshSnapshot({
      values: createValues,
      workers,
      idempotency,
      loadWorkers: async () => workers,
      loadSnapshot: async () => ({
        profile: { ...profile, connectivity_state: 'stale' },
        check: connectivity
      }),
      createTask: async () => {
        createCalled = true;
        return 'unexpected';
      }
    });

    assert.equal(result.submitted, false);
    assert.equal(result.task, null);
    assert.equal(createCalled, false);
    assert.deepEqual(result.preview.blockingReasons, [
      { code: 'profile_connectivity_stale' }
    ]);
  });

  it('提交前重新加载 worker 并用重注册身份阻断旧选择', async () => {
    const idempotency = new IdempotencyKeyLifecycle(() => 'unused-key');
    idempotency.start();
    const freshWorkers = [
      ...workers,
      { ...workers[0], id: 30, name: 'a100-58-re-registered' }
    ];
    let workersLoaded = 0;
    let createCalled = false;
    const result = await submitModelPreheatWithFreshSnapshot({
      values: {
        ...createValues,
        target_scope: 'seed_worker',
        seed_worker_id: 12
      },
      workers,
      idempotency,
      loadWorkers: async () => {
        workersLoaded += 1;
        return freshWorkers;
      },
      loadSnapshot: async () => ({ profile, check: connectivity }),
      createTask: async () => {
        createCalled = true;
        return 'unexpected';
      }
    });

    assert.equal(workersLoaded, 1);
    assert.equal(createCalled, false);
    assert.equal(result.submitted, false);
    assert.deepEqual(result.preview.blockingReasons, [
      { code: 'seed_worker_not_ready' }
    ]);
    assert.deepEqual(result.workers, freshWorkers);
  });
});

describe('创建任务交互幂等', () => {
  it('实际提交失败复用 key，payload 变化换 key，成功后完成生命周期', async () => {
    const generated = ['key-a', 'key-b'];
    const idempotency = new IdempotencyKeyLifecycle(() => generated.shift()!);
    idempotency.start();
    const calls: Array<{ modelId: string; key: string }> = [];
    const createTask = async (payload: ModelPreheatCreate, key: string) => {
      calls.push({ modelId: payload.model_id, key });
      if (calls.length < 3) throw new Error('network_error');
      return 'task-created';
    };
    const submit = (values: ModelPreheatCreate) =>
      submitModelPreheatWithFreshSnapshot({
        values,
        workers,
        idempotency,
        loadWorkers: async () => workers,
        loadSnapshot: async () => ({ profile, check: connectivity }),
        createTask
      });

    await assert.rejects(() => submit(createValues), /network_error/);
    await assert.rejects(() => submit(createValues), /network_error/);
    const result = await submit({ ...createValues, model_id: 'Qwen/Qwen3' });

    assert.deepEqual(calls, [
      { modelId: 'Qwen/Qwen-Image-2512', key: 'key-a' },
      { modelId: 'Qwen/Qwen-Image-2512', key: 'key-a' },
      { modelId: 'Qwen/Qwen3', key: 'key-b' }
    ]);
    assert.equal(result.submitted, true);
    assert.equal(result.task, 'task-created');
    assert.throws(() => idempotency.current(), /尚未开始/);
  });
});
