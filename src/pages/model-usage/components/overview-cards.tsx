import { useIntl } from '@umijs/max';
import { Card, Col, Row, Statistic } from 'antd';
import { ModelUsageOverview } from '../config/types';
import { formatNumber, formatPercent } from '../utils';

const OverviewCards: React.FC<{ data?: ModelUsageOverview }> = ({ data }) => {
  const intl = useIntl();
  const items = [
    {
      title: intl.formatMessage({ id: 'modelUsage.totalRequests' }),
      value: formatNumber(data?.total_requests)
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.successRate' }),
      value: formatPercent(data?.success_rate)
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.totalTokens' }),
      value: formatNumber(data?.total_tokens)
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.promptTokens' }),
      value: formatNumber(data?.prompt_tokens)
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.completionTokens' }),
      value: formatNumber(data?.completion_tokens)
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.apiKeys' }),
      value: formatNumber(data?.api_key_count)
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.models' }),
      value: formatNumber(data?.model_count)
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.sourceIps' }),
      value: formatNumber(data?.source_ip_count)
    },
    {
      title: intl.formatMessage({ id: 'modelUsage.avgDuration' }),
      value: `${formatNumber(data?.avg_duration_ms)} ms`
    }
  ];

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      {items.map((item) => (
        <Col xs={24} sm={12} md={8} lg={6} xl={6} xxl={4} key={item.title}>
          <Card bordered={false}>
            <Statistic title={item.title} value={item.value} />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default OverviewCards;
