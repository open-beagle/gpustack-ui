export const getEditScheduleType = (gpuSelector?: { gpu_ids?: string[] }) =>
  gpuSelector?.gpu_ids?.length ? 'manual' : 'auto';
