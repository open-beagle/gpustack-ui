import { Button, Select } from 'antd';
import { useIntl } from '@umijs/max';
import React, { useRef, useState } from 'react';
import { queryWorkersList } from '../apis';
import type { ListItem } from '../config/types';
import { mergeModelStoragePage } from '../config/model-preheat';
import ModelStorageAsyncState from './model-storage-async-state';

interface Props {
  value?: number;
  onChange: (value: number | undefined, worker?: ListItem) => void;
  disabled?: boolean;
  disabledReason?: string;
}

const WorkerFuzzySelect: React.FC<Props> = ({
  value,
  onChange,
  disabled,
  disabledReason
}) => {
  const intl = useIntl();
  const requestId = useRef(0);
  const [items, setItems] = useState<ListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

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

  return (
    <ModelStorageAsyncState
      data={items}
      loading={loading}
      refreshing={loading && Boolean(items.length)}
      error={error}
      query={search}
      disabledReason={disabled ? disabledReason : undefined}
      onRetry={() => void load(search)}
    >
      <Select
        showSearch
        allowClear
        filterOption={false}
        value={value}
        disabled={disabled}
        onSearch={(nextSearch) => void load(nextSearch, 1)}
        onChange={(nextValue) =>
          onChange(nextValue, items.find((item) => item.id === nextValue))
        }
        options={items.map((worker) => ({
          value: worker.id,
          label: `${worker.name} · ${worker.state} · ${worker.ip || '-'} · ${(worker.status?.gpu_devices || []).map((gpu) => gpu.name).join(', ') || '-'}`
        }))}
      />
      {items.length < total && (
        <Button
          type="link"
          loading={loading}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => void load(search, page + 1, true)}
        >
          {intl.formatMessage({ id: 'resources.storage.loadMore' })}
        </Button>
      )}
    </ModelStorageAsyncState>
  );
};

export default WorkerFuzzySelect;
