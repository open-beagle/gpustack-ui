import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ModelPreheatCreateSummary from './model-preheat-create-summary';

describe('创建摘要', () => {
  it('展示 S3 与节点的最终流向、目标数及诚实容量', () => {
    render(
      <ModelPreheatCreateSummary
        formatMessage={({ id }) => id}
        flow="model -> profile -> workers"
        targetCount={2}
        capacityBytes={3 * 1024 * 1024 * 1024}
      />
    );

    expect(screen.getByText('model -> profile -> workers')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3 GB')).toBeInTheDocument();
    expect(screen.getByText('resources.preheat.confirm.skipRuleValue')).toBeInTheDocument();
    expect(screen.getByText('resources.preheat.confirm.conflictRuleValue.workers')).toBeInTheDocument();
  });

  it('为固定 Artifact 显示模型大小，并如实标记 GPU 范围待执行时确定', () => {
    render(
      <ModelPreheatCreateSummary
        formatMessage={({ id }) => id}
        flow="artifact -> profile -> workers"
        targetPending
        artifactBytes={1536 * 1024 * 1024}
      />
    );

    expect(screen.getByText('resources.preheat.confirm.targetPending')).toBeInTheDocument();
    expect(screen.getByText('1.5 GB')).toBeInTheDocument();
    expect(screen.getByText('resources.preheat.confirm.capacityUnavailable')).toBeInTheDocument();
  });
});
