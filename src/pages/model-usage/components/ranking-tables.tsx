import { useIntl } from '@umijs/max';
import { Table, Tabs } from 'antd';
import { ColumnsType } from 'antd/es/table';
import {
  ApiKeyUsageRow,
  ModelUsageRow,
  SourceIpUsageRow
} from '../config/types';
import { formatDateTime, formatNumber } from '../utils';

interface RankingTablesProps {
  apiKeys: ApiKeyUsageRow[];
  models: ModelUsageRow[];
  sourceIps: SourceIpUsageRow[];
  loading?: boolean;
}

const RankingTables: React.FC<RankingTablesProps> = ({
  apiKeys,
  models,
  sourceIps,
  loading
}) => {
  const intl = useIntl();

  const commonMetricColumns = [
    {
      title: intl.formatMessage({ id: 'modelUsage.requestCount' }),
      dataIndex: 'request_count',
      align: 'right' as const,
      render: formatNumber
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.totalTokens' }),
      dataIndex: 'total_tokens',
      align: 'right' as const,
      render: formatNumber
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.successCount' }),
      dataIndex: 'success_count',
      align: 'right' as const,
      render: formatNumber
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.failureCount' }),
      dataIndex: 'failure_count',
      align: 'right' as const,
      render: formatNumber
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.lastCallTime' }),
      dataIndex: 'last_call_time',
      render: formatDateTime
    }
  ];

  const apiKeyColumns: ColumnsType<ApiKeyUsageRow> = [
    {
      title: intl.formatMessage({ id: 'modelUsage.apiKeyName' }),
      dataIndex: 'api_key_name',
      render: (value, row) => value || row.api_key_access_key || '-'
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.apiKeyAccessKey' }),
      dataIndex: 'api_key_access_key',
      render: (value) => value || '-'
    },
    ...commonMetricColumns
  ];

  const modelColumns: ColumnsType<ModelUsageRow> = [
    {
      title: intl.formatMessage({ id: 'modelUsage.modelName' }),
      dataIndex: 'model_name',
      render: (value) => value || '-'
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.worker' }),
      dataIndex: 'worker_name',
      render: (value) => value || '-'
    },
    ...commonMetricColumns
  ];

  const sourceIpColumns: ColumnsType<SourceIpUsageRow> = [
    {
      title: intl.formatMessage({ id: 'modelUsage.sourceIp' }),
      dataIndex: 'source_ip',
      render: (value) => value || '-'
    },
    ...commonMetricColumns
  ];

  return (
    <Tabs
      items={[
        {
          key: 'api-keys',
          label: intl.formatMessage({ id: 'modelUsage.apiKeyRanking' }),
          children: (
            <Table
              rowKey={(row) => `${row.api_key_id || row.api_key_access_key}`}
              loading={loading}
              columns={apiKeyColumns}
              dataSource={apiKeys}
              pagination={false}
            />
          )
        },
        {
          key: 'models',
          label: intl.formatMessage({ id: 'modelUsage.modelRanking' }),
          children: (
            <Table
              rowKey={(row) => `${row.model_id || row.model_name}-${row.worker_id}`}
              loading={loading}
              columns={modelColumns}
              dataSource={models}
              pagination={false}
            />
          )
        },
        {
          key: 'source-ips',
          label: intl.formatMessage({ id: 'modelUsage.sourceIpRanking' }),
          children: (
            <Table
              rowKey={(row) => row.source_ip || 'unknown'}
              loading={loading}
              columns={sourceIpColumns}
              dataSource={sourceIps}
              pagination={false}
            />
          )
        }
      ]}
    />
  );
};

export default RankingTables;
