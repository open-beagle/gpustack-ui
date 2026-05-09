import { DownloadOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Button, Space, Table, Tag } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { ModelUsageCallRow } from '../config/types';
import { formatDateTime, formatNumber } from '../utils';

interface CallsTableProps {
  data: ModelUsageCallRow[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  onPageChange: (page: number, pageSize: number) => void;
  onExport: () => void;
}

const CallsTable: React.FC<CallsTableProps> = ({
  data,
  total,
  page,
  pageSize,
  loading,
  onPageChange,
  onExport
}) => {
  const intl = useIntl();
  const columns: ColumnsType<ModelUsageCallRow> = [
    {
      title: intl.formatMessage({ id: 'modelUsage.lastCallTime' }),
      dataIndex: 'call_time',
      width: 180,
      render: formatDateTime
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.apiKeyName' }),
      dataIndex: 'api_key_name',
      width: 160,
      render: (value, row) => value || row.api_key_access_key || '-'
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.modelName' }),
      dataIndex: 'model_name',
      width: 180,
      render: (value) => value || '-'
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.operation' }),
      dataIndex: 'operation',
      width: 150,
      render: (value) => value || '-'
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.sourceIp' }),
      dataIndex: 'source_ip',
      width: 140,
      render: (value) => value || '-'
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.totalTokens' }),
      dataIndex: 'total_tokens',
      align: 'right',
      width: 130,
      render: formatNumber
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.promptTokens' }),
      dataIndex: 'prompt_tokens',
      align: 'right',
      width: 140,
      render: formatNumber
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.completionTokens' }),
      dataIndex: 'completion_tokens',
      align: 'right',
      width: 170,
      render: formatNumber
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.statusCode' }),
      dataIndex: 'status_code',
      width: 120,
      render: (value, row) => (
        <Tag color={row.success ? 'success' : 'error'}>{value || '-'}</Tag>
      )
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.duration' }),
      dataIndex: 'duration_ms',
      align: 'right',
      width: 120,
      render: (value) => `${formatNumber(value)} ms`
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.worker' }),
      dataIndex: 'worker_name',
      width: 160,
      render: (value) => value || '-'
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.workerIp' }),
      dataIndex: 'worker_ip',
      width: 140,
      render: (value) => value || '-'
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.errorMessage' }),
      dataIndex: 'error_message',
      width: 260,
      ellipsis: true,
      render: (value) => value || '-'
    }
  ];

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
        <strong>{intl.formatMessage({ id: 'modelUsage.callLogs' })}</strong>
        <Button icon={<DownloadOutlined />} onClick={onExport}>
          {intl.formatMessage({ id: 'modelUsage.exportCsv' })}
        </Button>
      </Space>
      <Table
        rowKey={(row) => row.request_id || `${row.call_time}-${row.model_instance_id}`}
        loading={loading}
        columns={columns}
        dataSource={data}
        scroll={{ x: 1800 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: onPageChange
        }}
      />
    </div>
  );
};

export default CallsTable;
