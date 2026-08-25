import { useIntl } from '@umijs/max';
import { Alert, Empty, Spin } from 'antd';
import React from 'react';

interface Props<T> {
  children: React.ReactNode;
  data: T[];
  error?: unknown;
  loading: boolean;
  refreshing: boolean;
  hasFilters?: boolean;
  query?: string;
  disabledReason?: string;
  onRetry?: () => void;
  compact?: boolean;
}

/** 共享异步状态壳：刷新时始终保留已加载内容。 */
const ModelStorageAsyncState = <T,>({
  children,
  data,
  error,
  loading,
  refreshing,
  hasFilters,
  query,
  disabledReason,
  onRetry,
  compact = false
}: Props<T>) => {
  const intl = useIntl();
  const message = (id: string) => intl.formatMessage({ id });
  const initialLoading = loading && !data.length;
  const isEmpty = !loading && !error && !data.length;
  return (
    <div aria-busy={refreshing}>
      {disabledReason && (
        <Alert type="warning" showIcon message={message(disabledReason)} />
      )}
      {initialLoading && !compact && (
        <>
          <Spin spinning />
          <span>{message('resources.storage.state.loading')}</span>
        </>
      )}
      {refreshing && (
        <span>{message('resources.storage.state.refreshing')}</span>
      )}
      {Boolean(error) && (
        <Alert
          type="error"
          showIcon
          message={message('resources.storage.state.error')}
          action={
            onRetry ? (
              <button type="button" onClick={onRetry}>
                {message('resources.storage.retry')}
              </button>
            ) : undefined
          }
        />
      )}
      {isEmpty && !compact && (
        <Empty
          description={message(
            hasFilters || Boolean(query)
              ? 'resources.storage.state.noMatch'
              : 'resources.storage.state.empty'
          )}
        />
      )}
      {children}
    </div>
  );
};

export default ModelStorageAsyncState;
