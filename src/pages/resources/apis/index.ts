import { request } from '@umijs/max';
import {
  GPUDeviceItem,
  ListItem,
  ModelFile,
  ModelPreheatConnectivityCheck,
  ModelPreheatCreate,
  ModelPreheatDistributionPolicy,
  ModelPreheatDistributionPolicyCreate,
  ModelPreheatDistributionPolicyRun,
  ModelPreheatDistributionPolicyUpdate,
  ModelPreheatS3Profile,
  ModelPreheatS3ProfileWrite,
  ModelPreheatSchedule,
  ModelPreheatScheduleCreate,
  ModelPreheatScheduleRun,
  ModelPreheatTask,
  ModelStorageArtifact,
  ModelStorageCapabilities,
  ModelStorageConnectionTest,
  ModelStorageConnectionTestRequest,
  ModelStorageSyncBatchCreate,
  ModelStorageSyncBatchResult,
  ModelStorageSyncPolicy,
  ModelStorageSyncPolicyCreate,
  ModelStorageSyncPolicyRun,
  ModelStorageSyncTask,
  ModelStorageSyncTaskDetail
} from '../config/types';

export const WORKERS_API = '/workers';
export const GPU_DEVICES_API = '/gpu-devices';
export const MODEL_FILES_API = '/model-files';
export const MODEL_PREHEAT_S3_PROFILES_API = '/model-preheat-s3-profiles';
export const MODEL_STORAGE_API = '/model-storage';
export const MODEL_STORAGE_SYNC_TASKS_API = '/model-storage-sync-tasks';
export const MODEL_STORAGE_SYNC_POLICIES_API = '/model-storage-sync-policies';
export const MODEL_PREHEATS_API = '/model-preheats';
export const MODEL_PREHEAT_POLICIES_API =
  '/model-preheat-distribution-policies';
export const MODEL_PREHEAT_SCHEDULES_API = '/model-preheat-schedules';

export async function queryWorkersList(params: Global.SearchParams) {
  return request<Global.PageResponse<ListItem>>(`${WORKERS_API}`, {
    methos: 'GET',
    params
  });
}

export async function queryWorker(id: string | number) {
  return request<ListItem>(`${WORKERS_API}/${id}`, { method: 'GET' });
}

export async function queryGpuDevicesList(params: Global.SearchParams) {
  return request<Global.PageResponse<GPUDeviceItem>>(`${GPU_DEVICES_API}`, {
    methos: 'GET',
    params
  });
}

export async function queryGPUDeviceItem(id: string) {
  return request<GPUDeviceItem>(`${GPU_DEVICES_API}/${id}`, {
    methos: 'GET'
  });
}

export async function deleteWorker(id: string | number) {
  return request(`${WORKERS_API}/${id}`, {
    method: 'DELETE'
  });
}

export async function updateWorker(id: string | number, data: any) {
  return request(`${WORKERS_API}/${id}`, {
    method: 'PUT',
    data
  });
}

export async function queryModelFilesList(params: Global.SearchParams) {
  return request<Global.PageResponse<ModelFile>>(MODEL_FILES_API, {
    method: 'GET',
    params
  });
}

export async function deleteModelFile(
  id: string | number,
  params: { checked: boolean }
) {
  return request<Global.PageResponse<ModelFile>>(
    `${MODEL_FILES_API}/${id}?cleanup=${params.checked}`,
    {
      method: 'DELETE'
    }
  );
}

export async function updateModelFile(id: string | number, data: any) {
  return request<Global.PageResponse<ModelFile>>(`${MODEL_FILES_API}/${id}`, {
    method: 'PUT',
    data
  });
}

export async function downloadModelFile(data: any) {
  return request<Global.PageResponse<ModelFile>>(MODEL_FILES_API, {
    method: 'POST',
    data
  });
}

export async function retryDownloadModelFile(id: string | number) {
  return request<Global.PageResponse<ModelFile>>(
    `${MODEL_FILES_API}/${id}/reset`,
    {
      method: 'POST'
    }
  );
}

export async function queryModelPreheatS3Profiles(params: Global.SearchParams) {
  return request<Global.PageResponse<ModelPreheatS3Profile>>(
    MODEL_PREHEAT_S3_PROFILES_API,
    {
      method: 'GET',
      params
    }
  );
}

export async function queryModelPreheatS3Profile(id: number) {
  return request<ModelPreheatS3Profile>(
    `${MODEL_PREHEAT_S3_PROFILES_API}/${id}`,
    { method: 'GET' }
  );
}

export async function createModelPreheatS3Profile(
  data: ModelPreheatS3ProfileWrite
) {
  return request<ModelPreheatS3Profile>(MODEL_PREHEAT_S3_PROFILES_API, {
    method: 'POST',
    data
  });
}

