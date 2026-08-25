import { useIntl } from '@umijs/max';
import { Button, Divider, Select } from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
import { queryModelStorageArtifacts } from '../apis';
import {
  getModelStorageRevisionPresentation,
  getModelStorageSourceLabel,
  mergeModelStoragePage
} from '../config/model-preheat';
import type { ModelStorageArtifact } from '../config/types';
import ModelStorageAsyncState from './model-storage-async-state';

interface Props {
  profileId?: number;
  profileName?: string;
  value?: string;
  onChange?: (
    value: string | undefined,
    artifact?: ModelStorageArtifact
  ) => void;
  onArtifactChange?: (artifact?: ModelStorageArtifact) => void;
  onValidityChange?: (validity: ArtifactValidity) => void;
  disabled?: boolean;
  disabledReason?: string;
}

export type ArtifactValidity = 'resolving' | 'valid' | 'unresolved';

const getArtifactRequestPresentation = (
  artifact: ModelStorageArtifact,
  message: (id: string) => string
) => {
  const patterns = artifact.include_patterns || [];
  const excludes = artifact.exclude_patterns || [];
  const ggufPatterns = patterns.filter((pattern) => /\.gguf$/i.test(pattern));
  const quantizations = ggufPatterns.flatMap((pattern) => {
    const filename = pattern.split('/').pop() || pattern;
    const quantization = filename.match(
      /(?:^|[-_.])((?:I?Q\d|BF16|F16|F32)(?:_[A-Z0-9]+)*)/i
    )?.[1];
    return quantization ? [quantization.toUpperCase()] : [];
  });
  const uniqueQuantizations = Array.from(new Set(quantizations));
  const include = !patterns.length
    ? message('resources.storage.artifact.includeFilterNotSpecified')
    : `${message('resources.storage.artifact.includeFilterPattern')} · ${patterns.join(', ')}`;
  const exclude = excludes.length
    ? `${message('resources.storage.artifact.excludeFilterPattern')} · ${excludes.join(', ')}`
    : message('resources.storage.artifact.excludeFilterNotSpecified');
  const ggufHint = !ggufPatterns.length
    ? undefined
    : ggufPatterns.some((pattern) => /[*?\[]/.test(pattern))
      ? `${message('resources.storage.artifact.ggufFilterPattern')} · ${ggufPatterns.join(', ')}`
      : uniqueQuantizations.length
        ? `${message('resources.storage.artifact.requestedQuantizationHint')} · ${uniqueQuantizations.join(', ')}`
        : `${message('resources.storage.artifact.ggufFilterPattern')} · ${ggufPatterns.join(', ')}`;
  return { include, exclude, ggufHint };
};

const ArtifactSelect: React.FC<Props> = ({
  profileId,
  profileName,
  value,
  onChange,
  onArtifactChange,
  onValidityChange,
  disabled,
  disabledReason
}) => {
  const intl = useIntl();
  const requestId = useRef(0);
  const validationRequestId = useRef(0);
  const validatedIdentity = useRef<string>();
  const onArtifactChangeRef = useRef(onArtifactChange);
  const onValidityChangeRef = useRef(onValidityChange);
  const [items, setItems] = useState<ModelStorageArtifact[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<unknown>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    onArtifactChangeRef.current = onArtifactChange;
  }, [onArtifactChange]);
  useEffect(() => {
    onValidityChangeRef.current = onValidityChange;
  }, [onValidityChange]);
  const effectiveDisabledReason = disabled
    ? disabledReason
    : !profileId
      ? 'resources.storage.artifact.profileRequired'
      : undefined;
  const load = async (
    nextSearch: string,
    nextPage = 1,
    append = false,
    preserveCurrent = false
  ) => {
    if (!profileId) return;
    const id = ++requestId.current;
    setSearch(nextSearch);
    setLoading(true);
    setError(undefined);
    try {
      const result = await queryModelStorageArtifacts(profileId, {
        page: nextPage,
        perPage: 20,
        ...(nextSearch ? { search: nextSearch } : {})
      });
      if (id === requestId.current) {
        setItems((current) =>
          append || preserveCurrent
            ? mergeModelStoragePage(
                current,
                result.items,
                (item) => item.artifact_id
              )
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
    requestId.current += 1;
    validationRequestId.current += 1;
    validatedIdentity.current = undefined;
    setItems([]);
    setSearch('');
    setPage(1);
    setTotal(0);
    setError(undefined);
    setLoading(false);
    setResolving(false);
    if (profileId) void load('', 1, false, true);
    return () => {
      requestId.current += 1;
    };
  }, [profileId]);
  useEffect(() => {
    const artifact = items.find(
      (item) => item.artifact_id === value && item.manifest_state === 'valid'
    );
    onArtifactChangeRef.current?.(artifact);
  }, [items, value]);
  useEffect(() => {
    if (!profileId || !value) {
      validationRequestId.current += 1;
      validatedIdentity.current = undefined;
      setResolving(false);
      onValidityChangeRef.current?.('unresolved');
      return;
    }
    const identity = `${profileId}:${value}`;
    if (validatedIdentity.current === identity) {
      onValidityChangeRef.current?.('valid');
      return;
    }
    const candidate = value;
    const validationId = ++validationRequestId.current;
    setResolving(true);
    onValidityChangeRef.current?.('resolving');
    const resolveCandidate = async () => {
      let nextPage = 1;
      let totalPage = 1;
      while (nextPage <= totalPage) {
        const result = await queryModelStorageArtifacts(profileId, {
          page: nextPage,
          perPage: 20
        });
        if (validationId !== validationRequestId.current) return;
        const artifact = result.items.find(
          (item) =>
            item.artifact_id === candidate && item.manifest_state === 'valid'
        );
        if (artifact) {
          validatedIdentity.current = identity;
          setItems((current) =>
            mergeModelStoragePage(
              current,
              [artifact],
              (item) => item.artifact_id
            )
          );
          onValidityChangeRef.current?.('valid');
          return;
        }
        totalPage = result.pagination.totalPage;
        nextPage += 1;
      }
      onValidityChangeRef.current?.('unresolved');
    };
    void resolveCandidate()
      .catch((nextError) => {
        if (validationId === validationRequestId.current) {
          setError(nextError);
          onValidityChangeRef.current?.('unresolved');
        }
      })
      .finally(() => {
        if (validationId === validationRequestId.current) setResolving(false);
      });
    return () => {
      validationRequestId.current += 1;
    };
  }, [profileId, value]);
  const options = items.map((item) => {
    const requestPresentation = getArtifactRequestPresentation(item, (id) =>
      intl.formatMessage({ id })
    );
    const source = getModelStorageSourceLabel(item.source);
    const revision = getModelStorageRevisionPresentation(
      item.resolved_revision
    ).short;
    return {
      value: item.artifact_id,
      disabled: item.manifest_state !== 'valid',
      label: (
        <div
          title={[
            requestPresentation.include,
            requestPresentation.exclude,
            requestPresentation.ggufHint
          ]
            .filter(Boolean)
            .join('\n')}
          style={{ minWidth: 0 }}
        >
          <div>
            {source} · {item.model_id}
          </div>
          <div
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {requestPresentation.include}
          </div>
          <div
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {requestPresentation.exclude}
          </div>
          {requestPresentation.ggufHint && (
            <div
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {requestPresentation.ggufHint}
            </div>
          )}
          <div>
            {intl.formatMessage({
              id: 'resources.storage.artifact.fixedDistributionHint'
            })}
          </div>
          <div>
            {revision} · {profileName || profileId} ·{' '}
            {item.last_verified_at
              ? dayjs(item.last_verified_at).format('YYYY-MM-DD HH:mm')
              : '-'}
          </div>
        </div>
      ),
      selectionLabel: `${source} · ${item.model_id}`
    };
  });
  if (value && !items.some((item) => item.artifact_id === value))
    options.unshift({
      value,
      disabled: true,
      label: <span>{value}</span>,
      selectionLabel: value
    });
  return (
    <ModelStorageAsyncState
      data={items}
      loading={loading || resolving}
      refreshing={(loading || resolving) && Boolean(items.length)}
      error={error}
      hasFilters={Boolean(search)}
      disabledReason={effectiveDisabledReason}
      onRetry={() => void load(search)}
      compact
    >
      <Select
        showSearch
        allowClear
        filterOption={false}
        optionLabelProp="selectionLabel"
        value={value}
        disabled={disabled || !profileId}
        loading={loading || resolving}
        onSearch={(nextSearch) => void load(nextSearch, 1)}
        onChange={(nextValue) => {
          const artifact = items.find((item) => item.artifact_id === nextValue);
          validationRequestId.current += 1;
          setResolving(false);
          validatedIdentity.current = nextValue
            ? `${profileId}:${nextValue}`
            : undefined;
          onValidityChange?.(artifact ? 'valid' : 'unresolved');
          onChange?.(nextValue, artifact);
        }}
        options={options}
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

export default ArtifactSelect;
