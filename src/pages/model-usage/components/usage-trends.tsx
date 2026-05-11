import LineChart from '@/components/echarts/line-chart';
import { useIntl } from '@umijs/max';
import { Card, Col, Row, Table, Tabs } from 'antd';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { DailyLogRow, HourlyLogRow } from '../config/types';
import { formatNumber } from '../utils';

interface UsageTrendsProps {
  dailyLogs: DailyLogRow[];
  hourlyLogs: HourlyLogRow[];
  selectedDate: string;
  loading?: boolean;
  onDateSelect: (date: string) => void;
}

const UsageTrends: React.FC<UsageTrendsProps> = ({
  dailyLogs,
  hourlyLogs,
  selectedDate,
  loading,
  onDateSelect
}) => {
  const intl = useIntl();
  const formatLocalHour = (hour: number) => {
    return dayjs(`${selectedDate}T${String(hour).padStart(2, '0')}:00:00Z`).format('HH:mm');
  };
  const dailyColumns: ColumnsType<DailyLogRow> = [
    {
      title: intl.formatMessage({ id: 'modelUsage.date' }),
      dataIndex: 'date'
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.requestCount' }),
      dataIndex: 'request_count',
      align: 'right',
      render: formatNumber
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.successCount' }),
      dataIndex: 'success_count',
      align: 'right',
      render: formatNumber
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.failureCount' }),
      dataIndex: 'failure_count',
      align: 'right',
      render: formatNumber
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.totalTokens' }),
      dataIndex: 'total_tokens',
      align: 'right',
      render: formatNumber
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.apiKeys' }),
      dataIndex: 'api_key_count',
      align: 'right',
      render: formatNumber
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.models' }),
      dataIndex: 'model_count',
      align: 'right',
      render: formatNumber
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.sourceIps' }),
      dataIndex: 'source_ip_count',
      align: 'right',
      render: formatNumber
    }
  ];

  const hourlyColumns: ColumnsType<HourlyLogRow> = [
    {
      title: intl.formatMessage({ id: 'modelUsage.hour' }),
      dataIndex: 'hour',
      render: (value) => formatLocalHour(value)
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.requestCount' }),
      dataIndex: 'request_count',
      align: 'right',
      render: formatNumber
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.successCount' }),
      dataIndex: 'success_count',
      align: 'right',
      render: formatNumber
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.failureCount' }),
      dataIndex: 'failure_count',
      align: 'right',
      render: formatNumber
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.totalTokens' }),
      dataIndex: 'total_tokens',
      align: 'right',
      render: formatNumber
    }
  ];

  const hourlyByHour = new Map(hourlyLogs.map((item) => [item.hour, item]));
  const hourlySeries: HourlyLogRow[] = Array.from({ length: 24 }, (_, hour) =>
    hourlyByHour.get(hour) || {
      hour,
      request_count: 0,
      success_count: 0,
      failure_count: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  );
  const xAxisData = hourlySeries.map((item) => formatLocalHour(item.hour));
  const requestSeries = hourlySeries.map((item) => item.request_count || 0);
  const tokenSeries = hourlySeries.map((item) => item.total_tokens || 0);

  return (
    <Card
      bordered={false}
      title={intl.formatMessage({ id: 'modelUsage.usageTrends' })}
      style={{ marginBottom: 16 }}
    >
      <Tabs
        items={[
          {
            key: 'hourly',
            label: intl.formatMessage({ id: 'modelUsage.hourlyLogs' }),
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} xl={12}>
                  <LineChart
                    height={300}
                    title={intl.formatMessage({ id: 'modelUsage.hourlyRequests' })}
                    xAxisData={xAxisData}
                    seriesData={[
                      {
                        name: intl.formatMessage({ id: 'modelUsage.requestCount' }),
                        type: 'line',
                        color: '#1677ff',
                        data: requestSeries
                      }
                    ]}
                  />
                </Col>
                <Col xs={24} xl={12}>
                  <LineChart
                    height={300}
                    title={intl.formatMessage({ id: 'modelUsage.hourlyTokens' })}
                    xAxisData={xAxisData}
                    seriesData={[
                      {
                        name: intl.formatMessage({ id: 'modelUsage.totalTokens' }),
                        type: 'line',
                        color: '#52c41a',
                        data: tokenSeries
                      }
                    ]}
                  />
                </Col>
                <Col span={24}>
                  <Table
                    rowKey={(row) => `${row.hour}`}
                    loading={loading}
                    columns={hourlyColumns}
                    dataSource={hourlyLogs}
                    pagination={false}
                  />
                </Col>
              </Row>
            )
          },
          {
            key: 'daily',
            label: intl.formatMessage({ id: 'modelUsage.dailyLogs' }),
            children: (
              <Table
                rowKey="date"
                loading={loading}
                columns={dailyColumns}
                dataSource={dailyLogs}
                pagination={false}
                rowClassName={(row) => (row.date === selectedDate ? 'ant-table-row-selected' : '')}
                onRow={(row) => ({
                  onClick: () => onDateSelect(row.date),
                  style: { cursor: 'pointer' }
                })}
                scroll={{ x: 1000 }}
              />
            )
          }
        ]}
      />
    </Card>
  );
};

export default UsageTrends;