export async function updateModelPreheatS3Profile(
  id: number,
  data: Partial<ModelPreheatS3ProfileWrite>
) {
  return request<ModelPreheatS3Profile>(
    `${MODEL_PREHEAT_S3_PROFILES_API}/${id}`,
    {
      method: 'PATCH',
      data
    }
  );
}

export async function deleteModelPreheatS3Profile(id: number) {
  return request<{ ok: boolean }>(`${MODEL_PREHEAT_S3_PROFILES_API}/${id}`, {
    method: 'DELETE'
  });
}

export async function queryModelStorageCapabilities() {
  return request<ModelStorageCapabilities>(
    `${MODEL_STORAGE_API}/capabilities`,
    {
      method: 'GET'
    }
  );
}

export async function testModelStorageConnection(
  data: ModelStorageConnectionTestRequest
) {
  return request<ModelStorageConnectionTest>(
    `${MODEL_STORAGE_API}/connection-tests`,
    { method: 'POST', data }
  );
}

export async function createModelStorageSyncTask(
  data: { model_file_id: number; profile_id: number },
  idempotencyKey: string
) {
  return request<ModelStorageSyncTask>(MODEL_STORAGE_SYNC_TASKS_API, {
    method: 'POST',
    data,
    headers: { 'Idempotency-Key': idempotencyKey }
  });
}

export async function createModelStorageSyncBatch(
  data: ModelStorageSyncBatchCreate,
  idempotencyKey: string
) {
  return request<ModelStorageSyncBatchResult>('/model-storage-sync-batches', {
    method: 'POST',
    data,
    headers: { 'Idempotency-Key': idempotencyKey }
  });
}

export async function queryModelStorageSyncTasks(params: Global.SearchParams) {
  return request<Global.PageResponse<ModelStorageSyncTask>>(
    MODEL_STORAGE_SYNC_TASKS_API,
    { method: 'GET', params }
  );
}

export async function queryModelStorageSyncTask(id: number) {
  return request<ModelStorageSyncTaskDetail>(
    `${MODEL_STORAGE_SYNC_TASKS_API}/${id}`,
    {
      method: 'GET'
    }
  );
}

export async function deleteModelStorageSyncTask(id: number) {
  return request(`${MODEL_STORAGE_SYNC_TASKS_API}/${id}`, { method: 'DELETE' });
}

export async function queryModelStorageSyncPolicies(
  params: Global.SearchParams
) {
  return request<Global.PageResponse<ModelStorageSyncPolicy>>(
    MODEL_STORAGE_SYNC_POLICIES_API,
    { method: 'GET', params }
  );
}

export async function createModelStorageSyncPolicy(
  data: ModelStorageSyncPolicyCreate
) {
  return request<ModelStorageSyncPolicy>(MODEL_STORAGE_SYNC_POLICIES_API, {
    method: 'POST',
    data
  });
}

export async function updateModelStorageSyncPolicy(
  id: number,
  data: Partial<ModelStorageSyncPolicyCreate>
) {
  return request<ModelStorageSyncPolicy>(
    `${MODEL_STORAGE_SYNC_POLICIES_API}/${id}`,
    {
      method: 'PATCH',
      data
    }
  );
}

export async function deleteModelStorageSyncPolicy(id: number) {
  return request<{ ok: boolean }>(`${MODEL_STORAGE_SYNC_POLICIES_API}/${id}`, {
    method: 'DELETE'
  });
}

export async function runModelStorageSyncPolicyNow(
  id: number,
  idempotencyKey: string
) {
  return request<ModelStorageSyncPolicyRun>(
    `${MODEL_STORAGE_SYNC_POLICIES_API}/${id}/run-now`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      skipErrorHandler: true
    }
  );
}

export async function queryModelStorageSyncPolicyRun(
  policyId: number,
  runId: number
) {
  return request<ModelStorageSyncPolicyRun>(
    `${MODEL_STORAGE_SYNC_POLICIES_API}/${policyId}/runs/${runId}`,
    { method: 'GET' }
  );
}

export interface ModelStorageArtifactListParams extends Global.SearchParams {
  source?: ModelStorageArtifact['source'];
  manifest_state?: string;
}

export async function queryModelStorageArtifacts(
  profileId: number,
  params: ModelStorageArtifactListParams = { page: 1, perPage: 100 },
  options?: { signal?: AbortSignal }
) {
  return request<Global.PageResponse<ModelStorageArtifact>>(
    `/model-storage-profiles/${profileId}/artifacts`,
    { method: 'GET', params, signal: options?.signal }
  );
}

export async function refreshModelStorageArtifacts(
  profileId: number,
  options?: { signal?: AbortSignal }
) {
  return request<{ job_id: number }>(
    `/model-storage-profiles/${profileId}/artifacts/refresh`,
    { method: 'POST', signal: options?.signal }
  );
}

