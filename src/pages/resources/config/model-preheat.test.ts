import { describe, expect, it } from 'vitest';
import enUSResources from '../../../locales/en-US/resources';
import jaJPResources from '../../../locales/ja-JP/resources';
import ruRUResources from '../../../locales/ru-RU/resources';
import zhCNResources from '../../../locales/zh-CN/resources';
import {
  IdempotencyKeyLifecycle,
  LatestRequestGate,
  buildModelPreheatPreview,
  buildModelPreheatS3ProfilePayload,
  buildSystemManagedModelPreheatS3ProfilePayload,
  eligibleModelPreheatWorkers,
  getModelFileDeletePreflight,
  getModelFileStorageModelId,
  getModelFileSyncActionState,
  getModelPreheatTaskActions,
  getModelStorageErrorPresentation,
  getModelStorageFlowPresentation,
  getModelStorageRevisionPresentation,
  getModelStorageSourceLabel,
  getModelStorageStatusPresentation,
  loadAllPaginated,
  loadModelPreheatConnectivitySnapshot,
  retryModelFileDeletePreflight,
  shouldPollModelPreheatConnectivity,
  submitModelPreheatWithFreshSnapshot
} from './model-preheat';
import type {
  ModelPreheatConnectivityCheck,
  ModelPreheatCreate,
  ModelPreheatS3Profile,
  ModelPreheatWorker
} from './types';

const profile: ModelPreheatS3Profile = {
  id: 3,
  name: 'center-cache',
  endpoint: 'https://s3.example.com',
  bucket: 'models',
  prefix: 'team-a',
  tls_enabled: true,
  tls_verify: true,
  region: 'cn-north-1',
  use_virtual_hosted_style: false,
  is_default: true,
  credential_configured: true,
  lifecycle_state: 'active',
  ever_used_at: null,
  config_version: 2,
  connectivity_state: 'available',
  last_connectivity_check_id: 21,
  last_connectivity_checked_at: '',
  created_at: '',
  updated_at: ''
};
const workers: ModelPreheatWorker[] = [
  {
    id: 12,
    worker_uuid: 'worker-a',
    name: 'a100-58',
    state: 'ready',
    model_storage_protocol_version: 1,
    status: { gpu_devices: [{ name: ' NVIDIA A100 ' }] }
  },
  {
    id: 18,
    worker_uuid: 'worker-b',
    name: 'a100-59',
    state: 'ready',
    model_storage_protocol_version: 1,
    status: { gpu_devices: [{ name: 'nvidia a100' }] }
  },
  {
    id: 7,
    worker_uuid: 'worker-a',
    name: 'old-worker-a',
    state: 'not_ready',
    status: { gpu_devices: [] }
  }
];
const check: ModelPreheatConnectivityCheck = {
  id: 21,
  profile_id: 3,
  profile_config_version: 2,
  state: 'available',
  summary: { success: 2, failed: 0, not_checked: 0 },
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
      latency_ms: 1,
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
      latency_ms: 1,
      error_code: null,
      failed_stage: null
    }
  ],
  created_at: '',
  updated_at: '',
  started_at: '',
  finished_at: ''
};
const values: ModelPreheatCreate = {
  source: 'modelscope',
  model_id: 'Qwen/Test',
  revision: 'main',
  include_patterns: [],
  exclude_patterns: [],
  target_scope: 'same_gpu_model',
  target_worker_ids: [],
  seed_worker_id: 12,
  s3_profile_id: 3,
  s3_backfill_policy: 'when_missing',
  keep_new_workers_in_sync: true
};

