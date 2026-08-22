import { convertFileSize } from '@/utils';
import { ReloadOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Alert, Button, Select, Space, Table, Tabs, message } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import {
  queryModelPreheatS3Profiles,
  queryModelStorageArtifacts,
  refreshModelStorageArtifacts
} from '../apis';
import type { ModelPreheatS3Profile, ModelStorageArtifact } from '../config/types';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';
import ModelPreheatConnectivity from './model-preheat-connectivity';
import ModelPreheatS3Profiles from './model-preheat-s3-profiles';

const ModelStorage: React.FC = () => {
  const intl = useIntl();
  const [profiles, setProfiles] = useState<ModelPreheatS3Profile[]>([]);
  const [profileId, setProfileId] = useState<number>();
  const [artifacts, setArtifacts] = useState<ModelStorageArtifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const [connectivityOpen, setConnectivityOpen] = useState(false);
  const selected = profiles.find((profile) => profile.id === profileId);

  const loadProfiles = useCallback(async () => {
    const result = await queryModelPreheatS3Profiles({ page: 1, perPage: 100 });
    setProfiles(result.items);
    setProfileId((current) => current || result.items.find((item) => item.is_default)?.id || result.items[0]?.id);
  }, []);

  const loadArtifacts = useCallback(async () => {
    if (!profileId) return setArtifacts([]);
    setLoading(true);
    try {
      setArtifacts(await queryModelStorageArtifacts(profileId));
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => { void loadProfiles().catch(() => undefined); }, [loadProfiles]);
  useEffect(() => { void loadArtifacts().catch(() => undefined); }, [loadArtifacts]);

  const refresh = async () => {
    if (!profileId) return;
    setRefreshing(true);
    try {
      await refreshModelStorageArtifacts(profileId);
      setConfirmRefresh(false);
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      await loadArtifacts();
    } finally {
      setRefreshing(false);
    }
  };

  return <>
    <Alert type="info" showIcon style={{ marginBottom: 16 }} message={intl.formatMessage({ id: 'resources.storage.description' })} />
    <Tabs items={[
      { key: 'profiles', label: intl.formatMessage({ id: 'resources.storage.profiles' }), children: <ModelPreheatS3Profiles /> },
      { key: 'artifacts', label: intl.formatMessage({ id: 'resources.storage.artifacts' }), children: <>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select value={profileId} onChange={setProfileId} style={{ minWidth: 220 }} options={profiles.map((profile) => ({ value: profile.id, label: profile.name }))} />
          <Button icon={<ReloadOutlined />} onClick={() => setConfirmRefresh(true)} disabled={!profileId}>{intl.formatMessage({ id: 'resources.storage.refresh' })}</Button>
        </Space>
        <Table rowKey="artifact_id" loading={loading} dataSource={artifacts} scroll={{ x: 860 }} columns={[
          { title: intl.formatMessage({ id: 'resources.storage.model' }), dataIndex: 'model_id' },
          { title: intl.formatMessage({ id: 'resources.storage.modelSource' }), dataIndex: 'source' },
          { title: intl.formatMessage({ id: 'resources.storage.version' }), dataIndex: 'resolved_revision' },
          { title: intl.formatMessage({ id: 'resources.storage.fileCount' }), dataIndex: 'file_count' },
          { title: intl.formatMessage({ id: 'resources.storage.capacity' }), dataIndex: 'total_size', render: (value: number) => convertFileSize(value, 1, true) }
        ]} />
      </> },
      { key: 'connectivity', label: intl.formatMessage({ id: 'resources.storage.connectivity' }), children: <>
        <Select value={profileId} onChange={setProfileId} style={{ minWidth: 220, marginBottom: 16 }} options={profiles.map((profile) => ({ value: profile.id, label: profile.name }))} />
        <Button onClick={() => setConnectivityOpen(true)} disabled={!selected}>{intl.formatMessage({ id: 'resources.storage.checkWorkers' })}</Button>
        <ModelPreheatConnectivity open={connectivityOpen} profile={selected} onCancel={() => setConnectivityOpen(false)} />
      </> }
    ]} />
    <ModelPreheatConfirmModal open={confirmRefresh} title={intl.formatMessage({ id: 'resources.storage.refreshConfirm' })} content={intl.formatMessage({ id: 'resources.storage.refreshContent' })} okText={intl.formatMessage({ id: 'resources.storage.refresh' })} loading={refreshing} onOk={refresh} onCancel={() => setConfirmRefresh(false)} />
  </>;
};

export default ModelStorage;