export async function createModelPreheatConnectivityCheck(
  profileId: number,
  idempotencyKey: string
) {
  return request<ModelPreheatConnectivityCheck>(
    `${MODEL_PREHEAT_S3_PROFILES_API}/${profileId}/connectivity-checks`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey }
    }
  );
}

export async function queryModelPreheatConnectivityCheck(
  profileId: number,
  checkId: number
) {
  return request<ModelPreheatConnectivityCheck>(
    `${MODEL_PREHEAT_S3_PROFILES_API}/${profileId}/connectivity-checks/${checkId}`,
    { method: 'GET' }
  );
}

export async function queryModelPreheatTasks(params: Global.SearchParams) {
  return request<Global.PageResponse<ModelPreheatTask>>(MODEL_PREHEATS_API, {
    method: 'GET',
    params
  });
}

export async function queryModelPreheatTask(id: number) {
  return request<ModelPreheatTask>(`${MODEL_PREHEATS_API}/${id}`, {
    method: 'GET'
  });
}

export async function createModelPreheatTask(
  data: ModelPreheatCreate,
  idempotencyKey: string
) {
  return request<ModelPreheatTask>(MODEL_PREHEATS_API, {
    method: 'POST',
    data,
    headers: { 'Idempotency-Key': idempotencyKey }
  });
}

export async function runModelPreheatTaskAction(
  id: number,
  action: 'cancel' | 'pause' | 'resume' | 'retry'
) {
  return request<ModelPreheatTask>(`${MODEL_PREHEATS_API}/${id}/${action}`, {
    method: 'POST'
  });
}

export async function queryModelPreheatPolicies(params: Global.SearchParams) {
  return request<Global.PageResponse<ModelPreheatDistributionPolicy>>(
    MODEL_PREHEAT_POLICIES_API,
    { method: 'GET', params }
  );
}

export async function createModelPreheatPolicy(
  data: ModelPreheatDistributionPolicyCreate
) {
  return request<ModelPreheatDistributionPolicy>(MODEL_PREHEAT_POLICIES_API, {
    method: 'POST',
    data
  });
}

export async function updateModelPreheatPolicy(
  id: number,
  data: ModelPreheatDistributionPolicyUpdate
) {
  return request<ModelPreheatDistributionPolicy>(
    `${MODEL_PREHEAT_POLICIES_API}/${id}`,
    { method: 'PATCH', data }
  );
}

export async function queryModelPreheatPolicyRun(id: number) {
  return request<ModelPreheatDistributionPolicyRun>(
    `${MODEL_PREHEAT_POLICIES_API}/runs/${id}`,
    { method: 'GET' }
  );
}

export async function deleteModelPreheatPolicy(id: number) {
  return request<{ ok: boolean }>(`${MODEL_PREHEAT_POLICIES_API}/${id}`, {
    method: 'DELETE'
  });
}

export async function reconcileModelPreheatPolicy(id: number) {
  return request<ModelPreheatDistributionPolicy>(
    `${MODEL_PREHEAT_POLICIES_API}/${id}/reconcile`,
    { method: 'POST' }
  );
}

export async function queryModelPreheatSchedules(params: Global.SearchParams) {
  return request<Global.PageResponse<ModelPreheatSchedule>>(
    MODEL_PREHEAT_SCHEDULES_API,
    { method: 'GET', params }
  );
}

export async function createModelPreheatSchedule(
  data: ModelPreheatScheduleCreate
) {
  return request<ModelPreheatSchedule>(MODEL_PREHEAT_SCHEDULES_API, {
    method: 'POST',
    data
  });
}

export async function updateModelPreheatSchedule(
  id: number,
  data: Partial<ModelPreheatScheduleCreate> & { enabled?: boolean }
) {
  return request<ModelPreheatSchedule>(`${MODEL_PREHEAT_SCHEDULES_API}/${id}`, {
    method: 'PATCH',
    data
  });
}

export async function deleteModelPreheatSchedule(id: number) {
  return request<{ ok: boolean }>(`${MODEL_PREHEAT_SCHEDULES_API}/${id}`, {
    method: 'DELETE'
  });
}

export async function runModelPreheatScheduleNow(
  id: number,
  idempotencyKey: string
) {
  return request<ModelPreheatScheduleRun>(
    `${MODEL_PREHEAT_SCHEDULES_API}/${id}/run-now`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      skipErrorHandler: true
    }
  );
}

export async function queryModelPreheatScheduleRun(
  scheduleId: number,
  runId: number
) {
  return request<ModelPreheatScheduleRun>(
    `${MODEL_PREHEAT_SCHEDULES_API}/${scheduleId}/runs/${runId}`,
    { method: 'GET' }
  );
}
