import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Button, Card, Divider, Popconfirm, Space, Spin, message } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import {
  modelUsageCallsExportUrl,
  queryApiKeyUsageRanking,
  queryModelUsageDailyLogs,
  queryModelUsageHourlyLogs,
  queryModelUsageCalls,
  queryModelUsageOverview,
  queryModelUsageRanking,
  queryModelUsageServerSummary,
  querySourceIpUsageRanking,
  rebuildModelUsageStats
} from './apis';
import CallsTable from './components/calls-table';
import FilterBar from './components/filter-bar';
import OverviewCards from './components/overview-cards';
import RankingTables from './components/ranking-tables';
import ServerSummaryTable from './components/server-summary-table';
import UsageTrends from './components/usage-trends';
import {
  ApiKeyUsageRow,
  DailyLogRow,
  HourlyLogRow,
  ModelUsageCallRow,
  ModelUsageOverview,
  ModelUsageQuery,
  ModelUsageRow,
  ServerSummaryRow,
  SourceIpUsageRow
} from './config/types';
import {
  DEFAULT_PAGE_SIZE,
  compactQuery,
  defaultModelUsageQuery,
  todayForCalls
} from './utils';

const ModelUsagePage: React.FC = () => {
  const intl = useIntl();
  const [query, setQuery] = useState<ModelUsageQuery>(defaultModelUsageQuery());
  const [callDate, setCallDate] = useState(todayForCalls());
  const [overview, setOverview] = useState<ModelUsageOverview>();
  const [apiKeys, setApiKeys] = useState<ApiKeyUsageRow[]>([]);
  const [models, setModels] = useState<ModelUsageRow[]>([]);
  const [sourceIps, setSourceIps] = useState<SourceIpUsageRow[]>([]);
  const [serverSummary, setServerSummary] = useState<ServerSummaryRow[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLogRow[]>([]);
  const [hourlyLogs, setHourlyLogs] = useState<HourlyLogRow[]>([]);
  const [calls, setCalls] = useState<ModelUsageCallRow[]>([]);
  const [callsTotal, setCallsTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);

  const fetchData = useCallback(
    async (nextQuery: ModelUsageQuery = query, nextCallDate: string = callDate) => {
      const params = compactQuery({ ...nextQuery, page: 1, page_size: 10 });
      const callsParams = compactQuery({
        ...nextQuery,
        page: nextQuery.page || 1,
        page_size: nextQuery.page_size || DEFAULT_PAGE_SIZE
      });
      setLoading(true);
      try {
        const [
          overviewRes,
          serverSummaryRes,
          apiKeyRes,
          modelRes,
          sourceIpRes,
          dailyLogsRes,
          hourlyLogsRes,
          callsRes
        ] = await Promise.allSettled([
          queryModelUsageOverview(params),
          queryModelUsageServerSummary(params),
          queryApiKeyUsageRanking(params),
          queryModelUsageRanking(params),
          querySourceIpUsageRanking(params),
          queryModelUsageDailyLogs(params),
          queryModelUsageHourlyLogs(nextCallDate, compactQuery(nextQuery)),
          queryModelUsageCalls(nextCallDate, callsParams)
        ]);
        setOverview(overviewRes.status === 'fulfilled' ? overviewRes.value : undefined);
        setServerSummary(
          serverSummaryRes.status === 'fulfilled' ? serverSummaryRes.value.items || [] : []
        );
        setApiKeys(apiKeyRes.status === 'fulfilled' ? apiKeyRes.value.items || [] : []);
        setModels(modelRes.status === 'fulfilled' ? modelRes.value.items || [] : []);
        setSourceIps(sourceIpRes.status === 'fulfilled' ? sourceIpRes.value.items || [] : []);
        setDailyLogs(dailyLogsRes.status === 'fulfilled' ? dailyLogsRes.value.items || [] : []);
        setHourlyLogs(hourlyLogsRes.status === 'fulfilled' ? hourlyLogsRes.value.items || [] : []);
        setCalls(callsRes.status === 'fulfilled' ? callsRes.value.items || [] : []);
        setCallsTotal(callsRes.status === 'fulfilled' ? callsRes.value.total || 0 : 0);
      } catch (error) {
        setOverview(undefined);
        setServerSummary([]);
        setApiKeys([]);
        setModels([]);
        setSourceIps([]);
        setDailyLogs([]);
        setHourlyLogs([]);
        setCalls([]);
        setCallsTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [query, callDate]
  );

  useEffect(() => {
    fetchData();
  }, []);

  const handleQueryChange = (nextQuery: ModelUsageQuery) => {
    const merged = {
      ...nextQuery,
      page: 1,
      page_size: query.page_size || DEFAULT_PAGE_SIZE
    };
    setQuery(merged);
    fetchData(merged, callDate);
  };

  const handleCallDateChange = (date: string) => {
    setCallDate(date);
    fetchData(query, date);
  };

  const handlePageChange = (page: number, pageSize: number) => {
    const nextQuery = { ...query, page, page_size: pageSize };
    setQuery(nextQuery);
    fetchData(nextQuery, callDate);
  };

  const handleExport = () => {
    window.open(modelUsageCallsExportUrl(callDate, compactQuery(query)), '_blank');
  };

  const handleRebuildStats = async () => {
    setRebuilding(true);
    try {
      await rebuildModelUsageStats({
        start_date: query.start_at ? dayjs(query.start_at).format('YYYY-MM-DD') : undefined,
        end_date: query.end_at ? dayjs(query.end_at).format('YYYY-MM-DD') : undefined
      });
      message.success(intl.formatMessage({ id: 'modelUsage.rebuildStatsSubmitted' }));
      fetchData();
    } finally {
      setRebuilding(false);
    }
  };

  return (
    <PageContainer
      ghost
      title={intl.formatMessage({ id: 'modelUsage.title' })}
      header={{
        style: {
          paddingInline: 'var(--layout-content-header-inlinepadding)'
        }
      }}
    >
      <Spin spinning={loading}>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <FilterBar
            query={query}
            callDate={callDate}
            loading={loading}
            onQueryChange={handleQueryChange}
            onCallDateChange={handleCallDateChange}
            onRefresh={() => fetchData()}
          />
          <Popconfirm
            title={intl.formatMessage({ id: 'modelUsage.rebuildStatsConfirm' })}
            onConfirm={handleRebuildStats}
          >
            <Button loading={rebuilding} danger>
              {intl.formatMessage({ id: 'modelUsage.rebuildStats' })}
            </Button>
          </Popconfirm>
        </Space>
        <OverviewCards data={overview} />
        <ServerSummaryTable data={serverSummary} loading={loading} />
        <UsageTrends dailyLogs={dailyLogs} hourlyLogs={hourlyLogs} loading={loading} />
        <Card bordered={false} title={intl.formatMessage({ id: 'modelUsage.ranking' })}>
          <RankingTables
            apiKeys={apiKeys}
            models={models}
            sourceIps={sourceIps}
            loading={loading}
          />
        </Card>
        <Divider />
        <Card bordered={false}>
          <CallsTable
            data={calls}
            total={callsTotal}
            page={query.page || 1}
            pageSize={query.page_size || DEFAULT_PAGE_SIZE}
            loading={loading}
            onPageChange={handlePageChange}
            onExport={handleExport}
          />
        </Card>
      </Spin>
    </PageContainer>
  );
};

export default ModelUsagePage;
