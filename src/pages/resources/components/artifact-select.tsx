import { useIntl } from '@umijs/max';
import { Button, Divider, Select } from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { queryModelStorageArtifacts } from '../apis';
import {
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
  onSelectionChange?: (selection: ArtifactSelectionState) => void;
  onArtifactChange?: (artifact?: ModelStorageArtifact) => void;
  onValidityChange?: (validity: ArtifactValidity) => void;
  disabled?: boolean;
  disabledReason?: string;
}

export type ArtifactValidity = 'resolving' | 'valid' | 'unresolved';

export interface ArtifactSelectionState {
  status: ArtifactValidity;
  artifact?: ModelStorageArtifact;
}

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
      /(?:^|[^A-Z0-9])((?:I?Q\d|BF16|F16|F32)(?:_[A-Z0-9]+)*)/i
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
  const firstGgufFile = ggufPatterns[0]?.split('/').pop();
  const compactGgufHint = !ggufPatterns.length
    ? undefined
    : uniqueQuantizations.length
      ? `GGUF ${uniqueQuantizations.join('/')}`
      : firstGgufFile
        ? `GGUF ${
            firstGgufFile.length > 28
              ? `${firstGgufFile.slice(0, 25)}...`
              : firstGgufFile
          }`
        : 'GGUF';
  return { include, exclude, ggufHint, compactGgufHint };
};

const compactRevision = (revision?: string | null) => {
  if (!revision) return undefined;
  if (/^local-snapshot(?:-|:|\/)/i.test(revision)) return undefined;
  if (/^[a-f0-9]{24,}$/i.test(revision)) return undefined;
  return revision.length > 24
    ? `${revision.slice(0, 15)}...${revision.slice(-6)}`
    : revision;
};

const ArtifactSelect: React.FC<Props> = ({
  profileId,
  profileName,
  value,
  onChange,
  onSelectionChange,
  onArtifactChange,
  onValidityChange,
  disabled,
  disabledReason
}) => {
  const intl = useIntl();
  const requestId = useRef(0);
  const validationRequestId = useRef(0);
  const validatedIdentity = useRef<string>();
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onArtifactChangeRef = useRef(onArtifactChange);
  const onValidityChangeRef = useRef(onValidityChange);
  const selectionRef = useRef<ArtifactSelectionState>({
    status: 'unresolved'
  });
  const [selection, setSelection] = useState<ArtifactSelectionState>(
    selectionRef.current
  );
  const [items, setItems] = useState<ModelStorageArtifact[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<unknown>();
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);
  useEffect(() => {
    onArtifactChangeRef.current = onArtifactChange;
  }, [onArtifactChange]);
  useEffect(() => {
    onValidityChangeRef.current = onValidityChange;
  }, [onValidityChange]);
  const publishSelection = useCallback((next: ArtifactSelectionState) => {
    selectionRef.current = next;
    setSelection(next);
    onSelectionChangeRef.current?.(next);
    onArtifactChangeRef.current?.(next.artifact);
    onValidityChangeRef.current?.(next.status);
  }, []);
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
        setItems((current) => {
          const loaded =
            append || preserveCurrent
              ? mergeModelStoragePage(
                  current,
                  result.items,
                  (item) => item.artifact_id
                )
              : result.items;
          return selectionRef.current.artifact
            ? mergeModelStoragePage(
                loaded,
                [selectionRef.current.artifact],
                (item) => item.artifact_id
              )
            : loaded;
        });
        setPage(nextPage);
        setTotalPage(result.pagination.totalPage);
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
    setTotalPage(1);
    setError(undefined);
    setLoading(false);
    setResolving(false);
    publishSelection({ status: 'unresolved' });
    if (profileId) void load('', 1, false, true);
    return () => {
      requestId.current += 1;
    };
  }, [profileId, publishSelection]);
  useEffect(() => {
    if (!profileId || !value) {
      validationRequestId.current += 1;
      validatedIdentity.current = undefined;
      setResolving(false);
      publishSelection({ status: 'unresolved' });
      return;
    }
    const identity = `${profileId}:${value}`;
    if (
      validatedIdentity.current === identity &&
      selectionRef.current.artifact?.artifact_id === value
    ) {
      publishSelection(selectionRef.current);
      return;
    }
    const candidate = value;
    const validationId = ++validationRequestId.current;
    setResolving(true);
    publishSelection({ status: 'resolving' });
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
          publishSelection({ status: 'valid', artifact });
          return;
        }
        totalPage = result.pagination.totalPage;
        nextPage += 1;
      }
      publishSelection({ status: 'unresolved' });
    };
    void resolveCandidate()
      .catch((nextError) => {
        if (validationId === validationRequestId.current) {
          setError(nextError);
          publishSelection({ status: 'unresolved' });
        }
      })
      .finally(() => {
        if (validationId === validationRequestId.current) setResolving(false);
      });
    return () => {
      validationRequestId.current += 1;
    };
  }, [profileId, publishSelection, value]);
  const options = items.map((item) => {
    const requestPresentation = getArtifactRequestPresentation(item, (id) =>
      intl.formatMessage({ id })
    );
    const source = getModelStorageSourceLabel(item.source);
    const revision = item.resolved_revision || '-';
    const compactHint =
      item.include_patterns.length || item.exclude_patterns.length
        ? intl.formatMessage(
            { id: 'resources.storage.artifact.filterSummary' },
            {
              include: item.include_patterns.length,
              exclude: item.exclude_patterns.length
            }
          )
        : undefined;
    const secondary = [
      requestPresentation.compactGgufHint || compactRevision(revision),
      requestPresentation.compactGgufHint ? undefined : compactHint
    ]
      .filter(Boolean)
      .join(' · ');
    return {
      value: item.artifact_id,
      disabled: item.manifest_state !== 'valid',
      label: (
        <div
          title={[
            requestPresentation.include,
            requestPresentation.exclude,
            requestPresentation.ggufHint,
            `${intl.formatMessage({ id: 'resources.preheat.revision' })} · ${revision}`,
            `Artifact · ${item.artifact_id}`,
            intl.formatMessage({
              id: 'resources.storage.artifact.fixedDistributionHint'
            }),
            `${profileName || profileId} · ${
              item.last_verified_at
                ? dayjs(item.last_verified_at).format('YYYY-MM-DD HH:mm')
                : '-'
            }`
          ]
            .filter(Boolean)
            .join('\n')}
          className="model-storage-artifact-option"
          style={{
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {source} · {item.model_id}
          </div>
          <div
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {secondary}
          </div>
        </div>
      ),
      selectionLabel: [source, item.model_id].filter(Boolean).join(' · ')
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
          const artifact = items.find(
            (item) =>
              item.artifact_id === nextValue && item.manifest_state === 'valid'
          );
          validationRequestId.current += 1;
          setResolving(false);
          validatedIdentity.current = artifact
            ? `${profileId}:${nextValue}`
            : undefined;
          publishSelection(
            artifact ? { status: 'valid', artifact } : { status: 'unresolved' }
          );
          onChange?.(nextValue, artifact);
        }}
        options={options}
        popupRender={(menu) => (
          <>
            {menu}
            {page < totalPage && (
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
