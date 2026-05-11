import { request } from '@umijs/max';
import qs from 'query-string';
import {
  ApiKeyUsageRow,
  CleanupUsageRequest,
  DailyLogRow,
  HourlyLogRow,
  ModelUsageCallRow,
  ModelUsageOverview,
  ModelUsageQuery,
  ModelUsageRow,
  PaginatedResponse,
  RebuildStatsRequest,
  ServerSummaryRow,
  SourceIpUsageRow
} from '../config/types';

export const MODEL_USAGE_API = '/model-usage';

export async function queryModelUsageOverview(params: ModelUsageQuery) {
  return request<ModelUsageOverview>(`${MODEL_USAGE_API}/overview`, {
    method: 'GET',
    params
  });
}

export async function queryModelUsageServerSummary(params: ModelUsageQuery) {
  return request<{ items: ServerSummaryRow[] }>(`${MODEL_USAGE_API}/server-summary`, {
    method: 'GET',
    params
  });
}

export async function queryApiKeyUsageRanking(params: ModelUsageQuery) {
  return request<PaginatedResponse<ApiKeyUsageRow>>(
    `${MODEL_USAGE_API}/api-keys`,
    {
      method: 'GET',
      params
    }
  );
}

export async function queryModelUsageRanking(params: ModelUsageQuery) {
  return request<PaginatedResponse<ModelUsageRow>>(`${MODEL_USAGE_API}/models`, {
    method: 'GET',
    params
  });
}

export async function querySourceIpUsageRanking(params: ModelUsageQuery) {
  return request<PaginatedResponse<SourceIpUsageRow>>(
    `${MODEL_USAGE_API}/source-ips`,
    {
      method: 'GET',
      params
    }
  );
}

export async function queryModelUsageCalls(date: string, params: ModelUsageQuery) {
  return request<PaginatedResponse<ModelUsageCallRow>>(
    `${MODEL_USAGE_API}/daily-logs/${date}/calls`,
    {
      method: 'GET',
      params
    }
  );
}

export async function queryModelUsageDailyLogs(params: ModelUsageQuery) {
  return request<PaginatedResponse<DailyLogRow>>(`${MODEL_USAGE_API}/daily-logs`, {
    method: 'GET',
    params
  });
}

export async function queryModelUsageHourlyLogs(date: string, params: ModelUsageQuery) {
  return request<{ items: HourlyLogRow[] }>(
    `${MODEL_USAGE_API}/daily-logs/${date}/hourly`,
    {
      method: 'GET',
      params
    }
  );
}

export async function rebuildModelUsageStats(data: RebuildStatsRequest) {
  return request(`${MODEL_USAGE_API}/rebuild-stats`, {
    method: 'POST',
    data
  });
}

export async function cleanupModelUsageData(data: CleanupUsageRequest) {
  return request(`${MODEL_USAGE_API}/cleanup`, {
    method: 'POST',
    params: data
  });
}

export function modelUsageCallsExportUrl(date: string, params: ModelUsageQuery) {
  const query = qs.stringify(params, { skipEmptyString: true, skipNull: true });
  return `/api/v1${MODEL_USAGE_API}/daily-logs/${date}/calls/export${query ? `?${query}` : ''}`;
}
