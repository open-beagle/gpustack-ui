import { convertFileSize } from '@/utils';
import {
  DatabaseOutlined,
  EyeOutlined,
  ReloadOutlined,
  SendOutlined
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tooltip,
  Typography
} from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  createModelPreheatConnectivityCheck,
  queryModelPreheatConnectivityCheck,
  queryModelPreheatS3Profiles,
  queryModelStorageArtifacts,
  refreshModelStorageArtifacts
} from '../apis';
import {
  getModelStorageErrorPresentation,
  getModelStorageRevisionPresentation,
  getModelStorageSourceLabel,
  IdempotencyKeyLifecycle
} from '../config/model-preheat';
import type {
  ModelPreheatConnectivityCheck,
  ModelPreheatDistributionSelectionMode,
  ModelPreheatS3Profile,
  ModelStorageArtifact
} from '../config/types';
import ModelDistributionPolicyModal from './model-distribution-policy-modal';
import ModelPreheatConnectivity from './model-preheat-connectivity';
import ModelPreheatS3Profiles from './model-preheat-s3-profiles';
import ModelStorageAsyncState from './model-storage-async-state';

const ModelStorage: React.FC = () => {
  const intl = useIntl();
  const connectivityKey = useRef(new IdempotencyKeyLifecycle());
  const artifactRequest = useRef<{
    generation: number;
    controller?: AbortController;
  }>({ generation: 0 });
  const refreshRequest = useRef<{
    generation: number;
    controller?: AbortController;
  }>({ generation: 0 });
  const [allProfiles, setAllProfiles] = useState<ModelPreheatS3Profile[]>([]);
  const [artifactProfileId, setArtifactProfileId] = useState<number>();
  const [connectivityProfileId, setConnectivityProfileId] = useState<number>();
  const [artifacts, setArtifacts] = useState<ModelStorageArtifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [artifactError, setArtifactError] = useState<unknown>();
  const [artifactPage, setArtifactPage] = useState(1);
  const [artifactSearchInput, setArtifactSearchInput] = useState('');
  const [artifactSearch, setArtifactSearch] = useState('');
  const [artifactSource, setArtifactSource] =
    useState<ModelStorageArtifact['source']>();
  const [artifactState, setArtifactState] = useState<string>();
  const [artifactTotal, setArtifactTotal] = useState(0);
  const [artifactDetail, setArtifactDetail] =
    useState<ModelStorageArtifact | null>(null);
  const [selectedArtifactKeys, setSelectedArtifactKeys] = useState<string[]>(
    []
  );
  const [selectedArtifacts, setSelectedArtifacts] = useState<
    ModelStorageArtifact[]
  >([]);
  const [distributionDraft, setDistributionDraft] = useState<{
    selectionMode: ModelPreheatDistributionSelectionMode;
    artifacts: ModelStorageArtifact[];
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [connectivityOpen, setConnectivityOpen] = useState(false);
  const [connectivity, setConnectivity] =
    useState<ModelPreheatConnectivityCheck | null>(null);
  const artifactProfileIdRef = useRef<number>();
  artifactProfileIdRef.current = artifactProfileId;
  const activeProfiles = allProfiles.filter(
    (profile) => profile.lifecycle_state === 'active'
  );
  const selectedArtifact = activeProfiles.find(
    (profile) => profile.id === artifactProfileId
  );
  const selectedConnectivity = allProfiles.find(
    (profile) => profile.id === connectivityProfileId
  );
  const scanError = getModelStorageErrorPresentation(
    selectedArtifact?.inventory_last_error_code
  );
  const scanSummary = selectedArtifact && (
    <span>
      {intl.formatMessage({ id: 'resources.storage.lastScan' })}:{' '}
      {selectedArtifact.inventory_last_attempt_at
        ? dayjs(selectedArtifact.inventory_last_attempt_at).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        : '-'}
      {selectedArtifact.inventory_last_success_at && (
        <>
          {' '}
          · {intl.formatMessage({ id: 'resources.storage.scanResult' })}:{' '}
          {intl.formatMessage(
            { id: 'resources.storage.scanResult.success' },
            { count: selectedArtifact.inventory_last_scan_count || 0 }
          )}{' '}
          ·{' '}
          {intl.formatMessage(
            {
              id:
                artifactSearch || artifactSource || artifactState
                  ? 'resources.storage.scanResult.filteredArtifactTotal'
                  : 'resources.storage.scanResult.artifactTotal'
            },
            { count: artifactTotal }
          )}
        </>
      )}
      {selectedArtifact.inventory_last_error_code && (
        <>
          {' '}
          · {intl.formatMessage({ id: 'resources.storage.scanResult' })}:{' '}
          {intl.formatMessage({ id: scanError.messageId })} ·{' '}
          {intl.formatMessage({ id: scanError.actionHintId })}
        </>
      )}
    </span>
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
    const generation = ++artifactRequest.current.generation;
    artifactRequest.current.controller?.abort();
    const controller = new AbortController();
    artifactRequest.current.controller = controller;
    if (!artifactProfileId) {
      setArtifacts([]);
      setArtifactTotal(0);
      return;
    }
    setLoading(true);
    setArtifactError(undefined);
    try {
      const result = await queryModelStorageArtifacts(
        artifactProfileId,
        {
          page: artifactPage,
          perPage: 20,
          ...(artifactSearch ? { search: artifactSearch } : {}),
          ...(artifactSource ? { source: artifactSource } : {}),
          ...(artifactState ? { manifest_state: artifactState } : {})
        },
        { signal: controller.signal }
      );
      if (generation !== artifactRequest.current.generation) return;
      // 兼容历史测试桩；真实服务始终返回 PaginatedList。
      setArtifacts(Array.isArray(result) ? result : result.items);
      setArtifactTotal(
        Array.isArray(result) ? result.length : result.pagination.total
      );
    } catch (error) {
      if (
        generation === artifactRequest.current.generation &&
        !controller.signal.aborted
      ) {
        setArtifactError(error);
      }
    } finally {
      if (generation === artifactRequest.current.generation) setLoading(false);
    }
  }, [
    artifactPage,
    artifactProfileId,
    artifactSearch,
    artifactSource,
    artifactState
  ]);
  const loadArtifactsRef = useRef(loadArtifacts);
  loadArtifactsRef.current = loadArtifacts;

  useEffect(() => {
    void loadProfiles().catch(() => undefined);
  }, [loadProfiles]);
  useEffect(() => {
    void loadArtifacts().catch(() => undefined);
  }, [loadArtifacts]);
  useEffect(
    () => () => {
      artifactRequest.current.generation += 1;
      artifactRequest.current.controller?.abort();
      refreshRequest.current.generation += 1;
      refreshRequest.current.controller?.abort();
    },
    []
  );

  useEffect(() => {
    refreshRequest.current.generation += 1;
    refreshRequest.current.controller?.abort();
    setRefreshing(false);
    if (artifactProfileId) return;
    artifactRequest.current.generation += 1;
    artifactRequest.current.controller?.abort();
    setLoading(false);
    setArtifactError(undefined);
    setArtifacts([]);
    setArtifactTotal(0);
    setArtifactPage(1);
  }, [artifactProfileId]);

  useEffect(() => {
    setSelectedArtifactKeys([]);
    setSelectedArtifacts([]);
  }, [artifactProfileId]);

  const refresh = async () => {
    const profileId = artifactProfileId;
    if (!profileId) return;
    const generation = ++refreshRequest.current.generation;
    refreshRequest.current.controller?.abort();
    const controller = new AbortController();
    refreshRequest.current.controller = controller;
    setRefreshing(true);
    setArtifactError(undefined);
    try {
      await refreshModelStorageArtifacts(profileId, {
        signal: controller.signal
      });
      if (
        controller.signal.aborted ||
        generation !== refreshRequest.current.generation ||
        artifactProfileIdRef.current !== profileId
      )
        return;
      await loadArtifactsRef.current();
      if (
        controller.signal.aborted ||
        generation !== refreshRequest.current.generation ||
        artifactProfileIdRef.current !== profileId
      )
        return;
      await loadProfiles();
      if (
        controller.signal.aborted ||
        generation !== refreshRequest.current.generation ||
        artifactProfileIdRef.current !== profileId
      )
        return;
      message.success(
        intl.formatMessage({ id: 'resources.storage.refreshCompleted' })
      );
    } catch (error) {
      if (
        !controller.signal.aborted &&
        generation === refreshRequest.current.generation &&
        artifactProfileIdRef.current === profileId
      )
        setArtifactError(error);
    } finally {
      if (
        generation === refreshRequest.current.generation &&
        artifactProfileIdRef.current === profileId
      )
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
                    onChange={(value) => {
                      refreshRequest.current.generation += 1;
                      refreshRequest.current.controller?.abort();
                      setSelectedArtifactKeys([]);
                      setSelectedArtifacts([]);
                      setArtifactProfileId(value);
                      setArtifactPage(1);
                    }}
                    style={{ minWidth: 220 }}
                    options={activeProfiles.map((profile) => ({
                      value: profile.id,
                      label: profile.name
                    }))}
                  />
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => void refresh()}
                    disabled={!selectedArtifact || refreshing}
                  >
                    {intl.formatMessage({ id: 'resources.storage.refresh' })}
                  </Button>
                  {selectedArtifactKeys.length > 0 && (
                    <Typography.Text>
                      {intl.formatMessage(
                        {
                          id: 'resources.storage.distributionPolicy.selectedCount'
                        },
                        { count: selectedArtifactKeys.length }
                      )}
                    </Typography.Text>
                  )}
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    disabled={!selectedArtifactKeys.length}
                    onClick={() =>
                      setDistributionDraft({
                        selectionMode: 'selected',
                        artifacts: selectedArtifacts
                      })
                    }
                  >
                    {intl.formatMessage({
                      id: 'resources.storage.distributionPolicy.createSelected'
                    })}
                  </Button>
                  <Button
                    icon={<DatabaseOutlined />}
                    disabled={!artifactProfileId}
                    onClick={() =>
                      setDistributionDraft({
                        selectionMode: 'all_current',
                        artifacts: []
                      })
                    }
                  >
                    {intl.formatMessage({
                      id: 'resources.storage.distributionPolicy.createAllCurrent'
                    })}
                  </Button>
                  {refreshing && <Spin size="small" />}
                  <Input.Search
                    allowClear
                    value={artifactSearchInput}
                    placeholder={intl.formatMessage({
                      id: 'resources.storage.model'
                    })}
                    onChange={(event) => {
                      const value = event.target.value;
                      setArtifactSearchInput(value);
                      setArtifactSearch(value);
                      setArtifactPage(1);
                    }}
                    onSearch={(value) => {
                      setArtifactSearchInput(value);
                      setArtifactSearch(value);
                      setArtifactPage(1);
                    }}
                    style={{ width: 220 }}
                  />
                  <Select
                    allowClear
                    value={artifactSource}
                    placeholder={intl.formatMessage({
                      id: 'resources.storage.modelSource'
                    })}
                    onChange={(value) => {
                      setArtifactSource(value);
                      setArtifactPage(1);
                    }}
                    style={{ width: 150 }}
                    options={[
                      'modelscope',
                      'huggingface',
                      'ollama_library'
                    ].map((value) => ({
                      value,
                      label: getModelStorageSourceLabel(
                        value as ModelStorageArtifact['source']
                      )
                    }))}
                  />
                  <Select
                    allowClear
                    value={artifactState}
                    placeholder={intl.formatMessage({
                      id: 'resources.preheat.connectivity.status'
                    })}
                    onChange={(value) => {
                      setArtifactState(value);
                      setArtifactPage(1);
                    }}
                    style={{ width: 130 }}
                    options={['valid', 'invalid', 'missing', 'stale'].map(
                      (value) => ({
                        value,
                        label: intl.formatMessage({
                          id: `resources.storage.status.${value}`
                        })
                      })
                    )}
                  />
                </Space>
                {scanSummary && (
                  <div style={{ marginBottom: 16 }}>{scanSummary}</div>
                )}
                <ModelStorageAsyncState
                  data={artifacts}
                  loading={loading}
                  refreshing={refreshing}
                  error={artifactError}
                  hasFilters={Boolean(
                    artifactProfileId &&
                    (artifactSearch || artifactSource || artifactState)
                  )}
                  onRetry={() => void loadArtifacts()}
                >
                  <Table
                    rowKey="artifact_id"
                    loading={loading}
                    dataSource={artifacts}
                    rowSelection={{
                      selectedRowKeys: selectedArtifactKeys,
                      preserveSelectedRowKeys: true,
                      getCheckboxProps: (record) => ({
                        disabled: record.manifest_state !== 'valid'
                      }),
                      onChange: (keys, rows) => {
                        const selectedKeys = keys.map(String);
                        const selectedKeySet = new Set(selectedKeys);
                        const records = new Map(
                          selectedArtifacts
                            .filter((item) =>
                              selectedKeySet.has(item.artifact_id)
                            )
                            .map((item) => [item.artifact_id, item])
                        );
                        rows
                          .filter((item) => item.manifest_state === 'valid')
                          .forEach((item) =>
                            records.set(item.artifact_id, item)
                          );
                        setSelectedArtifactKeys(selectedKeys);
                        setSelectedArtifacts(Array.from(records.values()));
                      }
                    }}
                    scroll={{ x: 1040 }}
                    pagination={{
                      current: artifactPage,
                      pageSize: 20,
                      total: artifactTotal,
                      showSizeChanger: false,
                      showTotal: (value) =>
                        intl.formatMessage(
                          { id: 'resources.storage.pagination.total' },
                          { total: value }
                        ),
                      onChange: setArtifactPage
                    }}
                    columns={[
                      {
                        title: intl.formatMessage({
                          id: 'resources.preheat.connectivity.status'
                        }),
                        dataIndex: 'manifest_state',
                        render: (value: string) =>
                          intl.formatMessage({
                            id: `resources.storage.status.${value}`
                          })
                      },
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
                            <Typography.Text
                              style={{ wordBreak: 'break-all' }}
                              copyable={{ text: revision.full }}
                              ellipsis={{ tooltip: revision.full }}
                            >
                              {revision.short}
                            </Typography.Text>
                          );
                        }
                      },
                      {
                        title: intl.formatMessage({
                          id: 'resources.storage.inventorySource'
                        }),
                        key: 'inventory_source',
                        render: (_: unknown, record: ModelStorageArtifact) =>
                          intl.formatMessage({
                            id: record.created_by_task_id
                              ? 'resources.storage.inventorySource.task'
                              : 'resources.storage.inventorySource.scan'
                          })
                      },
                      {
                        title: intl.formatMessage({
                          id: 'resources.storage.lastVerifiedAt'
                        }),
                        dataIndex: 'last_verified_at',
                        render: (value: string | null) =>
                          value
                            ? dayjs(value).format('YYYY-MM-DD HH:mm:ss')
                            : '-'
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
                        render: (value: number) =>
                          convertFileSize(value, 1, true)
                      },
                      {
                        title: intl.formatMessage({
                          id: 'common.table.operation'
                        }),
                        key: 'operation',
                        fixed: 'right',
                        render: (_: unknown, record: ModelStorageArtifact) => (
                          <Space size={4}>
                            <Tooltip
                              title={intl.formatMessage({
                                id: 'resources.storage.artifactDetail'
                              })}
                            >
                              <Button
                                aria-label={intl.formatMessage({
                                  id: 'resources.storage.artifactDetail'
                                })}
                                type="text"
                                icon={<EyeOutlined />}
                                onClick={() => setArtifactDetail(record)}
                              />
                            </Tooltip>
                            <Tooltip
                              title={
                                record.manifest_state === 'valid'
                                  ? intl.formatMessage({
                                      id: 'resources.storage.distributionPolicy.create'
                                    })
                                  : intl.formatMessage({
                                      id: 'resources.storage.error.artifactNotReady'
                                    })
                              }
                            >
                              <Button
                                aria-label={intl.formatMessage({
                                  id: 'resources.storage.distributionPolicy.create'
                                })}
                                type="text"
                                icon={<SendOutlined />}
                                disabled={record.manifest_state !== 'valid'}
                                onClick={() =>
                                  setDistributionDraft({
                                    selectionMode: 'fixed',
                                    artifacts: [record]
                                  })
                                }
                              />
                            </Tooltip>
                          </Space>
                        )
                      }
                    ]}
                  />
                </ModelStorageAsyncState>
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
                  loading={checking}
                  onClick={() => {
                    connectivityKey.current.start();
                    void runCheck();
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
      <Modal
        open={Boolean(artifactDetail)}
        centered
        width={720}
        title={intl.formatMessage({ id: 'resources.storage.artifactDetail' })}
        footer={null}
        onCancel={() => setArtifactDetail(null)}
      >
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'resources.storage.profile' })}
          >
            {selectedArtifact?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'resources.storage.model' })}
          >
            <Typography.Text style={{ wordBreak: 'break-all' }} copyable>
              {artifactDetail?.model_id}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'resources.storage.modelSource' })}
          >
            {artifactDetail &&
              getModelStorageSourceLabel(artifactDetail.source)}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'resources.storage.version' })}
          >
            <Typography.Text style={{ wordBreak: 'break-all' }} copyable>
              {artifactDetail?.resolved_revision}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'resources.storage.artifactId' })}
          >
            <Typography.Text style={{ wordBreak: 'break-all' }} copyable>
              {artifactDetail?.artifact_id}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({
              id: 'resources.storage.manifestDigest'
            })}
          >
            <Typography.Text style={{ wordBreak: 'break-all' }} copyable>
              {artifactDetail?.manifest_digest}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'resources.storage.manifestPath' })}
          >
            <Typography.Text style={{ wordBreak: 'break-all' }} copyable>
              {artifactDetail?.manifest_path}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({
              id: 'resources.storage.includePatterns'
            })}
          >
            <Typography.Text style={{ wordBreak: 'break-all' }} copyable>
              {artifactDetail?.include_patterns?.join(', ') || '-'}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({
              id: 'resources.storage.excludePatterns'
            })}
          >
            <Typography.Text style={{ wordBreak: 'break-all' }} copyable>
              {artifactDetail?.exclude_patterns?.join(', ') || '-'}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({
              id: 'resources.storage.inventorySource'
            })}
          >
            {intl.formatMessage({
              id: artifactDetail?.created_by_task_id
                ? 'resources.storage.inventorySource.task'
                : 'resources.storage.inventorySource.scan'
            })}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({
              id: 'resources.storage.lastVerifiedAt'
            })}
          >
            {artifactDetail?.last_verified_at
              ? dayjs(artifactDetail.last_verified_at).format(
                  'YYYY-MM-DD HH:mm:ss'
                )
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'resources.storage.fileCount' })}
          >
            {artifactDetail?.file_count}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'resources.storage.capacity' })}
          >
            {artifactDetail &&
              convertFileSize(artifactDetail.total_size, 1, true)}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'resources.storage.createdAt' })}
          >
            {artifactDetail?.created_at
              ? dayjs(artifactDetail.created_at).format('YYYY-MM-DD HH:mm:ss')
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'resources.storage.updatedAt' })}
          >
            {artifactDetail?.updated_at
              ? dayjs(artifactDetail.updated_at).format('YYYY-MM-DD HH:mm:ss')
              : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Modal>
      <ModelDistributionPolicyModal
        open={Boolean(distributionDraft)}
        initialProfileId={artifactProfileId}
        initialSelectionMode={distributionDraft?.selectionMode}
        initialArtifactId={distributionDraft?.artifacts[0]?.artifact_id}
        initialArtifacts={distributionDraft?.artifacts}
        onCancel={() => setDistributionDraft(null)}
        onSaved={() => {
          setDistributionDraft(null);
          setSelectedArtifactKeys([]);
          setSelectedArtifacts([]);
        }}
      />
    </>
  );
};

export default ModelStorage;
