import { useCallback, useEffect, useState } from 'react';
import { queryModelStorageCapabilities } from '../apis';

export type ModelPreheatCapabilityState =
  | 'loading'
  | 'enabled'
  | 'disabled'
  | 'error';

export function useModelPreheatCapability() {
  const [state, setState] = useState<ModelPreheatCapabilityState>('loading');

  const retry = useCallback(async () => {
    setState('loading');
    try {
      const capabilities = await queryModelStorageCapabilities();
      // 旧后端没有该字段时保持兼容；网络或响应失败仍然 fail-closed。
      setState(
        capabilities?.model_preheat_enabled === false ? 'disabled' : 'enabled'
      );
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void retry();
  }, [retry]);

  return { state, retry };
}
