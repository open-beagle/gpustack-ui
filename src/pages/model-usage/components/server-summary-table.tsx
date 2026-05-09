import { useIntl } from '@umijs/max';
import { Card, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { ServerSummaryRow } from '../config/types';
import { formatBytes, formatNumber, formatRate } from '../utils';

interface ServerSummaryTableProps {
  data: ServerSummaryRow[];
  loading?: boolean;
}

const ServerSummaryTable: React.FC<ServerSummaryTableProps> = ({ data, loading }) => {
  const intl = useIntl();
  const columns: ColumnsType<ServerSummaryRow> = [
    {
      title: intl.formatMessage({ id: 'modelUsage.worker' }),
      dataIndex: 'worker_name',
      render: (value, row) => value || row.worker_id || '-'
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.workerIp' }),
      dataIndex: 'worker_ip',
      render: (value) => value || '-'
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.gpuModel' }),
      dataIndex: 'gpu_model',
      render: (value) => value || '-'
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.gpuCount' }),
      dataIndex: 'gpu_count',
      align: 'right',
      render: formatNumber
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.gpuMemory' }),
      dataIndex: 'gpu_memory_bytes',
      align: 'right',
      render: formatBytes
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.avgGpuUsage' }),
      dataIndex: 'avg_gpu_usage_rate',
      align: 'right',
      render: formatRate
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.avgVramUsage' }),
      dataIndex: 'avg_vram_usage_rate',
      align: 'right',
      render: formatRate
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.allocatedVram' }),
      dataIndex: 'allocated_vram_bytes',
      align: 'right',
      render: formatBytes
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.totalTokens' }),
      dataIndex: 'total_tokens',
      align: 'right',
      render: formatNumber
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.remainResource' }),
      dataIndex: 'remain_resource',
      render: (value) => value || '-'
    }
  ];

  return (
    <Card
      bordered={false}
      title={intl.formatMessage({ id: 'modelUsage.serverSummary' })}
      style={{ marginBottom: 16 }}
    >
      <Table
        rowKey={(row) => `${row.worker_id || row.worker_name || row.worker_ip}`}
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={false}
        scroll={{ x: 1400 }}
      />
    </Card>
  );
};

export default ServerSummaryTable;
