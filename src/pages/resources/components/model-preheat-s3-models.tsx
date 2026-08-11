import { convertFileSize } from '@/utils';
import {
  ClearOutlined,
  CloudSyncOutlined,
  LeftOutlined,
  ReloadOutlined,
  RightOutlined
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message
} from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  createModelPreheatInventoryJob,
  queryModelPreheatCachedModels,
  queryModelPreheatInventoryJob,
  queryModelPreheatS3Profiles
} from '../apis';
import {
  LatestRequestGate,
  inventoryJobForProfile,
  loadAllPaginated,
  refreshScopedInventoryJob,
  type ScopedInventoryJob
} from '../config/model-preheat';
import type {
  ModelPreheatCachedModel,
  ModelPreheatS3Profile
} from '../config/types';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';

type InventoryAction = 'refresh' | 'gc';

const renderExpandedModel = (record: ModelPreheatCachedModel) => (
  <Typography.Paragraph copyable={{ text: record.ready_path }}>
    {record.ready_path}
  </Typography.Paragraph>
);

const ModelPreheatS3Models: React.FC = () => {
  const intl = useIntl();
  const modelRequests = useRef(new LatestRequestGate());
  const profileRequests = useRef(new LatestRequestGate());
  const [profiles, setProfiles] = useState<ModelPreheatS3Profile[]>([]);
  const [profileId, setProfileId] = useState<number>();
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState(false);
  const [models, setModels] = useState<ModelPreheatCachedModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [manifestState, setManifestState] = useState<string>();
  const [source, setSource] = useState<string>();
  const [cursors, setCursors] = useState<Array<string | undefined>>([
    undefined
  ]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<InventoryAction | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [scopedJob, setScopedJob] = useState<ScopedInventoryJob | null>(null);
  const job = inventoryJobForProfile(scopedJob, profileId);

  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true);
    setProfilesError(false);
    try {
      await profileRequests.current.run(
        () =>
          loadAllPaginated((page, perPage) =>
            queryModelPreheatS3Profiles({ page, perPage })
          ),
        (items) => {
          setProfiles(items);
          const defaultProfile =
            items.find((item) => item.is_default) || items[0];
          setProfileId((current) =>
            current && items.some((item) => item.id === current)
              ? current
              : defaultProfile?.id
          );
        },
        () => setProfilesLoading(false)
      );
    } catch {
      setProfilesError(true);
    }
  }, []);

  useEffect(() => {
    void loadProfiles();
    return () => profileRequests.current.invalidate();
  }, [loadProfiles]);

  const loadModels = useCallback(async () => {
    if (!profileId) {
      modelRequests.current.invalidate();
      setModels([]);
      setNextCursor(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return modelRequests.current.run(
      () =>
        queryModelPreheatCachedModels(profileId, {
          limit: 20,
          cursor: cursors[pageIndex],
          manifest_state: manifestState,
          source
        }),
      (result) => {
        setModels(result.items);
        setNextCursor(result.next_cursor);
      },
      () => setLoading(false)
    );
  }, [cursors, manifestState, pageIndex, profileId, source]);

  useEffect(() => {
    void loadModels().catch(() => undefined);
  }, [loadModels]);

  useEffect(
    () => () => {
      modelRequests.current.invalidate();
      profileRequests.current.invalidate();
    },
    []
  );

  useEffect(() => {
    if (!scopedJob || !['pending', 'running'].includes(scopedJob.job.state)) {
      return;
    }
    let active = true;
    const jobToPoll = scopedJob;
    const timer = window.setInterval(() => {
      void refreshScopedInventoryJob(jobToPoll, queryModelPreheatInventoryJob)
        .then((result) => {
          if (!active) return;
          setScopedJob(result);
          if (result.job.state === 'ready' && profileId === result.profileId) {
            void loadModels().catch(() => undefined);
          }
        })
        .catch(() => {
          if (active) setScopedJob(null);
        });
    }, 2000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [loadModels, profileId, scopedJob]);

  const resetPaging = () => {
    modelRequests.current.invalidate();
    setCursors([undefined]);
    setPageIndex(0);
  };

  const runInventory = async () => {
    if (!profileId || !confirm) return;
    setConfirmLoading(true);
    try {
      const result = await createModelPreheatInventoryJob(profileId, confirm);
      setScopedJob({ profileId, job: result });
      setConfirm(null);
      message.success(intl.formatMessage({ id: 'common.message.success' }));
    } finally {
      setConfirmLoading(false);
    }
  };

  const columns = [
    {
      title: intl.formatMessage({ id: 'resources.preheat.model' }),
      dataIndex: 'model_id',
      ellipsis: true
    },
    {
      title: intl.formatMessage({ id: 'models.form.source' }),
      dataIndex: 'source',
      width: 120
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.revision' }),
      dataIndex: 'resolved_revision',
      ellipsis: true
    },
    {
      title: intl.formatMessage({ id: 'common.table.status' }),
      dataIndex: 'manifest_state',
      width: 110,
      render: (value: string) => (
        <Tag
          color={
            value === 'valid'
              ? 'success'
              : value === 'invalid'
                ? 'error'
                : 'warning'
          }
        >
          {intl.formatMessage({ id: `resources.preheat.state.${value}` })}
        </Tag>
      )
    },
    {
      title: intl.formatMessage({ id: 'resources.modelfiles.size' }),
      dataIndex: 'total_size',
      width: 120,
      render: (value: number) => convertFileSize(value, 1, true)
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.fileCount' }),
      dataIndex: 'file_count',
      width: 100
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.lastVerified' }),
      dataIndex: 'last_verified_at',
      width: 170,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss')
    }
  ];

  return (
    <>
      {profilesError && (
        <Alert
          type="error"
          showIcon
          message={intl.formatMessage({
            id: 'resources.preheat.dependencies.loadFailed'
          })}
          action={
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={profilesLoading}
              onClick={() => {
                void loadProfiles();
              }}
            >
              {intl.formatMessage({ id: 'common.button.retry' })}
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}
      <Space
        wrap
        style={{
          width: '100%',
          justifyContent: 'space-between',
          marginBottom: 16
        }}
      >
        <Space wrap>
          <Select
            style={{ width: 220 }}
            loading={profilesLoading}
            value={profileId}
            placeholder={intl.formatMessage({
              id: 'resources.preheat.profile.select'
            })}
            options={profiles.map((profile) => ({
              label: profile.name,
              value: profile.id
            }))}
            onChange={(value) => {
              setProfileId(value);
              setScopedJob((current) =>
                current?.profileId === value ? current : null
              );
              resetPaging();
            }}
          />
          <Select
            allowClear
            style={{ width: 150 }}
            value={manifestState}
            placeholder={intl.formatMessage({ id: 'common.table.status' })}
            options={['valid', 'missing', 'invalid'].map((value) => ({
              value,
              label: intl.formatMessage({
                id: `resources.preheat.state.${value}`
              })
            }))}
            onChange={(value) => {
              setManifestState(value);
              resetPaging();
            }}
          />
          <Select
            allowClear
            style={{ width: 150 }}
            value={source}
            placeholder={intl.formatMessage({ id: 'models.form.source' })}
            options={[
              { label: 'Hugging Face', value: 'huggingface' },
              { label: 'ModelScope', value: 'modelscope' }
            ]}
            onChange={(value) => {
              setSource(value);
              resetPaging();
            }}
          />
        </Space>
        <Space>
          {job && (
            <Typography.Text
              type={job.state === 'error' ? 'danger' : 'secondary'}
            >
              {intl.formatMessage({
                id: `resources.preheat.state.${job.state}`
              })}
              {` · ${job.scanned_count}`}
            </Typography.Text>
          )}
          <Button
            icon={<CloudSyncOutlined />}
            disabled={
              !profileId ||
              Boolean(job && ['pending', 'running'].includes(job.state))
            }
            onClick={() => setConfirm('refresh')}
          >
            {intl.formatMessage({ id: 'resources.preheat.inventory.refresh' })}
          </Button>
          <Button
            danger
            icon={<ClearOutlined />}
            disabled={
              !profileId ||
              Boolean(job && ['pending', 'running'].includes(job.state))
            }
            onClick={() => setConfirm('gc')}
          >
            {intl.formatMessage({ id: 'resources.preheat.inventory.gc' })}
          </Button>
        </Space>
      </Space>
      <Table
        rowKey="cache_key"
        columns={columns}
        dataSource={models}
        loading={loading}
        pagination={false}
        scroll={{ x: 900 }}
        expandable={{
          expandedRowRender: renderExpandedModel
        }}
      />
      <Space
        style={{ width: '100%', justifyContent: 'flex-end', marginTop: 16 }}
      >
        <Button
          icon={<LeftOutlined />}
          disabled={pageIndex === 0}
          onClick={() => {
            modelRequests.current.invalidate();
            setPageIndex((value) => value - 1);
          }}
        />
        <span>{pageIndex + 1}</span>
        <Button
          icon={<RightOutlined />}
          disabled={!nextCursor}
          onClick={() => {
            if (!nextCursor) return;
            modelRequests.current.invalidate();
            setCursors((current) => {
              const next = current.slice(0, pageIndex + 1);
              next.push(nextCursor);
              return next;
            });
            setPageIndex((value) => value + 1);
          }}
        />
      </Space>
      <ModelPreheatConfirmModal
        open={Boolean(confirm)}
        title={intl.formatMessage({
          id:
            confirm === 'gc'
              ? 'resources.preheat.inventory.gcConfirm'
              : 'resources.preheat.inventory.refreshConfirm'
        })}
        content={intl.formatMessage({
          id:
            confirm === 'gc'
              ? 'resources.preheat.inventory.gcContent'
              : 'resources.preheat.inventory.refreshContent'
        })}
        okText={intl.formatMessage({
          id:
            confirm === 'gc'
              ? 'resources.preheat.inventory.gc'
              : 'resources.preheat.inventory.refresh'
        })}
        danger={confirm === 'gc'}
        loading={confirmLoading}
        onOk={runInventory}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
};

export default ModelPreheatS3Models;
