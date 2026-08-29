import { describe, expect, it } from 'vitest';
import { getEditScheduleType } from './edit-form-schedule';

describe('编辑部署表单初始值', () => {
  it('空 GPU 选择器保持自动调度并回显 Worker 选择器', () => {
    expect(getEditScheduleType({ gpu_ids: [] })).toBe('auto');
  });

  it('存在 GPU ID 时仍按手动调度回填', () => {
    expect(getEditScheduleType({ gpu_ids: ['gpu-1'] })).toBe('manual');
  });
});
