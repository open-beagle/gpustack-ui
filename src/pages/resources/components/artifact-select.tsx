import { Button, Select } from 'antd';
import dayjs from 'dayjs';
import { useIntl } from '@umijs/max';
import React, { useEffect, useRef, useState } from 'react';
import { queryModelStorageArtifacts } from '../apis';
import { getModelStorageRevisionPresentation, getModelStorageSourceLabel, mergeModelStoragePage } from '../config/model-preheat';
import type { ModelStorageArtifact } from '../config/types';
import ModelStorageAsyncState from './model-storage-async-state';

interface Props {
  profileId?: number;
  profileName?: string;
  value?: string;
  onChange?: (value: string | undefined, artifact?: ModelStorageArtifact) => void;
  onArtifactChange?: (artifact?: ModelStorageArtifact) => void;
  disabled?: boolean;
  disabledReason?: string;
}

const ArtifactSelect: React.FC<Props> = ({ profileId, profileName, value, onChange, onArtifactChange, disabled, disabledReason }) => {
  const intl = useIntl();
  const requestId = useRef(0);
  const [items, setItems] = useState<ModelStorageArtifact[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const effectiveDisabledReason = disabled
    ? disabledReason
    : !profileId
      ? 'resources.storage.artifact.profileRequired'
      : undefined;
  const load = async (nextSearch: string, nextPage = 1, append = false) => {
    if (!profileId) return;
    const id = ++requestId.current;
    setSearch(nextSearch);
    setLoading(true);
    setError(undefined);
    try {
      const result = await queryModelStorageArtifacts(profileId, { page: nextPage, perPage: 20, ...(nextSearch ? { search: nextSearch } : {}) });
      if (id === requestId.current) {
        setItems((current) => append ? mergeModelStoragePage(current, result.items, (item) => item.artifact_id) : result.items);
        setPage(nextPage);
        setTotal(result.pagination.total);
      }
    } catch (nextError) {
      if (id === requestId.current) setError(nextError);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };
  useEffect(() => { requestId.current += 1; setItems([]); setSearch(''); setPage(1); setTotal(0); setError(undefined); }, [profileId]);
  return <ModelStorageAsyncState data={items} loading={loading} refreshing={loading && Boolean(items.length)} error={error} hasFilters={Boolean(search)} disabledReason={effectiveDisabledReason} onRetry={() => void load(search)}>
    <Select showSearch allowClear filterOption={false} value={value} disabled={disabled || !profileId} onSearch={(nextSearch) => void load(nextSearch, 1)} onChange={(nextValue) => { const artifact = items.find((item) => item.artifact_id === nextValue); onChange?.(nextValue, artifact); onArtifactChange?.(artifact); }} options={items.map((item) => ({ value: item.artifact_id, disabled: item.manifest_state !== 'valid', label: `${getModelStorageSourceLabel(item.source)} · ${item.model_id} · ${getModelStorageRevisionPresentation(item.resolved_revision).short} · ${profileName || profileId} · ${item.last_verified_at ? dayjs(item.last_verified_at).format('YYYY-MM-DD HH:mm') : '-'}` }))} />
    {items.length < total && <Button type="link" loading={loading} onMouseDown={(event) => event.preventDefault()} onClick={() => void load(search, page + 1, true)}>{intl.formatMessage({ id: 'resources.storage.loadMore' })}</Button>}
  </ModelStorageAsyncState>;
};

export default ArtifactSelect;
