import {
  DeleteOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Button, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteModelPreheatPolicy,
  queryModelPreheatPolicies,
  reconcileModelPreheatPolicy,
  updateModelPreheatPolicy
} from '../apis';
import { LatestRequestGate } from '../config/model-preheat';
import type { ModelPreheatDistributionPolicy } from '../config/types';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';

type PolicyAction = 'enable' | 'disable' | 'reconcile' | 'delete';

const ModelPreheatPolicies: React.FC = () => {
  const intl = useIntl();
  const policyRequests = useRef(new LatestRequestGate());
  const [policies, setPolicies] = useState<ModelPreheatDistributionPolicy[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [confirm, setConfirm] = useState<{
    policy: ModelPreheatDistributionPolicy;
    action: PolicyAction;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    return policyRequests.current.run(
      () =>
        queryModelPreheatPolicies({
          page,
          perPage: pageSize
        }),
      (result) => {
        setPolicies(result.items);
        setTotal(result.pagination.total);
      },
      () => setLoading(false)
    );
  }, [page, pageSize]);

  useEffect(() => {
    void loadPolicies().catch(() => undefined);
  }, [loadPolicies]);

  useEffect(
    () => () => {
      policyRequests.current.invalidate();
    },
    []
  );

  const handleAction = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      if (confirm.action === 'delete') {
        await deleteModelPreheatPolicy(confirm.policy.id);
      } else if (confirm.action === 'reconcile') {
        await reconcileModelPreheatPolicy(confirm.policy.id);
      } else {
        await updateModelPreheatPolicy(confirm.policy.id, {
          enabled: confirm.action === 'enable'
        });
      }
      setConfirm(null);
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      await loadPolicies();
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      title: intl.formatMessage({ id: 'resources.preheat.policy.name' }),
      dataIndex: 'name',
      ellipsis: true
    },
    {
      title: intl.formatMessage({ id: 'common.table.status' }),
      dataIndex: 'enabled',
      width: 100,
      render: (value: boolean) => (
        <Tag color={value ? 'success' : 'default'}>
          {intl.formatMessage({
            id: value
              ? 'resources.preheat.state.enabled'
              : 'resources.preheat.state.disabled'
          })}
        </Tag>
      )
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.profile.title' }),
      dataIndex: 'profile_id',
      width: 100
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.profile.version' }),
      dataIndex: 'profile_config_version',
      width: 110
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.targetScope' }),
      dataIndex: 'target_scope',
      width: 150,
      render: (value: string) =>
        intl.formatMessage({ id: `resources.preheat.scope.${value}` })
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.policy.selector' }),
      key: 'selector',
      ellipsis: true,
      render: (_: unknown, record: ModelPreheatDistributionPolicy) => (
        <Typography.Text ellipsis style={{ maxWidth: 220 }}>
          {JSON.stringify({
            worker: record.worker_selector,
            gpu: record.gpu_selector
          })}
        </Typography.Text>
      )
    },
    {
      title: intl.formatMessage({
        id: 'resources.preheat.policy.lastReconciled'
      }),
      dataIndex: 'last_reconciled_at',
      width: 170,
      render: (value: string | null) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: intl.formatMessage({ id: 'common.table.operation' }),
      key: 'operation',
      width: 140,
      render: (_: unknown, policy: ModelPreheatDistributionPolicy) => (
        <Space size={4}>
          <Tooltip
            title={intl.formatMessage({
              id: policy.enabled
                ? 'resources.preheat.policy.disable'
                : 'resources.preheat.policy.enable'
            })}
          >
            <Button
              type="text"
              icon={
                policy.enabled ? (
                  <PauseCircleOutlined />
                ) : (
                  <PlayCircleOutlined />
                )
              }
              onClick={() =>
                setConfirm({
                  policy,
                  action: policy.enabled ? 'disable' : 'enable'
                })
              }
            />
          </Tooltip>
          <Tooltip
            title={intl.formatMessage({
              id: 'resources.preheat.policy.reconcile'
            })}
          >
            <Button
              type="text"
              icon={<SyncOutlined />}
              disabled={!policy.enabled}
              onClick={() => setConfirm({ policy, action: 'reconcile' })}
            />
          </Tooltip>
          <Tooltip title={intl.formatMessage({ id: 'common.button.delete' })}>
            <Button
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => setConfirm({ policy, action: 'delete' })}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <>
      <Button
        icon={<ReloadOutlined />}
        onClick={loadPolicies}
        loading={loading}
        style={{ marginBottom: 16 }}
      >
        {intl.formatMessage({ id: 'common.button.refresh' })}
      </Button>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={policies}
        loading={loading}
        scroll={{ x: 1050 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (nextPage, nextPageSize) => {
            policyRequests.current.invalidate();
            setPage(nextPageSize === pageSize ? nextPage : 1);
            setPageSize(nextPageSize);
          }
        }}
      />
      <ModelPreheatConfirmModal
        open={Boolean(confirm)}
        title={intl.formatMessage({
          id: `resources.preheat.policy.${confirm?.action || 'disable'}Confirm`
        })}
        content={intl.formatMessage(
          { id: 'resources.preheat.policy.actionContent' },
          { name: confirm?.policy.name || '' }
        )}
        okText={intl.formatMessage({
          id:
            confirm?.action === 'delete'
              ? 'common.button.delete'
              : `resources.preheat.policy.${confirm?.action || 'disable'}`
        })}
        danger={confirm?.action === 'delete'}
        loading={actionLoading}
        onOk={handleAction}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
};

export default ModelPreheatPolicies;