describe('预热配置逻辑', () => {
  it('按最新注册和 GPU 型号生成目标，并验证连通性', () => {
    const preview = buildModelPreheatPreview(values, workers, profile, check);
    expect(preview.rows.map((row) => row.worker.id)).toEqual([12, 18]);
    expect(preview.canSubmit).toBe(true);
  });

  it('旧配置检查不会触发连通性覆盖，但种子节点必须属于已选目标', () => {
    expect(
      buildModelPreheatPreview(values, workers, profile, {
        ...check,
        profile_config_version: 1
      }).blockingReasons
    ).toEqual([]);
    expect(
      buildModelPreheatPreview(
        {
          ...values,
          target_scope: 'selected_workers',
          target_worker_ids: [12],
          seed_worker_id: 18
        },
        workers,
        profile,
        check
      ).blockingReasons
    ).toContainEqual({
      code: 'seed_worker_not_in_target_scope',
      workerName: 'a100-59'
    });
  });

  it('编辑 Profile 不回传空凭据', () => {
    expect(
      buildModelPreheatS3ProfilePayload(
        { ...profile, access_key: ' ', secret_key: '' },
        true
      )
    ).not.toMatchObject({
      access_key: expect.anything(),
      secret_key: expect.anything()
    });
  });

  it('手工 Profile 仅创建时提交空 Prefix，编辑保留后端已有 Prefix', () => {
    expect(
      buildModelPreheatS3ProfilePayload(
        {
          ...profile,
          prefix: 'legacy',
          access_key: 'access',
          secret_key: 'secret'
        },
        false
      ).prefix
    ).toBe('');
    expect(
      buildModelPreheatS3ProfilePayload({ ...profile, prefix: 'legacy' }, true)
    ).not.toHaveProperty('prefix');
  });

  it('系统管理 Profile 的更新载荷只包含允许调整的开关', () => {
    expect(
      buildSystemManagedModelPreheatS3ProfilePayload({
        ...profile,
        name: '不应回传',
        endpoint: 'https://frozen.example.com',
        bucket: 'frozen-bucket',
        access_key: 'frozen-access-key',
        secret_key: 'frozen-secret-key',
        tls_enabled: false,
        tls_verify: false,
        use_virtual_hosted_style: true,
        source_fallback_enabled: false,
        default_slot: 'global'
      })
    ).toEqual({
      default_slot: 'global',
      tls_enabled: false,
      tls_verify: false,
      use_virtual_hosted_style: true,
      source_fallback_enabled: false
    });
  });

  it('单节点目标不要求回源下载', () => {
    const preview = buildModelPreheatPreview(
      { ...values, target_scope: 'seed_worker' },
      workers.slice(0, 1),
      profile,
      { ...check, workers: check.workers.slice(0, 1) }
    );
    expect(preview.singleWorker).toBe(true);
    expect(preview.canSubmit).toBe(true);
  });

  it('当前版本的成功检测结果不被旧 Profile 状态阻断', () => {
    expect(
      buildModelPreheatPreview(
        values,
        workers,
        { ...profile, connectivity_state: 'stale' },
        check
      ).blockingReasons
    ).toEqual([]);
  });

  it('Worker 重注册后缺少当前 ID 的检查结果不要求覆盖', () => {
    const preview = buildModelPreheatPreview(
      { ...values, target_scope: 'seed_worker', seed_worker_id: 30 },
      [...workers, { ...workers[0], id: 30, name: 'a100-58-re-registered' }],
      profile,
      check
    );
    expect(preview.blockingReasons).toEqual([]);
    expect(preview.rows[0].connectivity).toBeNull();
  });

  it('仅当前配置、已完成且 TTL 内的明确 ERROR 要求连通性覆盖', () => {
    const preview = buildModelPreheatPreview(values, workers, profile, {
      ...check,
      finished_at: new Date().toISOString(),
      workers: [{ ...check.workers[0], state: 'error' }, check.workers[1]]
    });

    expect(preview.blockingReasons).toEqual([
      { code: 'worker_connectivity_unavailable', workerName: 'a100-58' }
    ]);
  });

  it('未检测、过期错误和协议不兼容节点都不会误触发覆盖', () => {
    const noResult = buildModelPreheatPreview(values, workers, profile, {
      ...check,
      finished_at: new Date().toISOString(),
      workers: []
    });
    const expiredError = buildModelPreheatPreview(values, workers, profile, {
      ...check,
      finished_at: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
      workers: [{ ...check.workers[0], state: 'error' }, check.workers[1]]
    });
    const incompatibleWorkers = [
      ...workers,
      {
        id: 39,
        worker_uuid: 'worker-missing-version',
        name: 'missing-version',
        state: 'ready' as const
      },
      {
        id: 40,
        worker_uuid: 'worker-c',
        name: 'incompatible',
        state: 'ready' as const,
        model_storage_protocol_version: 2
      }
    ];

    expect(noResult.blockingReasons).toEqual([]);
    expect(expiredError.blockingReasons).toEqual([]);
    expect(
      eligibleModelPreheatWorkers(incompatibleWorkers).map(
        (worker) => worker.id
      )
    ).toEqual([12, 18]);
  });

  it('S3-only 使用 UUID 最小的可用 Seed，并在该节点明确失败时要求覆盖', () => {
    const preview = buildModelPreheatPreview(
      {
        ...values,
        delivery_mode: 's3_only',
        target_worker_ids: [],
        seed_worker_id: null
      },
      workers,
      profile,
      {
        ...check,
        finished_at: new Date().toISOString(),
        workers: [{ ...check.workers[0], state: 'error' }, check.workers[1]]
      }
    );

    expect(preview.rows.map((row) => row.worker.worker_uuid)).toEqual([
      'worker-a'
    ]);
    expect(preview.blockingReasons).toEqual([
      { code: 'worker_connectivity_unavailable', workerName: 'a100-58' }
    ]);
  });
});

