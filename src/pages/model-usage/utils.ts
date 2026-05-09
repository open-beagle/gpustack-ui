import dayjs from 'dayjs';
import { ModelUsageOperation, ModelUsageQuery } from './config/types';

export const DEFAULT_PAGE_SIZE = 10;

export const operationOptions: { label: string; value: ModelUsageOperation }[] = [
  { label: 'Chat Completion', value: 'chat_completion' },
  { label: 'Completion', value: 'completion' },
  { label: 'Embedding', value: 'embedding' },
  { label: 'Rerank', value: 'rerank' },
  { label: 'Image Generation', value: 'image_generation' },
  { label: 'Audio Speech', value: 'audio_speech' },
  { label: 'Audio Transcription', value: 'audit_transcription' }
];

export function defaultModelUsageQuery(): ModelUsageQuery {
  return {
    start_at: dayjs().subtract(29, 'days').startOf('day').toISOString(),
    end_at: dayjs().endOf('day').toISOString(),
    page: 1,
    page_size: DEFAULT_PAGE_SIZE
  };
}

export function todayForCalls() {
  return dayjs().format('YYYY-MM-DD');
}

export function formatNumber(value?: number | null) {
  return (value || 0).toLocaleString();
}

export function formatBytes(value?: number | null) {
  if (!value) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let nextValue = value;
  let unitIndex = 0;
  while (nextValue >= 1024 && unitIndex < units.length - 1) {
    nextValue /= 1024;
    unitIndex += 1;
  }
  return `${nextValue.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

export function formatRate(value?: number | null) {
  if (value === undefined || value === null) {
    return '-';
  }
  return `${Number(value).toFixed(2)}%`;
}

export function formatPercent(value?: number | null) {
  return `${(((value || 0) as number) * 100).toFixed(2)}%`;
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
}

export function compactQuery(query: ModelUsageQuery): ModelUsageQuery {
  const result: ModelUsageQuery = {};
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      (result as any)[key] = value;
    }
  });
  return result;
}
