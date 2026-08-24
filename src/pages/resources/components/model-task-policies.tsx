import { useIntl, useLocation } from '@umijs/max';
import { Tabs } from 'antd';
import React, { useEffect, useState } from 'react';
import {
  taskPolicyTabFromSearch,
  type TaskPolicyTab
} from '../config/model-policy';
import ModelPreheatPolicies from './model-preheat-policies';
import ModelStorageSyncPolicies from './model-storage-sync-policies';

const ModelTaskPolicies: React.FC = () => {
  const intl = useIntl();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TaskPolicyTab>(() =>
    taskPolicyTabFromSearch(location.search)
  );

  useEffect(() => {
    if (taskPolicyTabFromSearch(location.search) === 'preheat-distribution') {
      setActiveTab('preheat-distribution');
    }
  }, [location.search]);

  return (
    <Tabs
      activeKey={activeTab}
      onChange={(key) => setActiveTab(key as TaskPolicyTab)}
      items={[
        {
          key: 'sync',
          label: intl.formatMessage({
            id: 'resources.storage.syncPolicy.tab'
          }),
          children: <ModelStorageSyncPolicies />
        },
        {
          key: 'preheat-distribution',
          label: intl.formatMessage({
            id: 'resources.storage.preheatDistributionPolicy.tab'
          }),
          children: <ModelPreheatPolicies />
        }
      ]}
    />
  );
};

export default ModelTaskPolicies;
