import { CheckOutlined, CloseOutlined, MinusOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Descriptions, Modal, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import React from 'react';
import type {
  ModelPreheatConnectivityCheck,
  ModelPreheatConnectivityWorker,
  ModelPreheatS3Profile
} from '../config/types';

interface Props {
  open: boolean;
  profile?: ModelPreheatS3Profile | null;
  check?: ModelPreheatConnectivityCheck | null;
  loading?: boolean;
  onCancel: () => void;
}

const BoolResult: React.FC<{ value: boolean; unknown?: boolean }> = ({
  value,
  unknown
}) => {
  if (unknown) return <MinusOutlined />;
  return value ? (
    <CheckOutlined style={{ color: 'var(--ant-color-success)' }} />
  ) : (
    <CloseOutlined style={{ color: 'var(--ant-color-error)' }} />
  );
};

const ModelPreheatConnectivity: React.FC<Props> = ({
  open,
  profile,
  check,
  loading = false,
  onCancel
}) => {
  const intl = useIntl();
  const columns = [
    {
      title: intl.formatMessage({ id: 'resources.preheat.worker' }),
      dataIndex: 'worker_name',
      render: (value: string | null, record: ModelPreheatConnectivityWorker) =>
        value || record.worker_uuid
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.connectivity.read' }),
      dataIndex: 'readable',
      align: 'center' as const,
      render: (value: boolean, record: ModelPreheatConnectivityWorker) => (
        <BoolResult value={value} unknown={record.state === 'pending'} />
      )
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.connectivity.write' }),
      dataIndex: 'writable',
      align: 'center' as const,
      render: (value: boolean, record: ModelPreheatConnectivityWorker) => (
        <BoolResult value={value} unknown={record.state === 'pending'} />
      )
    },
    {
      title: intl.formatMessage({
        id: 'resources.preheat.connectivity.delete'
      }),
      dataIndex: 'deletable',
      align: 'center' as const,
      render: (value: boolean, record: ModelPreheatConnectivityWorker) => (
        <BoolResult value={value} unknown={record.state === 'pending'} />
      )
    },
    {
      title: intl.formatMessage({
        id: 'resources.preheat.connectivity.cleanup'
      }),
      dataIndex: 'cleanup_failed',
      align: 'center' as const,
      render: (value: boolean) =>
        value ? (
          <Tag color="error">
            {intl.formatMessage({ id: 'resources.preheat.state.error' })}
          </Tag>
        ) : (
          '-'
        )
    },
    {
      title: intl.formatMessage({
        id: 'resources.preheat.connectivity.latency'
      }),
      dataIndex: 'latency_ms',
      render: (value: number | null) => (value === null ? '-' : `${value} ms`)
    },
    {
      title: intl.formatMessage({
        id: 'resources.preheat.connectivity.failedStage'
      }),
      dataIndex: 'failed_stage',
      render: (value: string | null) => value || '-'
    },
    {
      title: intl.formatMessage({
        id: 'resources.preheat.connectivity.result'
      }),
      dataIndex: 'state',
      render: (value: string, record: ModelPreheatConnectivityWorker) => (
        <Tag
          color={
            value === 'ready'
              ? 'success'
              : value === 'error'
                ? 'error'
                : 'processing'
          }
        >
          {record.error_code ||
            intl.formatMessage({ id: `resources.preheat.state.${value}` })}
        </Tag>
      )
    }
  ];

  return (
    <Modal
      open={open}
      centered
      width={960}
      title={intl.formatMessage(
        { id: 'resources.preheat.connectivity.title' },
        { name: profile?.name || '' }
      )}
      footer={null}
      maskClosable={false}
      onCancel={onCancel}
    >
      <Descriptions
        size="small"
        column={{ xs: 1, sm: 2, md: 3, lg: 5 }}
        style={{ marginBottom: 16 }}
      >
        <Descriptions.Item
          label={intl.formatMessage({
            id: 'resources.preheat.connectivity.status'
          })}
        >
          {check?.state || profile?.connectivity_state || '-'}
        </Descriptions.Item>
        <Descriptions.Item
          label={intl.formatMessage({
            id: 'resources.preheat.connectivity.success'
          })}
        >
          {check?.summary.success ?? 0}
        </Descriptions.Item>
        <Descriptions.Item
          label={intl.formatMessage({
            id: 'resources.preheat.connectivity.failed'
          })}
        >
          {check?.summary.failed ?? 0}
        </Descriptions.Item>
        <Descriptions.Item
          label={intl.formatMessage({
            id: 'resources.preheat.connectivity.notChecked'
          })}
        >
          {check?.summary.not_checked ?? 0}
        </Descriptions.Item>
        <Descriptions.Item
          label={intl.formatMessage({
            id: 'resources.preheat.connectivity.checkedAt'
          })}
        >
          {check?.finished_at
            ? dayjs(check.finished_at).format('YYYY-MM-DD HH:mm:ss')
            : '-'}
        </Descriptions.Item>
      </Descriptions>
      <Table
        rowKey="worker_uuid"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={check?.workers || []}
        pagination={false}
        scroll={{ x: 860 }}
      />
    </Modal>
  );
};

export default ModelPreheatConnectivity;
