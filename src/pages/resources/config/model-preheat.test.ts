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
  getModelFileStorageModelId,
  getModelFileSyncActionState,
  getModelPreheatTaskActions,
  getModelStorageRevisionPresentation,
  getModelStorageSourceLabel,
  loadAllPaginated,
  loadModelPreheatConnectivitySnapshot,
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
    status: { gpu_devices: [{ name: ' NVIDIA A100 ' }] }
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

  it('阻断旧配置检查和不在目标范围内的种子节点', () => {
    expect(
      buildModelPreheatPreview(values, workers, profile, {
        ...check,
        profile_config_version: 1
      }).blockingReasons
    ).toEqual([{ code: 'connectivity_config_stale' }]);
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

  it('Worker 重注册后不复用旧 Worker ID 的连通性结果', () => {
    const preview = buildModelPreheatPreview(
      { ...values, target_scope: 'seed_worker', seed_worker_id: 30 },
      [...workers, { ...workers[0], id: 30, name: 'a100-58-re-registered' }],
      profile,
      check
    );
    expect(preview.blockingReasons).toEqual([
      {
        code: 'worker_connectivity_missing',
        workerName: 'a100-58-re-registered'
      }
    ]);
    expect(preview.rows[0].connectivity).toBeNull();
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
      visible: false,
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
