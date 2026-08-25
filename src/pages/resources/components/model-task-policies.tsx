import { useIntl, useLocation, useNavigate } from '@umijs/max';
import { Tabs } from 'antd';
import React from 'react';
import {
  taskPolicyTabFromSearch,
  type TaskPolicyTab
} from '../config/model-policy';
import ModelPreheatPolicies from './model-preheat-policies';
import ModelStorageSyncPolicies from './model-storage-sync-policies';

const ModelTaskPolicies: React.FC = () => {
  const intl = useIntl();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = taskPolicyTabFromSearch(location.search);

  return (
    <Tabs
      activeKey={activeTab}
      onChange={(key) => {
        const search = new URLSearchParams(location.search);
        search.set('tab', 'policies');
        search.set('policy_tab', key as TaskPolicyTab);
        navigate(`${location.pathname}?${search.toString()}`, {
          replace: true
        });
      }}
      items={[
        {
          key: 'sync',
          label: intl.formatMessage({
            id: 'resources.storage.syncPolicy.tab'
          }),
          children: <ModelStorageSyncPolicies />
        },
        {
          key: 'preheat',
          label: intl.formatMessage({
            id: 'resources.storage.preheatPolicy.tab'
          }),
          children: <ModelPreheatPolicies mode="preheat" />
        },
        {
          key: 'distribution',
          label: intl.formatMessage({
            id: 'resources.storage.distributionPolicy.tab'
          }),
          children: <ModelPreheatPolicies mode="distribution" />
        }
      ]}
    />
  );
};

export default ModelTaskPolicies;
