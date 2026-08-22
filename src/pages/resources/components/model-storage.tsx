import { convertFileSize } from '@/utils';
import { ReloadOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Alert, Button, Select, Space, Spin, Table, Tabs, message } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  createModelPreheatConnectivityCheck,
  queryModelPreheatConnectivityCheck,
  queryModelPreheatS3Profiles,
  queryModelStorageArtifacts,
  refreshModelStorageArtifacts
} from '../apis';
import { IdempotencyKeyLifecycle } from '../config/model-preheat';
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
  const [profiles, setProfiles] = useState<ModelPreheatS3Profile[]>([]);
  const [profileId, setProfileId] = useState<number>();
  const [artifacts, setArtifacts] = useState<ModelStorageArtifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSubmitted, setRefreshSubmitted] = useState(false);
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const [confirmCheck, setConfirmCheck] = useState(false);
  const [checking, setChecking] = useState(false);
  const [connectivityOpen, setConnectivityOpen] = useState(false);
  const [connectivity, setConnectivity] = useState<ModelPreheatConnectivityCheck | null>(null);
  const selected = profiles.find((profile) => profile.id === profileId);

  const loadProfiles = useCallback(async () => {
    const result = await queryModelPreheatS3Profiles({ page: 1, perPage: 100 });
    setProfiles(result.items);
    setProfileId((current) =>
      current && result.items.some((item) => item.id === current)
        ? current
        : result.items.find((item) => item.is_default)?.id || result.items[0]?.id
    );
  }, []);

  const loadArtifacts = useCallback(async () => {
    if (!profileId) return setArtifacts([]);
    setLoading(true);
    try { setArtifacts(await queryModelStorageArtifacts(profileId)); } finally { setLoading(false); }
  }, [profileId]);

  useEffect(() => { void loadProfiles().catch(() => undefined); }, [loadProfiles]);
  useEffect(() => { void loadArtifacts().catch(() => undefined); }, [loadArtifacts]);

  useEffect(() => {
    if (!refreshSubmitted || !profileId) return;
    const timer = window.setTimeout(() => {
      void loadArtifacts().finally(() => setRefreshSubmitted(false));
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [loadArtifacts, profileId, refreshSubmitted]);

  const refresh = async () => {
    if (!profileId) return;
    setRefreshing(true);
    try {
      await refreshModelStorageArtifacts(profileId);
      setConfirmRefresh(false);
      setRefreshSubmitted(true);
      message.success(intl.formatMessage({ id: 'resources.storage.refreshSubmitted' }));
    } finally { setRefreshing(false); }
  };

  const runCheck = async () => {
    if (!selected) return;
    setChecking(true);
    try {
      const check = await createModelPreheatConnectivityCheck(selected.id, connectivityKey.current.current());
      connectivityKey.current.complete();
      setConfirmCheck(false);
      setConnectivity(check);
      setConnectivityOpen(true);
      await loadProfiles();
    } finally { setChecking(false); }
  };

  useEffect(() => {
    if (!connectivityOpen || !selected?.last_connectivity_check_id) return;
    let active = true;
    const checkId = connectivity?.id || selected.last_connectivity_check_id;
    const poll = async () => {
      const check = await queryModelPreheatConnectivityCheck(selected.id, checkId);
      if (!active) return;
      setConnectivity(check);
      if (['pending', 'running'].includes(check.state)) window.setTimeout(() => void poll(), 2000);
    };
    void poll().catch(() => undefined);
    return () => { active = false; };
  }, [connectivity?.id, connectivityOpen, selected?.id, selected?.last_connectivity_check_id]);

  return <>
    <Alert type="info" showIcon style={{ marginBottom: 16 }} message={intl.formatMessage({ id: 'resources.storage.description' })} />
    <Tabs items={[
      { key: 'profiles', label: intl.formatMessage({ id: 'resources.storage.profiles' }), children: <ModelPreheatS3Profiles onProfilesChanged={() => void loadProfiles()} /> },
      { key: 'artifacts', label: intl.formatMessage({ id: 'resources.storage.artifacts' }), children: <>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select value={profileId} onChange={setProfileId} style={{ minWidth: 220 }} options={profiles.map((profile) => ({ value: profile.id, label: profile.name }))} />
          <Button icon={<ReloadOutlined />} onClick={() => setConfirmRefresh(true)} disabled={!profileId || refreshSubmitted}>{intl.formatMessage({ id: 'resources.storage.refresh' })}</Button>
          {refreshSubmitted && <Spin size="small" />}
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
        <Button onClick={() => { connectivityKey.current.start(); setConfirmCheck(true); }} disabled={!selected}>{intl.formatMessage({ id: 'resources.storage.checkWorkers' })}</Button>
        <ModelPreheatConnectivity open={connectivityOpen} profile={selected} check={connectivity} onCancel={() => setConnectivityOpen(false)} />
      </> }
    ]} />
    <ModelPreheatConfirmModal open={confirmRefresh} title={intl.formatMessage({ id: 'resources.storage.refreshConfirm' })} content={intl.formatMessage({ id: 'resources.storage.refreshContent' })} okText={intl.formatMessage({ id: 'resources.storage.refresh' })} loading={refreshing} onOk={refresh} onCancel={() => setConfirmRefresh(false)} />
    <ModelPreheatConfirmModal open={confirmCheck} title={intl.formatMessage({ id: 'resources.storage.checkWorkersConfirm' })} content={intl.formatMessage({ id: 'resources.storage.checkWorkersContent' }, { name: selected?.name || '' })} okText={intl.formatMessage({ id: 'resources.storage.checkWorkers' })} loading={checking} onOk={runCheck} onCancel={() => { connectivityKey.current.abandon(); setConfirmCheck(false); }} />
  </>;
};

export default ModelStorage;
