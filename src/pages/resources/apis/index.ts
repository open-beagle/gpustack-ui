import { request } from '@umijs/max';
import {
  GPUDeviceItem,
  ListItem,
  ModelCacheItem,
  ModelCacheTask,
  ModelFile
} from '../config/types';

export const WORKERS_API = '/workers';
export const GPU_DEVICES_API = '/gpu-devices';
export const MODEL_FILES_API = '/model-files';
export const MODEL_CACHE_API = '/model-cache';
export const MODEL_CACHE_TASKS_API = '/model-cache-tasks';

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

export async function queryModelCacheTasks(params?: Global.SearchParams) {
  return request<Global.PageResponse<ModelCacheTask>>(MODEL_CACHE_TASKS_API, {
    method: 'GET',
    params
  });
}

export async function createModelCacheTask(
  modelFileId: number,
  modelId: string
) {
  return request<ModelCacheTask>(`${MODEL_FILES_API}/${modelFileId}/cache`, {
    method: 'POST',
    data: { model_id: modelId }
  });
}

export async function deleteModelCache(modelId: string) {
  return request(`${MODEL_CACHE_API}/${modelId}`, { method: 'DELETE' });
}

export async function deleteModelCacheTask(id: number) {
  return request(`${MODEL_CACHE_TASKS_API}/${id}`, { method: 'DELETE' });
}