describe('模型存储展示映射', () => {
  it('仅映射已知状态和错误码，未知值回退到通用文案', () => {
    expect(getModelStorageStatusPresentation('ready')).toEqual({
      value: 'ready',
      messageId: 'resources.storage.status.ready'
    });
    expect(getModelStorageStatusPresentation('future_state')).toEqual({
      value: 'future_state',
      messageId: 'resources.storage.status.unknown'
    });
    expect(getModelStorageErrorPresentation('artifact_not_ready')).toEqual({
      value: 'artifact_not_ready',
      messageId: 'resources.storage.error.artifactNotReady',
      actionHintId: 'resources.storage.error.unknown.actionHint'
    });
    expect(getModelStorageErrorPresentation('future_error')).toEqual({
      value: 'future_error',
      messageId: 'resources.storage.error.unknown',
      actionHintId: 'resources.storage.error.unknown.actionHint'
    });
  });

  it.each([
    [
      'model_sync_source_not_found',
      'resources.storage.error.syncSourceNotFound',
      'resources.storage.error.syncSourceNotFound.actionHint'
    ],
    [
      'model_sync_source_files_missing',
      'resources.storage.error.syncSourceFilesMissing',
      'resources.storage.error.syncSourceFilesMissing.actionHint'
    ],
    [
      'local_manifest_invalid',
      'resources.storage.error.localManifestInvalid',
      'resources.storage.error.localManifestInvalid.actionHint'
    ],
    [
      's3_manifest_invalid',
      'resources.storage.error.s3ManifestInvalid',
      'resources.storage.error.s3ManifestInvalid.actionHint'
    ],
    [
      'manifest_invalid',
      'resources.storage.error.manifestInvalid',
      'resources.storage.error.manifestInvalid.actionHint'
    ],
    [
      'worker_execution_failed',
      'resources.storage.error.workerExecutionFailed',
      'resources.storage.error.workerExecutionFailed.actionHint'
    ],
    [
      'future_error',
      'resources.storage.error.unknown',
      'resources.storage.error.unknown.actionHint'
    ]
  ])('错误 %s 同时返回标题和处理建议', (value, messageId, actionHintId) => {
    expect(getModelStorageErrorPresentation(value)).toEqual({
      value,
      messageId,
      actionHintId
    });
  });

  it('流转展示只返回国际化键和值，不硬编码界面文案', () => {
    expect(getModelStorageFlowPresentation('节点 A', '中心 S3')).toEqual({
      messageId: 'resources.storage.flow.workerToProfile',
      values: { worker: '节点 A', profile: '中心 S3', targetWorker: '' }
    });
    expect(
      getModelStorageFlowPresentation('节点 A', '中心 S3', '节点 B')
    ).toMatchObject({
      messageId: 'resources.storage.flow.workerToProfileToWorker'
    });
  });
});

describe('S3 配置删除文案', () => {
  const locales = [
    ['zh-CN', zhCNResources],
    ['en-US', enUSResources],
    ['ja-JP', jaJPResources],
    ['ru-RU', ruRUResources]
  ] as const;
  const contentKeys = [
    'resources.preheat.profile.deleteContent',
    'resources.preheat.profile.deleteContent.default',
    'resources.preheat.profile.deleteContent.system',
    'resources.preheat.profile.deleteContent.systemDefault'
  ] as const;

  it.each(locales)(
    '%s 包含删除标题和四态正文，正文明确目标名称',
    (_locale, resources) => {
      expect(resources['resources.preheat.profile.deleteConfirm']).toBeTruthy();
      for (const key of contentKeys) {
        expect(resources[key]).toContain('{name}');
      }
    }
  );
});

