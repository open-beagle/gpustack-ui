import { Collapse, Input, Pagination, Select } from 'antd';
import { useIntl } from '@umijs/max';
import React, { useEffect, useRef, useState } from 'react';
import { queryHuggingfaceModels, queryModelScopeModels } from '../../llmodels/apis';
import ModelStorageAsyncState from './model-storage-async-state';

export type RepositorySource = 'model_scope' | 'huggingface' | 'ollama_library';
export interface RepositoryOption { id: string; label: string; revision?: string; }
export interface RepositorySearchResult { items: RepositoryOption[]; total: number; }
export type RepositorySearch = (args: { query: string; page: number; perPage: number; signal: AbortSignal }) => Promise<RepositorySearchResult>;

interface Props {
  source: RepositorySource;
  value?: string;
  onChange: (value: string | undefined, option?: RepositoryOption) => void;
  ollamaHistory?: string[];
  searchers?: Partial<Record<'modelscope' | 'huggingface', RepositorySearch>>;
  disabled?: boolean;
  disabledReason?: string;
  ariaLabel?: string;
  id?: string;
}

const defaultModelscopeSearch: RepositorySearch = async ({ query, page, perPage, signal }) => {
  const data = await queryModelScopeModels({ Name: query, PageNumber: page, PageSize: perPage }, { signal });
  const models = data?.Data?.Model?.Models || [];
  return { items: models.map((item: any) => ({ id: `${item.Path}/${item.Name}`, label: `${item.Path}/${item.Name}`, revision: item.Revision })), total: data?.Data?.Model?.TotalCount || 0 };
};
const defaultHuggingfaceSearch: RepositorySearch = async ({ query, page, perPage, signal }) => {
  const models = await queryHuggingfaceModels({ search: { query, tags: [] } }, { signal, limit: page * perPage });
  const items = models.slice((page - 1) * perPage, page * perPage).map((item: any) => ({ id: item.name || item.id, label: item.name || item.id, revision: item.sha }));
  return { items, total: items.length === perPage ? page * perPage + 1 : (page - 1) * perPage + items.length };
};

const ModelRepositoryPicker: React.FC<Props> = ({ source, value, onChange, ollamaHistory = [], searchers = {}, disabled, disabledReason, ariaLabel, id }) => {
  const intl = useIntl();
  const message = (id: string) => intl.formatMessage({ id });
  const controller = useRef<AbortController>();
  const generation = useRef(0);
  const sourceRef = useRef(source);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<RepositoryOption[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>();
  sourceRef.current = source;
  const remote = source === 'model_scope' ? searchers.modelscope || defaultModelscopeSearch : source === 'huggingface' ? searchers.huggingface || defaultHuggingfaceSearch : undefined;
  const load = async (nextQuery = query, nextPage = page) => {
    if (!remote) return;
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    const id = ++generation.current;
    const requestSource = source;
    setLoading(true);
    setError(undefined);
    try {
      const result = await remote({ query: nextQuery, page: nextPage, perPage: 20, signal: nextController.signal });
      if (id === generation.current && sourceRef.current === requestSource) { setItems(result.items); setTotal(result.total); }
    } catch (nextError) {
      if (id === generation.current && sourceRef.current === requestSource && (nextError as Error).name !== 'AbortError') setError(nextError);
    } finally { if (id === generation.current && sourceRef.current === requestSource) setLoading(false); }
  };
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    sourceRef.current = source;
    controller.current?.abort();
    generation.current += 1;
    setItems([]);
    setPage(1);
    setTotal(0);
    setQuery('');
    setError(undefined);
    setLoading(false);
  }, [source]);
  const historyItems = ollamaHistory.filter((item) => item.toLowerCase().includes(query.toLowerCase())).map((item) => ({ id: item, label: item }));
  const options = remote ? items : historyItems;
  return <ModelStorageAsyncState data={options} loading={loading} refreshing={loading && Boolean(options.length)} error={error} query={query} disabledReason={disabled ? disabledReason : undefined} onRetry={() => void load()}>
    <Select id={id} aria-label={ariaLabel} showSearch allowClear filterOption={false} value={value} disabled={disabled} loading={loading} onSearch={(nextQuery) => { setQuery(nextQuery); setPage(1); if (nextQuery) onChange(nextQuery, { id: nextQuery, label: nextQuery }); if (remote) void load(nextQuery, 1); }} onChange={(nextValue) => onChange(nextValue, options.find((item) => item.id === nextValue))} options={options.map((item) => ({ value: item.id, label: item.label }))} />
    {source === 'ollama_library' && <Collapse size="small" items={[{ key: 'exact', label: message('resources.storage.repository.advanced'), children: <Input aria-label={message('resources.storage.repository.exactInput')} placeholder={message('resources.storage.repository.exactInput')} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value || undefined, event.target.value ? { id: event.target.value, label: event.target.value } : undefined)} /> }]} />}
    {remote && total > 20 && <Pagination size="small" current={page} pageSize={20} total={total} onChange={(nextPage) => { setPage(nextPage); void load(query, nextPage); }} />}
  </ModelStorageAsyncState>;
};

export default ModelRepositoryPicker;
