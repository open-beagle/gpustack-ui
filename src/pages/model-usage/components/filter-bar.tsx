import { SyncOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Button, DatePicker, Select, Space } from 'antd';
import dayjs from 'dayjs';
import { ModelUsageOperation, ModelUsageQuery } from '../config/types';
import { operationOptions } from '../utils';

export interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  query: ModelUsageQuery;
  callDate: string;
  apiKeyOptions: FilterOption[];
  modelOptions: FilterOption[];
  sourceIpOptions: FilterOption[];
  loading?: boolean;
  onQueryChange: (query: ModelUsageQuery) => void;
  onCallDateChange: (date: string) => void;
  onRefresh: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  query,
  callDate,
  apiKeyOptions,
  modelOptions,
  sourceIpOptions,
  loading,
  onQueryChange,
  onCallDateChange,
  onRefresh
}) => {
  const intl = useIntl();

  const updateQuery = (patch: ModelUsageQuery) => {
    onQueryChange({ ...query, ...patch, page: 1 });
  };

  return (
    <Space wrap size={12} style={{ marginBottom: 16 }}>
      <DatePicker.RangePicker
        allowClear={false}
        value={[
          query.start_at ? dayjs(query.start_at) : dayjs().subtract(29, 'days'),
          query.end_at ? dayjs(query.end_at) : dayjs()
        ]}
        onChange={(dates) => {
          if (!dates?.[0] || !dates?.[1]) {
            return;
          }
          updateQuery({
            start_at: dates[0].startOf('day').toISOString(),
            end_at: dates[1].endOf('day').toISOString()
          });
        }}
      />
      <Select
        allowClear
        showSearch
        style={{ width: 180 }}
        placeholder={intl.formatMessage({ id: 'modelUsage.filters.apiKey' })}
        optionFilterProp="label"
        options={apiKeyOptions}
        value={query.api_key}
        onChange={(value?: string) => updateQuery({ api_key: value })}
      />
      <Select
        allowClear
        showSearch
        style={{ width: 180 }}
        placeholder={intl.formatMessage({ id: 'modelUsage.filters.model' })}
        optionFilterProp="label"
        options={modelOptions}
        value={query.model}
        onChange={(value?: string) => updateQuery({ model: value })}
      />
      <Select
        allowClear
        showSearch
        style={{ width: 160 }}
        placeholder={intl.formatMessage({ id: 'modelUsage.filters.sourceIp' })}
        optionFilterProp="label"
        options={sourceIpOptions}
        value={query.source_ip}
        onChange={(value?: string) => updateQuery({ source_ip: value })}
      />
      <Select
        allowClear
        style={{ width: 180 }}
        placeholder={intl.formatMessage({ id: 'modelUsage.filters.operation' })}
        options={operationOptions}
        value={query.operation}
        onChange={(value?: ModelUsageOperation) => updateQuery({ operation: value })}
      />
      <Select
        allowClear
        style={{ width: 140 }}
        placeholder={intl.formatMessage({ id: 'modelUsage.filters.status' })}
        value={query.status}
        options={[
          {
            label: intl.formatMessage({ id: 'modelUsage.status.success' }),
            value: 'success'
          },
          {
            label: intl.formatMessage({ id: 'modelUsage.status.failure' }),
            value: 'failure'
          }
        ]}
        onChange={(value) => updateQuery({ status: value })}
      />
      <DatePicker
        allowClear={false}
        value={dayjs(callDate)}
        placeholder={intl.formatMessage({ id: 'modelUsage.filters.callDate' })}
        onChange={(date) => {
          if (date) {
            onCallDateChange(date.format('YYYY-MM-DD'));
          }
        }}
      />
      <Button icon={<SyncOutlined />} loading={loading} onClick={onRefresh} />
    </Space>
  );
};

export default FilterBar;