describe('同步确认文案', () => {
  const locales = [
    ['zh-CN', zhCNResources],
    ['en-US', enUSResources],
    ['ja-JP', jaJPResources],
    ['ru-RU', ruRUResources]
  ] as const;

  it.each(locales)('%s 说明摘要跳过和覆盖行为', (_locale, resources) => {
    expect(resources['resources.storage.sync.confirmSummary']).toBeTruthy();
  });
});

describe('模型存储错误处理文案', () => {
  const locales = [zhCNResources, enUSResources, jaJPResources, ruRUResources];
  const keys = [
    'resources.storage.artifact.filterSummary',
    'resources.storage.error.syncSourceNotFound.actionHint',
    'resources.storage.error.syncSourceFilesMissing',
    'resources.storage.error.syncSourceFilesMissing.actionHint',
    'resources.storage.error.localManifestInvalid',
    'resources.storage.error.localManifestInvalid.actionHint',
    'resources.storage.error.s3ManifestInvalid',
    'resources.storage.error.s3ManifestInvalid.actionHint',
    'resources.storage.error.manifestInvalid.actionHint',
    'resources.storage.error.workerExecutionFailed.actionHint',
    'resources.storage.error.unknown.actionHint'
  ] as const;

  it.each(locales)('新增标题与处理建议在四种语言中完整', (resources) => {
    for (const key of keys) expect(resources[key]).toBeTruthy();
  });
});

describe('节点模型同步入口', () => {
  it('Ready Hub 模型缺少 revision 仍可同步，原节点不可用时禁用', () => {
    const base = {
      state: 'ready',
      source: 'model_scope',
      resolved_revision: 'commit-1',
      transfer_source: null,
      transfer_profile_id: null
    };

    expect(getModelFileSyncActionState(base, 3)).toEqual({
      visible: true,
      disabled: false,
      reason: null
    });
    expect(getModelFileSyncActionState(base)).toEqual({
      visible: true,
      disabled: true,
      reason: 'no_default_profile'
    });
    expect(getModelFileSyncActionState(base, undefined, false)).toEqual({
      visible: true,
      disabled: false,
      reason: null
    });
    expect(
      getModelFileSyncActionState({ ...base, resolved_revision: null }, 3)
    ).toEqual({
      visible: true,
      disabled: false,
      reason: null
    });
    expect(
      getModelFileSyncActionState({ ...base, worker_available: false }, 3)
    ).toEqual({ visible: true, disabled: true, reason: 'worker_unavailable' });
    expect(
      getModelFileSyncActionState(
        {
          ...base,
          transfer_source: 'peer_via_s3',
          transfer_profile_id: 3
        },
        3
      )
    ).toEqual({
      visible: true,
      disabled: true,
      reason: 'already_from_default'
    });
    expect(
      getModelFileSyncActionState({ ...base, source: 'local_path' }, 3)
    ).toEqual({
      visible: true,
      disabled: true,
      reason: 'unsupported'
    });
  });

  it('Ollama Ready 模型无需 revision 即可同步并保留原始来源展示', () => {
    const ollama = {
      state: 'ready',
      source: 'ollama_library',
      resolved_revision: null,
      transfer_source: null,
      transfer_profile_id: null,
      worker_available: true,
      ollama_library_model_name: 'qwen3:32b'
    };

    expect(getModelFileSyncActionState(ollama, 3)).toEqual({
      visible: true,
      disabled: false,
      reason: null
    });
    expect(getModelFileStorageModelId(ollama)).toBe('qwen3:32b');
    expect(getModelStorageSourceLabel('ollama_library')).toBe('Ollama Library');
    expect(
      getModelFileSyncActionState(
        {
          ...ollama,
          transfer_source: 'peer_via_s3',
          transfer_profile_id: 3
        },
        3
      )
    ).toEqual({
      visible: true,
      disabled: true,
      reason: 'already_from_default'
    });
  });

  it('ModelScope 文件清单指纹只展示可读短值并保留完整值', () => {
    const revision =
      'modelscope-filelist-v1-d0f0cb5439088a905edc0cfde4676847e2b068daff9de4150c892891e797b03b';

    expect(getModelStorageRevisionPresentation(revision)).toEqual({
      full: revision,
      short: 'd0f0cb543908',
      kind: 'modelscope_filelist'
    });
    expect(getModelStorageRevisionPresentation('abc123')).toEqual({
      full: 'abc123',
      short: 'abc123',
      kind: 'revision'
    });
    expect(
      getModelStorageRevisionPresentation(
        'local-snapshot-d0f0cb5439088a905edc0cfde4676847'
      ).short
    ).toBe('d0f0cb543908');
  });
});

