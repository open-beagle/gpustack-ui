import { useIntl } from '@umijs/max';
import { Empty, Tabs } from 'antd';
import React from 'react';
import ModelPreheatTasks from './model-preheat-tasks';
import ModelStorageSyncTasks from './model-storage-sync-tasks';

/** 三类执行记录共用一个一级页面，保留同一筛选上下文。 */
const ModelTaskRecords: React.FC = () => {
  const intl = useIntl();
  return (
    <Tabs
      items={[
        {
          key: 'sync',
          label: intl.formatMessage({ id: 'resources.storage.syncTasks' }),
          children: <ModelStorageSyncTasks />
        },
        {
          key: 'preheat',
          label: intl.formatMessage({ id: 'resources.storage.preheatTasks' }),
          children: <ModelPreheatTasks />
        },
        {
          key: 'distribution',
          label: intl.formatMessage({ id: 'resources.storage.distributionTasks' }),
          children: (
            <Empty
              description={intl.formatMessage({
                id: 'resources.storage.distributionTasks.unavailable'
              })}
            />
          )
        }
      ]}
    />
  );
};

export default ModelTaskRecords;
