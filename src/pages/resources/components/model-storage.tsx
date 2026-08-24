import { convertFileSize } from '@/utils';
import { ReloadOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  message,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tooltip
} from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  createModelPreheatConnectivityCheck,
  queryModelPreheatConnectivityCheck,
  queryModelPreheatS3Profiles,
  queryModelStorageArtifacts,
  refreshModelStorageArtifacts
} from '../apis';
import {
  getModelStorageRevisionPresentation,
  getModelStorageSourceLabel,
  IdempotencyKeyLifecycle
} from '../config/model-preheat';
import type {
  ModelPreheatConnectivityCheck,
  ModelPreheatS3Profile,
  ModelStorageArtifact
} from '../config/types';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';
import ModelPreheatConnectivity from './model-preheat-connectivity';
import ModelPreheatS3Profiles from './model-preheat-s3-profiles';

const ModelStorage: React.FC = () => {
  const intl = useIntl();
  const connectivityKey = useRef(new IdempotencyKeyLifecycle());
  const [allProfiles, setAllProfiles] = useState<ModelPreheatS3Profile[]>([]);
  const [artifactProfileId, setArtifactProfileId] = useState<number>();
  const [connectivityProfileId, setConnectivityProfileId] = useState<number>();
  const [artifacts, setArtifacts] = useState<ModelStorageArtifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const [confirmCheck, setConfirmCheck] = useState(false);
  const [checking, setChecking] = useState(false);
  const [connectivityOpen, setConnectivityOpen] = useState(false);
  const [connectivity, setConnectivity] =
    useState<ModelPreheatConnectivityCheck | null>(null);
  const activeProfiles = allProfiles.filter(
    (profile) => profile.lifecycle_state === 'active'
  );
  const selectedArtifact = activeProfiles.find(
    (profile) => profile.id === artifactProfileId
  );
  const selectedConnectivity = allProfiles.find(
    (profile) => profile.id === connectivityProfileId
  );

  const loadProfiles = useCallback(async () => {
    const result = await queryModelPreheatS3Profiles({ page: 1, perPage: 100 });
    const activeProfiles = result.items.filter(
      (profile) => profile.lifecycle_state === 'active'
    );
    setAllProfiles(result.items);
    setArtifactProfileId((current) =>
      current && activeProfiles.some((item) => item.id === current)
        ? current
        : activeProfiles.find((item) => item.is_default)?.id ||
          activeProfiles[0]?.id
    );
    setConnectivityProfileId((current) =>
      current && result.items.some((item) => item.id === current)
        ? current
        : result.items.find((item) => item.is_default)?.id ||
          result.items[0]?.id
    );
  }, []);

  const loadArtifacts = useCallback(async () => {
    if (!artifactProfileId) return setArtifacts([]);
    setLoading(true);
    try {
      setArtifacts(await queryModelStorageArtifacts(artifactProfileId));
    } finally {
      setLoading(false);
    }
  }, [artifactProfileId]);

  useEffect(() => {
    void loadProfiles().catch(() => undefined);
  }, [loadProfiles]);
  useEffect(() => {
    void loadArtifacts().catch(() => undefined);
  }, [loadArtifacts]);

  const refresh = async () => {
    if (!artifactProfileId) return;
    setRefreshing(true);
    try {
      await refreshModelStorageArtifacts(artifactProfileId);
      setConfirmRefresh(false);
      await loadArtifacts();
      message.success(
        intl.formatMessage({ id: 'resources.storage.refreshCompleted' })
      );
    } finally {
      setRefreshing(false);
    }
  };

  const runCheck = async () => {
    if (!selectedConnectivity) return;
    setChecking(true);
    try {
      const check = await createModelPreheatConnectivityCheck(
        selectedConnectivity.id,
        connectivityKey.current.current()
      );
      connectivityKey.current.complete();
      setConfirmCheck(false);
      setConnectivity(check);
      setConnectivityOpen(true);
      await loadProfiles();
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!connectivityOpen || !selectedConnectivity?.last_connectivity_check_id)
      return;
    let active = true;
    const checkId =
      connectivity?.id || selectedConnectivity.last_connectivity_check_id;
    const poll = async () => {
      const check = await queryModelPreheatConnectivityCheck(
        selectedConnectivity.id,
        checkId
      );
      if (!active) return;
      setConnectivity(check);
      if (['pending', 'running'].includes(check.state))
        window.setTimeout(() => void poll(), 2000);
    };
    void poll().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [
    connectivity?.id,
    connectivityOpen,
    selectedConnectivity?.id,
    selectedConnectivity?.last_connectivity_check_id
  ]);

  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={intl.formatMessage({ id: 'resources.storage.description' })}
      />
      <Tabs
        items={[
          {
            key: 'profiles',
            label: intl.formatMessage({ id: 'resources.storage.profiles' }),
            children: (
              <ModelPreheatS3Profiles
                onProfilesChanged={() => void loadProfiles()}
              />
            )
          },
          {
            key: 'artifacts',
            label: intl.formatMessage({ id: 'resources.storage.artifacts' }),
            children: (
              <>
                <Space style={{ marginBottom: 16 }} wrap>
                  <Select
                    value={artifactProfileId}
                    onChange={setArtifactProfileId}
                    style={{ minWidth: 220 }}
                    options={activeProfiles.map((profile) => ({
                      value: profile.id,
                      label: profile.name
                    }))}
                  />
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => setConfirmRefresh(true)}
                    disabled={!selectedArtifact || refreshing}
                  >
                    {intl.formatMessage({ id: 'resources.storage.refresh' })}
                  </Button>
                  {refreshing && <Spin size="small" />}
                </Space>
                <Table
                  rowKey="artifact_id"
                  loading={loading}
                  dataSource={artifacts}
                  scroll={{ x: 860 }}
                  columns={[
                    {
                      title: intl.formatMessage({
                        id: 'resources.storage.model'
                      }),
                      dataIndex: 'model_id'
                    },
                    {
                      title: intl.formatMessage({
                        id: 'resources.storage.modelSource'
                      }),
                      dataIndex: 'source',
                      render: (value: ModelStorageArtifact['source']) =>
                        getModelStorageSourceLabel(value)
                    },
                    {
                      title: intl.formatMessage({
                        id: 'resources.storage.version'
                      }),
                      dataIndex: 'resolved_revision',
                      render: (value: string) => {
                        const revision =
                          getModelStorageRevisionPresentation(value);
                        return (
                          <Tooltip title={revision.full}>
                            {revision.short}
                          </Tooltip>
                        );
                      }
                    },
                    {
                      title: intl.formatMessage({
                        id: 'resources.storage.fileCount'
                      }),
                      dataIndex: 'file_count'
                    },
                    {
                      title: intl.formatMessage({
                        id: 'resources.storage.capacity'
                      }),
                      dataIndex: 'total_size',
                      render: (value: number) => convertFileSize(value, 1, true)
                    }
                  ]}
                />
              </>
            )
          },
          {
            key: 'connectivity',
            label: intl.formatMessage({ id: 'resources.storage.connectivity' }),
            children: (
              <>
                <Select
                  value={connectivityProfileId}
                  onChange={setConnectivityProfileId}
                  style={{ minWidth: 220, marginBottom: 16 }}
                  options={allProfiles.map((profile) => ({
                    value: profile.id,
                    label: profile.name
                  }))}
                />
                <Button
                  onClick={() => {
                    connectivityKey.current.start();
                    setConfirmCheck(true);
                  }}
                  disabled={!selectedConnectivity}
                >
                  {intl.formatMessage({ id: 'resources.storage.checkWorkers' })}
                </Button>
                <ModelPreheatConnectivity
                  open={connectivityOpen}
                  profile={selectedConnectivity}
                  check={connectivity}
                  onCancel={() => setConnectivityOpen(false)}
                />
              </>
            )
          }
        ]}
      />
      <ModelPreheatConfirmModal
        open={confirmRefresh}
        title={intl.formatMessage({ id: 'resources.storage.refreshConfirm' })}
        content={intl.formatMessage({ id: 'resources.storage.refreshContent' })}
        okText={intl.formatMessage({ id: 'resources.storage.refresh' })}
        loading={refreshing}
        onOk={refresh}
        onCancel={() => setConfirmRefresh(false)}
      />
      <ModelPreheatConfirmModal
        open={confirmCheck}
        title={intl.formatMessage({
          id: 'resources.storage.checkWorkersConfirm'
        })}
        content={intl.formatMessage(
          { id: 'resources.storage.checkWorkersContent' },
          { name: selectedConnectivity?.name || '' }
        )}
        okText={intl.formatMessage({ id: 'resources.storage.checkWorkers' })}
        loading={checking}
        onOk={runCheck}
        onCancel={() => {
          connectivityKey.current.abandon();
          setConfirmCheck(false);
        }}
      />
    </>
  );
};

export default ModelStorage;