describe('节点模型删除预检', () => {
  it('逐状态查询所有选中模型，活动任务和查询错误都不会放行', async () => {
    const query = async (params: { model_file_id: number; state: string }) => ({
      items:
        params.model_file_id === 2 && params.state === 'publishing'
          ? [{ state: 'publishing' }]
          : []
    });
    await expect(getModelFileDeletePreflight([1, 2], query)).resolves.toBe(
      'active'
    );

    await expect(
      getModelFileDeletePreflight([1], async () => {
        throw new Error('network');
      })
    ).resolves.toBe('error');
  });

  it.each(['单删', '批删'])('%s 重试先清理旧错误弹窗再重新预检', () => {
    const calls: string[] = [];
    retryModelFileDeletePreflight(
      () => calls.push('retry'),
      () => calls.push('clear')
    );
    expect(calls).toEqual(['clear', 'retry']);
  });
});

describe('任务状态与请求保护', () => {
  it('只生成后端允许的任务动作', () => {
    expect(getModelPreheatTaskActions('running', 'distributing')).toEqual([
      'pause',
      'cancel'
    ]);
    expect(getModelPreheatTaskActions('paused', 'distributing')).toEqual([
      'resume',
      'cancel'
    ]);
    expect(getModelPreheatTaskActions('running', 'error')).toEqual(['retry']);
    expect(getModelPreheatTaskActions('running', 'ready')).toEqual([]);
    expect(getModelPreheatTaskActions('canceled', 'distributing')).toEqual([]);
  });

  it('失败重试复用幂等键，变更请求与重新操作换键', () => {
    const lifecycle = new IdempotencyKeyLifecycle(() => `key-${Math.random()}`);
    const first = lifecycle.start();
    expect(lifecycle.keyForRequest('a')).toBe(first);
    expect(lifecycle.keyForRequest('a')).toBe(first);
    expect(lifecycle.keyForRequest('b')).not.toBe(first);
    lifecycle.complete();
    expect(lifecycle.start()).not.toBe(first);
  });

  it('失败后相同请求复用 key，修改请求体后换新 key', () => {
    const lifecycle = new IdempotencyKeyLifecycle(() => `key-${Math.random()}`);
    lifecycle.start();
    expect(lifecycle.keyForRequest('payload-a')).toBe(
      lifecycle.keyForRequest('payload-a')
    );
    expect(lifecycle.keyForRequest('payload-b')).not.toBe(
      lifecycle.keyForRequest('payload-a')
    );
  });

  it('请求代次丢弃迟到结果', async () => {
    const gate = new LatestRequestGate();
    let resolveOld!: (value: string) => void;
    let resolveNew!: (value: string) => void;
    const applied: string[] = [];
    const oldRequest = gate.run(
      () =>
        new Promise<string>((resolve) => {
          resolveOld = resolve;
        }),
      (value) => applied.push(value)
    );
    const newRequest = gate.run(
      () =>
        new Promise<string>((resolve) => {
          resolveNew = resolve;
        }),
      (value) => applied.push(value)
    );
    resolveNew('new');
    resolveOld('old');
    await expect(newRequest).resolves.toBe(true);
    await expect(oldRequest).resolves.toBe(false);
    expect(applied).toEqual(['new']);
  });

  it('已失效的请求完成后不再更新界面状态', async () => {
    const gate = new LatestRequestGate();
    let resolve!: (value: string) => void;
    const applied: string[] = [];
    const pending = gate.run(
      () =>
        new Promise<string>((done) => {
          resolve = done;
        }),
      (value) => applied.push(value)
    );
    gate.invalidate();
    resolve('closed-modal');
    await expect(pending).resolves.toBe(false);
    expect(applied).toEqual([]);
  });
});

