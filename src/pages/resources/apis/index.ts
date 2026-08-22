import { request } from '@umijs/max';
import {
  GPUDeviceItem,
  ListItem,
  ModelCacheItem,
  ModelCachePreview,
  ModelCacheTask,
  ModelFile,
  ModelPreheatCachedModelsPage,
  ModelPreheatConnectivityCheck,
  ModelPreheatCreate,
  ModelPreheatDistributionPolicy,
  ModelPreheatInventoryJob,
  ModelPreheatS3Profile,
  ModelPreheatS3ProfileWrite,
  ModelPreheatTask,
  ModelStorageArtifact,
  ModelStorageCapabilities,
  ModelStorageConnectionTest,
  ModelStorageSyncTask
} from '../config/types';

export const WORKERS_API = '/workers';
export const GPU_DEVICES_API = '/gpu-devices';
export const MODEL_FILES_API = '/model-files';
export const MODEL_CACHE_API = '/model-cache';
export const MODEL_CACHE_TASKS_API = '/model-cache-tasks';
export const MODEL_PREHEAT_S3_PROFILES_API = '/model-preheat-s3-profiles';
export const MODEL_STORAGE_API = '/model-storage';
export const MODEL_STORAGE_SYNC_TASKS_API = '/model-storage-sync-tasks';
export const MODEL_PREHEATS_API = '/model-preheats';
export const MODEL_PREHEAT_POLICIES_API =
  '/model-preheat-distribution-policies';

export async function queryWorkersList(params: Global.SearchParams) {
  return request<Global.PageResponse<ListItem>>(`${WORKERS_API}`, {
    methos: 'GET',
    params
  });
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

export async function queryModelCache(params?: Record<string, any>) {
  return request<{ items: ModelCacheItem[] }>(MODEL_CACHE_API, {
    method: 'GET',
    params
  });
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
  return request<ModelStorageCapabilities>(`${MODEL_STORAGE_API}/capabilities`, {
    method: 'GET'
  });
}

export async function testModelStorageConnection(data: ModelPreheatS3ProfileWrite) {
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

export async function queryModelStorageSyncTasks(params: Global.SearchParams) {
  return request<Global.PageResponse<ModelStorageSyncTask>>(
    MODEL_STORAGE_SYNC_TASKS_API,
    { method: 'GET', params }
  );
}

export async function deleteModelStorageSyncTask(id: number) {
  return request(`${MODEL_STORAGE_SYNC_TASKS_API}/${id}`, { method: 'DELETE' });
}

export async function queryModelStorageArtifacts(profileId: number) {
  return request<ModelStorageArtifact[]>(
    `/model-storage-profiles/${profileId}/artifacts`,
    { method: 'GET' }
  );
}

export async function refreshModelStorageArtifacts(profileId: number) {
  return request<{ job_id: number }>(
    `/model-storage-profiles/${profileId}/artifacts/refresh`,
    { method: 'POST' }
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

export async function queryModelPreheatCachedModels(
  profileId: number,
  params: {
    limit: number;
    cursor?: string;
    manifest_state?: string;
    source?: string;
  }
) {
  return request<ModelPreheatCachedModelsPage>(
    `${MODEL_PREHEAT_S3_PROFILES_API}/${profileId}/cached-models`,
    { method: 'GET', params }
  );
}

export async function createModelPreheatInventoryJob(
  profileId: number,
  kind: 'refresh' | 'gc'
) {
  return request<ModelPreheatInventoryJob>(
    `${MODEL_PREHEAT_S3_PROFILES_API}/${profileId}/inventory-jobs`,
    { method: 'POST', params: { kind } }
  );
}

export async function queryModelPreheatInventoryJob(
  profileId: number,
  jobId: number
) {
  return request<ModelPreheatInventoryJob>(
    `${MODEL_PREHEAT_S3_PROFILES_API}/${profileId}/inventory-jobs/${jobId}`,
    { method: 'GET' }
  );
}

export async function queryModelPreheatTasks(params: Global.SearchParams) {
  return request<Global.PageResponse<ModelPreheatTask>>(MODEL_PREHEATS_API, {
    method: 'GET',
    params
  });
}

export async function queryModelCacheTasks(params?: Global.SearchParams) {
  return request<Global.PageResponse<ModelCacheTask>>(MODEL_CACHE_TASKS_API, {
    method: 'GET',
    params
  });
}

export async function previewModelCacheTask(modelFileId: number) {
  return request<ModelCachePreview>(`${MODEL_FILES_API}/${modelFileId}/cache`, {
    method: 'GET'
  });
}

export async function queryModelPreheatTask(id: number) {
  return request<ModelPreheatTask>(`${MODEL_PREHEATS_API}/${id}`, {
    method: 'GET'
  });
}

export async function createModelCacheTask(modelFileId: number) {
  return request<ModelCacheTask>(`${MODEL_FILES_API}/${modelFileId}/cache`, {
    method: 'POST'
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

export async function deleteModelCache(modelId: string) {
  return request(`${MODEL_CACHE_API}/${modelId}`, { method: 'DELETE' });
}

export async function deleteModelCacheTask(id: number) {
  return request(`${MODEL_CACHE_TASKS_API}/${id}`, { method: 'DELETE' });
}

export async function queryModelPreheatPolicies(params: Global.SearchParams) {
  return request<Global.PageResponse<ModelPreheatDistributionPolicy>>(
    MODEL_PREHEAT_POLICIES_API,
    { method: 'GET', params }
  );
}

export async function updateModelPreheatPolicy(
  id: number,
  data: { name?: string; enabled?: boolean }
) {
  return request<ModelPreheatDistributionPolicy>(
    `${MODEL_PREHEAT_POLICIES_API}/${id}`,
    { method: 'PATCH', data }
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
