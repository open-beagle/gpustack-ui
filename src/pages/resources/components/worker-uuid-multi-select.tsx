import { useIntl } from '@umijs/max';
import { Button, Divider, Select } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { queryWorkersList } from '../apis';
import { mergeModelStoragePage } from '../config/model-preheat';
import type { ListItem } from '../config/types';
import ModelStorageAsyncState from './model-storage-async-state';

interface Props {
  value?: string[];
  onChange?: (value: string[]) => void;
  workers: ListItem[];
  disabled?: boolean;
}

const latestWorkers = (workers: ListItem[]) =>
  Array.from(
    workers
      .reduce((result, worker) => {
        const current = result.get(worker.worker_uuid);
        if (!current || current.id < worker.id)
          result.set(worker.worker_uuid, worker);
        return result;
      }, new Map<string, ListItem>())
      .values()
  );

const isEligible = (worker: ListItem) =>
  worker.state === 'ready' && worker.model_storage_protocol_version === 1;

const getIneligibleReason = (
  worker: ListItem,
  formatMessage: ReturnType<typeof useIntl>['formatMessage']
) => {
  if (worker.state !== 'ready') {
    return formatMessage({ id: `resources.preheat.state.${worker.state}` });
  }
  if (worker.model_storage_protocol_version === undefined) {
    return formatMessage({ id: 'resources.storage.workerProtocolMissing' });
  }
  if (worker.model_storage_protocol_version !== 1) {
    return formatMessage({
      id: 'resources.storage.workerProtocolIncompatible'
    });
  }
  return undefined;
};

const WorkerUuidMultiSelect: React.FC<Props> = ({
  value = [],
  onChange,
  workers,
  disabled
}) => {
  const intl = useIntl();
  const requestId = useRef(0);
  const [items, setItems] = useState<ListItem[]>(workers);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const allWorkers = useMemo(
    () => latestWorkers([...workers, ...items]),
    [items, workers]
  );

  const load = async (nextSearch: string, nextPage = 1, append = false) => {
    const id = ++requestId.current;
    setSearch(nextSearch);
    setLoading(true);
    setError(undefined);
    try {
      const result = await queryWorkersList({
        page: nextPage,
        perPage: 20,
        ...(nextSearch ? { search: nextSearch } : {})
      });
      if (id === requestId.current) {
        setItems((current) =>
          append
            ? mergeModelStoragePage(current, result.items, (item) => item.id)
            : result.items
        );
        setPage(nextPage);
        setTotal(result.pagination.total);
      }
    } catch (nextError) {
      if (id === requestId.current) setError(nextError);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    void load('');
    return () => {
      requestId.current += 1;
    };
  }, []);

  return (
    <ModelStorageAsyncState
      data={allWorkers}
      loading={loading}
      refreshing={loading && Boolean(allWorkers.length)}
      error={error}
      query={search}
      onRetry={() => void load(search)}
      compact
    >
      <Select
        mode="multiple"
        showSearch
        filterOption={false}
        value={value}
        disabled={disabled}
        loading={loading}
        onSearch={(nextSearch) => void load(nextSearch, 1)}
        onChange={(nextValue) => onChange?.(nextValue)}
        options={allWorkers.map((worker) => {
          const disabledReason = getIneligibleReason(
            worker,
            intl.formatMessage
          );
          return {
            value: worker.worker_uuid,
            disabled: Boolean(disabledReason),
            label: `${worker.name} · ${worker.state} · ${worker.ip || '-'} · ${(worker.status?.gpu_devices || []).map((gpu) => gpu.name).join(', ') || '-'}${disabledReason ? ` · ${disabledReason}` : ''}`
          };
        })}
        popupRender={(menu) => (
          <>
            {menu}
            {items.length < total && (
              <div
                onMouseDown={(event) => event.preventDefault()}
                style={{ padding: '0 12px 8px' }}
              >
                <Divider style={{ margin: '8px 0' }} />
                <Button
                  type="link"
                  block
                  loading={loading}
                  onClick={() => void load(search, page + 1, true)}
                >
                  {intl.formatMessage({ id: 'resources.storage.loadMore' })}
                </Button>
              </div>
            )}
          </>
        )}
      />
    </ModelStorageAsyncState>
  );
};

export const getEligibleWorkerUuidRecords = (workers: ListItem[]) =>
  latestWorkers(workers).filter(isEligible);

export default WorkerUuidMultiSelect;