describe('预热前新鲜快照', () => {
  it('完整遍历分页并按 Profile 最新检测读取快照', async () => {
    const items = await loadAllPaginated(async (page, perPage) => ({
      items: page === 1 ? [1] : [2],
      pagination: { page, perPage, total: 2, totalPage: 2 }
    }));
    expect(items).toEqual([1, 2]);
    const snapshot = await loadModelPreheatConnectivitySnapshot(
      3,
      async () => ({
        ...profile,
        connectivity_state: 'checking',
        last_connectivity_check_id: 22
      }),
      async () => ({ ...check, id: 22, state: 'running' })
    );
    expect(
      shouldPollModelPreheatConnectivity(snapshot.profile, snapshot.check)
    ).toBe(true);
  });

  it('提交前重新加载 Worker 和连通性，允许当前版本的成功检测', async () => {
    const lifecycle = new IdempotencyKeyLifecycle(() => 'unused');
    lifecycle.start();
    const result = await submitModelPreheatWithFreshSnapshot({
      values,
      workers,
      idempotency: lifecycle,
      loadWorkers: async () => workers,
      loadSnapshot: async () => ({
        profile: { ...profile, connectivity_state: 'stale' },
        check
      }),
      createTask: async () => 'unexpected'
    });
    expect(result.submitted).toBe(true);
    expect(result.preview.blockingReasons).toEqual([]);
  });

  it('提交前按 Profile 最新检测指针读取连通性结果', async () => {
    const checkCalls: Array<[number, number]> = [];
    const snapshot = await loadModelPreheatConnectivitySnapshot(
      3,
      async () => ({
        ...profile,
        config_version: 3,
        connectivity_state: 'checking',
        last_connectivity_check_id: 22
      }),
      async (profileId, checkId) => {
        checkCalls.push([profileId, checkId]);
        return {
          ...check,
          id: 22,
          profile_config_version: 3,
          state: 'running'
        };
      }
    );
    expect(checkCalls).toEqual([[3, 22]]);
    expect(snapshot.check?.id).toBe(22);
    expect(
      shouldPollModelPreheatConnectivity(snapshot.profile, snapshot.check)
    ).toBe(true);
    expect(shouldPollModelPreheatConnectivity(profile, check)).toBe(false);
  });

  it('提交前重载 Worker 后阻断重注册导致的旧选择', async () => {
    const lifecycle = new IdempotencyKeyLifecycle(() => 'unused');
    lifecycle.start();
    let createCalled = false;
    const result = await submitModelPreheatWithFreshSnapshot({
      values,
      workers,
      idempotency: lifecycle,
      loadWorkers: async () => [
        ...workers,
        { ...workers[0], id: 30, name: 'a100-58-re-registered' }
      ],
      loadSnapshot: async () => ({ profile, check }),
      createTask: async () => {
        createCalled = true;
        return 'unexpected';
      }
    });
    expect(createCalled).toBe(false);
    expect(result.preview.blockingReasons).toContainEqual({
      code: 'seed_worker_not_ready'
    });
  });

  it('实际提交失败时复用 key，请求改变后换 key，成功后完成生命周期', async () => {
    const generated = ['key-a', 'key-b'];
    const lifecycle = new IdempotencyKeyLifecycle(() => generated.shift()!);
    lifecycle.start();
    const calls: Array<{ modelId: string; key: string }> = [];
    const createTask = async (payload: ModelPreheatCreate, key: string) => {
      calls.push({ modelId: payload.model_id, key });
      if (calls.length < 3) throw new Error('network_error');
      return 'task-created';
    };
    const submit = (input: ModelPreheatCreate) =>
      submitModelPreheatWithFreshSnapshot({
        values: input,
        workers,
        idempotency: lifecycle,
        loadWorkers: async () => workers,
        loadSnapshot: async () => ({ profile, check }),
        createTask
      });
    await expect(submit(values)).rejects.toThrow('network_error');
    await expect(submit(values)).rejects.toThrow('network_error');
    await expect(
      submit({ ...values, model_id: 'Qwen/Changed' })
    ).resolves.toMatchObject({ submitted: true, task: 'task-created' });
    expect(calls).toEqual([
      { modelId: 'Qwen/Test', key: 'key-a' },
      { modelId: 'Qwen/Test', key: 'key-a' },
      { modelId: 'Qwen/Changed', key: 'key-b' }
    ]);
    expect(() => lifecycle.current()).toThrow('幂等操作尚未开始');
  });
});
