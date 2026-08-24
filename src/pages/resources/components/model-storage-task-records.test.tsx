import { describe, expect, it } from 'vitest';
import {
  getModelStorageRevisionPresentation,
  getModelStorageTaskStatusPresentation
} from '../config/model-preheat';
import { buildScheduleCron, getNextScheduleTimes } from './model-storage-schedule';

describe('共享模型存储任务记录契约', () => {
  it('将预热和同步的所有公开任务状态投影到统一任务语义', () => {
    expect(getModelStorageTaskStatusPresentation('resolving').messageId).toBe('resources.storage.syncTask.state.running');
    expect(getModelStorageTaskStatusPresentation('scanning').messageId).toBe('resources.storage.syncTask.state.running');
    expect(getModelStorageTaskStatusPresentation('publishing').messageId).toBe('resources.storage.syncTask.state.running');
    expect(getModelStorageTaskStatusPresentation('distributing').messageId).toBe('resources.storage.syncTask.state.running');
    expect(getModelStorageTaskStatusPresentation('paused').messageId).toBe('resources.storage.taskState.paused');
    expect(getModelStorageTaskStatusPresentation('partial').messageId).toBe('resources.storage.taskState.partial');
    expect(getModelStorageTaskStatusPresentation('ready').messageId).toBe('resources.storage.syncTask.state.ready');
  });

  it('Ollama 待解析 revision 为空时安全显示占位符', () => {
    expect(getModelStorageRevisionPresentation(null)).toEqual({
      full: '-', short: '-', kind: 'revision'
    });
  });

  it('分发 continuous 严格保持无 Cron，避免误提交为 scheduled', () => {
    const values = {
      trigger_mode: 'continuous' as const,
      schedule_preset: 'continuous' as const,
      timezone: 'Asia/Shanghai'
    };
    expect(buildScheduleCron(values)).toBeNull();
    expect(getNextScheduleTimes(values)).toEqual([]);
  });

  it('无效 custom Cron 不伪造未来执行时间', () => {
    expect(getNextScheduleTimes({
      trigger_mode: 'scheduled',
      schedule_preset: 'custom',
      cron_expression: 'invalid cron',
      timezone: 'UTC'
    })).toEqual([]);
  });
});
