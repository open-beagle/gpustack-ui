import {
  CloudSyncOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Button, Space, Table, Tag, Tooltip, message } from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  createModelPreheatConnectivityCheck,
  deleteModelPreheatS3Profile,
  queryModelPreheatConnectivityCheck,
  queryModelPreheatS3Profiles
} from '../apis';
import {
  IdempotencyKeyLifecycle,
  LatestRequestGate
} from '../config/model-preheat';
import type {
  ModelPreheatConnectivityCheck,
  ModelPreheatS3Profile
} from '../config/types';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';
import ModelPreheatConnectivity from './model-preheat-connectivity';
import ModelPreheatS3ProfileModal from './model-preheat-s3-profile-modal';

type ConfirmAction = 'delete' | 'check';

const connectivityColors: Record<string, string> = {
  available: 'success',
  partial: 'warning',
  unavailable: 'error',
  no_workers: 'default',
  pending: 'processing',
  checking: 'processing',
  stale: 'warning'
};

const ModelPreheatS3Profiles: React.FC = () => {
  const intl = useIntl();
  const connectivityKeys = useRef(new IdempotencyKeyLifecycle());
  const profileRequests = useRef(new LatestRequestGate());
  const connectivityRequests = useRef(new LatestRequestGate());
  const [profiles, setProfiles] = useState<ModelPreheatS3Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ModelPreheatS3Profile | null>(null);
  const [confirm, setConfirm] = useState<{
    action: ConfirmAction;
    profile: ModelPreheatS3Profile;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [connectivityProfile, setConnectivityProfile] =
    useState<ModelPreheatS3Profile | null>(null);
  const [connectivity, setConnectivity] =
    useState<ModelPreheatConnectivityCheck | null>(null);
  const [connectivityLoading, setConnectivityLoading] = useState(false);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    return profileRequests.current.run(
      () => queryModelPreheatS3Profiles({ page, perPage: pageSize }),
      (result) => {
        setProfiles(result.items);
        setTotal(result.pagination.total);
      },
      () => setLoading(false)
    );
  }, [page, pageSize]);
  const loadProfilesRef = useRef(loadProfiles);
  loadProfilesRef.current = loadProfiles;

  useEffect(() => {
    void loadProfiles().catch(() => undefined);
  }, [loadProfiles]);

  useEffect(
    () => () => {
      profileRequests.current.invalidate();
      connectivityRequests.current.invalidate();
    },
    []
  );

  const loadConnectivity = useCallback(
    async (profile: ModelPreheatS3Profile, silent = false) => {
      if (!profile.last_connectivity_check_id) {
        connectivityRequests.current.invalidate();
        setConnectivity(null);
        setConnectivityLoading(false);
        return { applied: true, check: null };
      }
      if (!silent) setConnectivityLoading(true);
      const resultHolder: {
        check: ModelPreheatConnectivityCheck | null;
      } = { check: null };
      const applied = await connectivityRequests.current.run(
        () =>
          queryModelPreheatConnectivityCheck(
            profile.id,
            profile.last_connectivity_check_id!
          ),
        (result) => {
          resultHolder.check = result;
          setConnectivity(result);
          if (silent && !['pending', 'running'].includes(result.state)) {
            void loadProfilesRef.current().catch(() => undefined);
          }
        },
        () => {
          if (!silent) setConnectivityLoading(false);
        }
      );
      return { applied, check: resultHolder.check };
    },
    []
  );

  const connectivityPollKey =
    connectivityProfile &&
    connectivity &&
    ['pending', 'running'].includes(connectivity.state)
      ? `${connectivityProfile.id}:${connectivity.id}`
      : null;

  useEffect(() => {
    if (!connectivityProfile || !connectivityPollKey) return;
    let active = true;
    let timer: number | undefined;
    const profile = connectivityProfile;
    async function poll() {
      try {
        const result = await loadConnectivity(profile, true);
        if (
          active &&
          result.applied &&
          result.check &&
          ['pending', 'running'].includes(result.check.state)
        ) {
          timer = window.setTimeout(() => {
            void poll();
          }, 2000);
        }
      } catch {
        if (active) {
          timer = window.setTimeout(() => {
            void poll();
          }, 2000);
        }
      }
    }
    timer = window.setTimeout(() => {
      void poll();
    }, 2000);
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [connectivityPollKey, connectivityProfile, loadConnectivity]);

  const openConnectivity = (profile: ModelPreheatS3Profile) => {
    setConnectivityProfile(profile);
    setConnectivity(null);
    void loadConnectivity(profile).catch(() => undefined);
  };

  const openConfirm = (
    action: ConfirmAction,
    profile: ModelPreheatS3Profile
  ) => {
    if (action === 'check') connectivityKeys.current.start();
    setConfirm({ action, profile });
  };

  const closeConfirm = () => {
    if (confirm?.action === 'check') connectivityKeys.current.abandon();
    setConfirm(null);
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      if (confirm.action === 'delete') {
        await deleteModelPreheatS3Profile(confirm.profile.id);
        message.success(intl.formatMessage({ id: 'common.message.success' }));
        setConfirm(null);
        await loadProfiles();
        return;
      }
      const result = await createModelPreheatConnectivityCheck(
        confirm.profile.id,
        connectivityKeys.current.current()
      );
      connectivityKeys.current.complete();
      const nextProfile = {
        ...confirm.profile,
        last_connectivity_check_id: result.id
      };
      setConfirm(null);
      setConnectivityProfile(nextProfile);
      setConnectivity(result);
      await loadProfiles();
    } catch {
      return;
    } finally {
      setConfirmLoading(false);
    }
  };

  const columns = [
    {
      title: intl.formatMessage({ id: 'resources.preheat.profile.name' }),
      dataIndex: 'name',
      render: (value: string, record: ModelPreheatS3Profile) => (
        <Space size={6}>
          <span>{value}</span>
          {record.is_default && (
            <Tag color="blue">
              {intl.formatMessage({ id: 'resources.preheat.profile.default' })}
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.profile.endpoint' }),
      dataIndex: 'endpoint',
      ellipsis: true
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.profile.bucket' }),
      dataIndex: 'bucket',
      ellipsis: true
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.profile.credential' }),
      dataIndex: 'credential_configured',
      render: (value: boolean) => (
        <Tag color={value ? 'success' : 'error'}>
          {intl.formatMessage({
            id: value
              ? 'resources.preheat.state.configured'
              : 'resources.preheat.state.unconfigured'
          })}
        </Tag>
      )
    },
    {
      title: intl.formatMessage({
        id: 'resources.preheat.connectivity.status'
      }),
      dataIndex: 'connectivity_state',
      render: (value: string) => (
        <Tag color={connectivityColors[value]}>
          {intl.formatMessage({ id: `resources.preheat.state.${value}` })}
        </Tag>
      )
    },
    {
      title: intl.formatMessage({
        id: 'resources.preheat.connectivity.checkedAt'
      }),
      dataIndex: 'last_connectivity_checked_at',
      width: 170,
      render: (value: string | null) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: intl.formatMessage({ id: 'common.table.operation' }),
      key: 'operation',
      width: 180,
      render: (_: unknown, record: ModelPreheatS3Profile) => (
        <Space size={4}>
          <Tooltip title={intl.formatMessage({ id: 'common.button.edit' })}>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(record);
                setFormOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip
            title={intl.formatMessage({
              id: 'resources.preheat.connectivity.detail'
            })}
          >
            <Button
              type="text"
              icon={<CloudSyncOutlined />}
              disabled={!record.last_connectivity_check_id}
              onClick={() => openConnectivity(record)}
            />
          </Tooltip>
          <Tooltip
            title={intl.formatMessage({
              id: 'resources.preheat.connectivity.recheck'
            })}
          >
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => openConfirm('check', record)}
            />
          </Tooltip>
          <Tooltip title={intl.formatMessage({ id: 'common.button.delete' })}>
            <Button
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => openConfirm('delete', record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <>
      <Space
        style={{
          width: '100%',
          justifyContent: 'space-between',
          marginBottom: 16
        }}
      >
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            void loadProfiles().catch(() => undefined);
          }}
          loading={loading}
        >
          {intl.formatMessage({ id: 'common.button.refresh' })}
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          {intl.formatMessage({ id: 'resources.preheat.profile.create' })}
        </Button>
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={profiles}
        loading={loading}
        scroll={{ x: 980 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (nextPage, nextPageSize) => {
            profileRequests.current.invalidate();
            setPage(nextPageSize === pageSize ? nextPage : 1);
            setPageSize(nextPageSize);
          }
        }}
      />
      <ModelPreheatS3ProfileModal
        open={formOpen}
        record={editing}
        onCancel={() => setFormOpen(false)}
        onSaved={(profile) => {
          setFormOpen(false);
          message.success(intl.formatMessage({ id: 'common.message.success' }));
          void loadProfiles().catch(() => undefined);
          if (profile.last_connectivity_check_id) openConnectivity(profile);
        }}
      />
      <ModelPreheatConfirmModal
        open={Boolean(confirm)}
        title={intl.formatMessage({
          id:
            confirm?.action === 'delete'
              ? 'resources.preheat.profile.deleteConfirm'
              : 'resources.preheat.connectivity.recheckConfirm'
        })}
        content={intl.formatMessage(
          {
            id:
              confirm?.action === 'delete'
                ? 'resources.preheat.profile.deleteContent'
                : 'resources.preheat.connectivity.recheckContent'
          },
          { name: confirm?.profile.name || '' }
        )}
        okText={intl.formatMessage({
          id:
            confirm?.action === 'delete'
              ? 'common.button.delete'
              : 'resources.preheat.connectivity.recheck'
        })}
        danger={confirm?.action === 'delete'}
        loading={confirmLoading}
        onOk={handleConfirm}
        onCancel={closeConfirm}
      />
      <ModelPreheatConnectivity
        open={Boolean(connectivityProfile)}
        profile={connectivityProfile}
        check={connectivity}
        loading={connectivityLoading}
        onCancel={() => {
          connectivityRequests.current.invalidate();
          setConnectivityProfile(null);
          setConnectivity(null);
        }}
      />
    </>
  );
};

export default ModelPreheatS3Profiles;
