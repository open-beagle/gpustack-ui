import { useIntl, useLocation, useNavigate } from '@umijs/max';
import { Tabs } from 'antd';
import React from 'react';
import { taskRecordTabFromSearch } from '../config/model-policy';
import ModelDistributionPolicyRuns from './model-distribution-policy-runs';
import ModelPreheatTasks from './model-preheat-tasks';
import ModelStorageSyncTasks from './model-storage-sync-tasks';

/** 三类执行记录共用一个一级页面，保留同一筛选上下文。 */
const ModelTaskRecords: React.FC = () => {
  const intl = useIntl();
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <Tabs
      activeKey={taskRecordTabFromSearch(location.search)}
      onChange={(key) => {
        const search = new URLSearchParams(location.search);
        search.set('tab', 'tasks');
        search.set('task_tab', key);
        navigate(`${location.pathname}?${search.toString()}`, {
          replace: true
        });
      }}
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
          label: intl.formatMessage({
            id: 'resources.storage.distributionTasks'
          }),
          children: <ModelDistributionPolicyRuns />
        }
      ]}
    />
  );
};

export default ModelTaskRecords;
