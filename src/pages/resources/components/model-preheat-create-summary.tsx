import { Descriptions } from 'antd';
import React from 'react';

interface Props {
  formatMessage: (descriptor: { id: string }) => string;
  flow: string;
  targetCount?: number;
  capacityBytes?: number | null;
  artifactBytes?: number | null;
  targetPending?: boolean;
  kind?: 's3_only' | 'workers' | 'artifact';
}

const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length
  );
  const amount = value / 1024 ** index;
  return `${amount.toFixed(amount >= 10 || Number.isInteger(amount) ? 0 : 1)} ${units[index - 1]}`;
};

const ModelPreheatCreateSummary: React.FC<Props> = ({
  formatMessage,
  flow,
  targetCount,
  capacityBytes,
  artifactBytes,
  targetPending = false,
  kind = 'workers'
}) => (
  <Descriptions column={1} size="small">
    <Descriptions.Item label={formatMessage({ id: 'resources.preheat.confirm.flow' })}>
      {flow}
    </Descriptions.Item>
    <Descriptions.Item label={formatMessage({ id: 'resources.preheat.confirm.targetCount' })}>
      {targetPending
        ? formatMessage({ id: 'resources.preheat.confirm.targetPending' })
        : String(targetCount || 0)}
    </Descriptions.Item>
    <Descriptions.Item label={formatMessage({ id: 'resources.preheat.confirm.capacity' })}>
      {capacityBytes === undefined || capacityBytes === null
        ? formatMessage({ id: 'resources.preheat.confirm.capacityUnavailable' })
        : formatBytes(capacityBytes)}
    </Descriptions.Item>
    {artifactBytes !== undefined && artifactBytes !== null && (
      <Descriptions.Item label={formatMessage({ id: 'resources.preheat.confirm.artifactSize' })}>
        {formatBytes(artifactBytes)}
      </Descriptions.Item>
    )}
    <Descriptions.Item label={formatMessage({ id: 'resources.preheat.confirm.skipRule' })}>
      {formatMessage({ id: 'resources.preheat.confirm.skipRuleValue' })}
    </Descriptions.Item>
    <Descriptions.Item label={formatMessage({ id: 'resources.preheat.confirm.conflictRule' })}>
      {formatMessage({
        id: `resources.preheat.confirm.conflictRuleValue.${kind}`
      })}
    </Descriptions.Item>
  </Descriptions>
);

export default ModelPreheatCreateSummary;
