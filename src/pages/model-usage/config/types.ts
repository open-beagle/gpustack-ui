export type ModelUsageStatus = 'success' | 'failure';

export type ModelUsageOperation =
  | 'completion'
  | 'chat_completion'
  | 'embedding'
  | 'rerank'
  | 'image_generation'
  | 'audio_speech'
  | 'audit_transcription';

export interface ModelUsageQuery {
  start_at?: string;
  end_at?: string;
  api_key?: string;
  model?: string;
  source_ip?: string;
  operation?: ModelUsageOperation;
  status?: ModelUsageStatus;
  worker_id?: number;
  page?: number;
  page_size?: number;
}

export interface RebuildStatsRequest {
  start_date?: string;
  end_date?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ModelUsageOverview {
  total_requests: number;
  success_requests: number;
  failure_requests: number;
  success_rate: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  api_key_count: number;
  model_count: number;
  source_ip_count: number;
  avg_duration_ms: number;
  avg_vram_usage_rate?: number | null;
}

export interface ServerSummaryRow {
  worker_id?: number | null;
  worker_name?: string | null;
  worker_ip?: string | null;
  gpu_model?: string | null;
  gpu_count?: number | null;
  gpu_memory_bytes?: number | null;
  avg_gpu_usage_rate?: number | null;
  avg_vram_usage_rate?: number | null;
  allocated_vram_bytes?: number | null;
  total_tokens?: number | null;
  remain_resource?: string | null;
}

export interface ModelUsageAggregateRow {
  request_count: number;
  success_count: number;
  failure_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  api_key_count?: number;
  model_count?: number;
  source_ip_count?: number;
  last_call_time?: string | null;
}

export interface ApiKeyUsageRow extends ModelUsageAggregateRow {
  api_key_id?: number | null;
  api_key_name?: string | null;
  api_key_access_key?: string | null;
}

export interface ModelUsageRow extends ModelUsageAggregateRow {
  model_id?: number | null;
  model_name?: string | null;
  worker_id?: number | null;
  worker_name?: string | null;
  replicas?: number;
}

export interface SourceIpUsageRow extends ModelUsageAggregateRow {
  source_ip?: string | null;
}

export interface DailyLogRow extends ModelUsageAggregateRow {
  date: string;
}

export interface HourlyLogRow extends ModelUsageAggregateRow {
  hour: number;
}

export interface ModelUsageCallRow {
  request_id?: string | null;
  call_time?: string | null;
  api_key_id?: number | null;
  api_key_name?: string | null;
  api_key_access_key?: string | null;
  user_id?: number | null;
  username?: string | null;
  model_id?: number | null;
  model_name?: string | null;
  operation?: string | null;
  source_ip?: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  usage_available: boolean;
  status_code?: number | null;
  success: boolean;
  duration_ms?: number | null;
  ttft_ms?: number | null;
  tokens_per_second?: number | null;
  worker_id?: number | null;
  worker_name?: string | null;
  worker_ip?: string | null;
  model_instance_id?: number | null;
  error_code?: string | null;
  error_type?: string | null;
  error_message?: string | null;
}
