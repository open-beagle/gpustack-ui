import {
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
  StopOutlined
} from '@ant-design/icons';
import { useIntl, useNavigate } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  message,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import dayjs from 'dayjs';
import numeral from 'numeral';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteModelStorageSyncTask,
  queryModelStorageSyncTask,
  queryModelStorageSyncTasks
} from '../apis';
import {
  getModelStorageErrorPresentation,
  getModelStorageRevisionPresentation,
  getModelStorageSourceLabel,
  getModelStorageTaskStatusPresentation,
  LatestRequestGate
} from '../config/model-preheat';
import type {
  ModelStorageSyncTask,
  ModelStorageSyncTaskDetail
} from '../config/types';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';
import ModelStorageSyncBatchModal from './model-storage-sync-batch-modal';

type TaskAction = 'cancel' | 'delete';

const cancellableStates = new Set(['pending', 'scanning', 'publishing']);
const terminalStates = new Set(['ready', 'error', 'canceled']);

const ModelStorageSyncTasks: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const taskRequests = useRef(new LatestRequestGate());
  const detailRequests = useRef(new LatestRequestGate());
  const [tasks, setTasks] = useState<ModelStorageSyncTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<{
    action: TaskAction;
    task: ModelStorageSyncTask;
  } | null>(null);
  const [detail, setDetail] = useState<ModelStorageSyncTaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTask, setDetailTask] = useState<ModelStorageSyncTask | null>(
    null
  );
  const [detailError, setDetailError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const profileDestination = (task: ModelStorageSyncTask) => {
    if (!task.profile_name || !task.profile_bucket) {
      return `S3 Profile #${task.profile_id} · v${task.profile_config_version}`;
    }
    const prefix = task.profile_prefix
      ? `/${task.profile_prefix.replace(/^\/+|\/+$/g, '')}`
      : '';
    return `${task.profile_name} · ${task.profile_bucket}${prefix}`;
  };

  const detailProfileDestination = (task: ModelStorageSyncTaskDetail) => {
    const profile = task.profile;
    if (!profile?.name || !profile.bucket) {
      return `S3 Profile #${profile?.id || task.transfer_profile_id || '-'} · v${task.profile_config_version}`;
    }
    const prefix = profile.prefix
      ? `/${profile.prefix.replace(/^\/+|\/+$/g, '')}`
      : '';
    return `${profile.name} · ${profile.bucket}${prefix}`;
  };

  const sourceWorker = (
    task: Pick<
      ModelStorageSyncTask,
      'source_worker_id' | 'worker_id' | 'source_worker_name'
    >
  ) => {
    const workerId = task.source_worker_id || task.worker_id;
    return task.source_worker_name || `Worker #${workerId}`;
  };

  const load = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      return taskRequests.current.run(
        () => queryModelStorageSyncTasks({ page, perPage: pageSize }),
        (result) => {
          setTasks(result.items);
          setTotal(result.pagination.total);
          setLoadError(false);
        },
        () => setLoading(false)
      );
    },
    [page, pageSize]
  );

  useEffect(() => {
    void load().catch(() => setLoadError(true));
  }, [load]);

  useEffect(() => {
    if (!tasks.some((task) => cancellableStates.has(task.state))) return;
    const timer = window.setInterval(() => {
      void load(false).catch(() => setLoadError(true));
    }, 3000);
    return () => window.clearInterval(timer);
  }, [load, tasks]);

  const openDetail = async (task: ModelStorageSyncTask) => {
    setDetailTask(task);
    setDetailLoading(true);
    setDetailError(false);
    return detailRequests.current.run(
      () => queryModelStorageSyncTask(task.id),
      setDetail,
      () => setDetailLoading(false)
    );
  };

  const remove = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await deleteModelStorageSyncTask(selected.task.id);
      setSelected(null);
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const confirmMessage =
    selected?.action === 'cancel'
      ? 'resources.storage.cancelSync'
      : 'resources.storage.deleteSync';
  const confirmTitle =
    selected?.action === 'cancel'
      ? 'resources.storage.cancelSyncConfirm'
      : 'resources.storage.deleteSyncConfirm';
  const confirmContent =
    selected?.action === 'cancel'
      ? 'resources.storage.cancelSyncContent'
      : 'resources.storage.deleteSyncContent';

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => void load().catch(() => setLoadError(true))}
        >
          {intl.formatMessage({ id: 'common.button.refresh' })}
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setBatchOpen(true)}
        >
          {intl.formatMessage({ id: 'resources.storage.syncBatch.create' })}
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={tasks}
        scroll={{ x: 1600 }}
        columns={[
          {
            title: intl.formatMessage({ id: 'resources.storage.model' }),
            dataIndex: 'model_id',
            width: 230
          },
          {
            title: intl.formatMessage({ id: 'resources.storage.version' }),
            dataIndex: 'resolved_revision',
            width: 130,
            render: (revision: string | null) => {
              const value = getModelStorageRevisionPresentation(revision);
              return <Tooltip title={value.full}>{value.short}</Tooltip>;
            }
          },
          {
            title: intl.formatMessage({ id: 'resources.storage.modelSource' }),
            dataIndex: 'source',
            width: 130,
            render: (source: ModelStorageSyncTask['source']) =>
              getModelStorageSourceLabel(source)
          },
          {
            title: intl.formatMessage({ id: 'resources.storage.fileCount' }),
            width: 100,
            render: (_: unknown, task: ModelStorageSyncTask) => task.file_count
          },
          {
            title: intl.formatMessage({ id: 'resources.storage.createdAt' }),
            width: 180,
            render: (_: unknown, task: ModelStorageSyncTask) =>
              dayjs(task.created_at).format('YYYY-MM-DD HH:mm:ss')
          },
          {
            title: intl.formatMessage({ id: 'resources.storage.startedAt' }),
            width: 180,
            render: (_: unknown, task: ModelStorageSyncTask) =>
              task.started_at
                ? dayjs(task.started_at).format('YYYY-MM-DD HH:mm:ss')
                : '-'
          },
          {
            title: intl.formatMessage({ id: 'resources.storage.finishedAt' }),
            width: 180,
            render: (_: unknown, task: ModelStorageSyncTask) =>
              task.finished_at
                ? dayjs(task.finished_at).format('YYYY-MM-DD HH:mm:ss')
                : '-'
          },
          {
            title: intl.formatMessage({
              id: 'resources.storage.syncTask.from'
            }),
            width: 160,
            render: (_: unknown, task: ModelStorageSyncTask) =>
              sourceWorker(task)
          },
          {
            title: intl.formatMessage({ id: 'resources.storage.syncTask.to' }),
            width: 280,
            render: (_: unknown, task: ModelStorageSyncTask) =>
              profileDestination(task)
          },
          {
            title: intl.formatMessage({ id: 'common.table.status' }),
            dataIndex: 'state',
            width: 130,
            render: (state: ModelStorageSyncTask['state']) => (
              <Tag
                color={
                  state === 'ready'
                    ? 'success'
                    : state === 'error'
                      ? 'error'
                      : state === 'canceled'
                        ? 'default'
                        : 'processing'
                }
              >
                {intl.formatMessage({
                  id: getModelStorageTaskStatusPresentation(state).messageId
                })}
              </Tag>
            )
          },
          {
            title: intl.formatMessage({ id: 'common.table.operation' }),
            width: 140,
            fixed: 'right' as const,
            render: (_: unknown, task: ModelStorageSyncTask) => (
              <Space size={4}>
                <Tooltip
                  title={intl.formatMessage({ id: 'common.button.detail' })}
                >
                  <Button
                    type="text"
                    icon={<EyeOutlined />}
                    aria-label={intl.formatMessage({
                      id: 'common.button.detail'
                    })}
                    onClick={() =>
                      void openDetail(task).catch(() => setDetailError(true))
                    }
                  />
                </Tooltip>
                {task.state === 'ready' && (
                  <Tooltip
                    title={intl.formatMessage({
                      id: 'resources.storage.createStrategy'
                    })}
                  >
                    <Button
                      type="text"
                      icon={<SendOutlined />}
                      aria-label={intl.formatMessage({
                        id: 'resources.storage.createStrategy'
                      })}
                      onClick={() => {
                        const query = new URLSearchParams({
                          tab: 'policies',
                          strategy: 'create',
                          sync_task: String(task.id)
                        });
                        navigate(`/resources/modelfiles?${query.toString()}`);
                      }}
                    />
                  </Tooltip>
                )}
                {cancellableStates.has(task.state) && (
                  <Tooltip
                    title={intl.formatMessage({
                      id: 'resources.storage.cancelSync'
                    })}
                  >
                    <Button
                      danger
                      type="text"
                      icon={<StopOutlined />}
                      aria-label={intl.formatMessage({
                        id: 'resources.storage.cancelSync'
                      })}
                      onClick={() => setSelected({ action: 'cancel', task })}
                    />
                  </Tooltip>
                )}
                {terminalStates.has(task.state) && (
                  <Tooltip
                    title={intl.formatMessage({
                      id: 'resources.storage.deleteSync'
                    })}
                  >
                    <Button
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      aria-label={intl.formatMessage({
                        id: 'resources.storage.deleteSync'
                      })}
                      onClick={() => setSelected({ action: 'delete', task })}
                    />
                  </Tooltip>
                )}
              </Space>
            )
          }
        ]}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (nextPage, nextPageSize) => {
            taskRequests.current.invalidate();
            setPage(nextPageSize === pageSize ? nextPage : 1);
            setPageSize(nextPageSize);
          }
        }}
      />
      {loadError && (
        <Alert
          type="error"
          showIcon
          style={{ marginTop: 12 }}
          message={intl.formatMessage({ id: 'resources.storage.state.error' })}
          action={
            <Button
              size="small"
              onClick={() => void load().catch(() => setLoadError(true))}
            >
              {intl.formatMessage({ id: 'common.button.retry' })}
            </Button>
          }
        />
      )}
      <Modal
        open={Boolean(detailTask)}
        centered
        maskClosable={false}
        onCancel={() => {
          detailRequests.current.invalidate();
          setDetail(null);
          setDetailTask(null);
          setDetailError(false);
        }}
        footer={null}
        title={intl.formatMessage({ id: 'resources.storage.syncTaskDetail' })}
      >
        {detailError && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={intl.formatMessage({
              id: 'resources.storage.state.error'
            })}
            action={
              <Button
                size="small"
                onClick={() =>
                  detailTask &&
                  void openDetail(detailTask).catch(() => setDetailError(true))
                }
              >
                {intl.formatMessage({ id: 'common.button.retry' })}
              </Button>
            }
          />
        )}
        {detailLoading ? (
          <Typography.Text>...</Typography.Text>
        ) : (
          <Descriptions column={1} size="small">
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'resources.storage.modelSource'
              })}
            >
              {detail ? getModelStorageSourceLabel(detail.source) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Artifact ID">
              <Typography.Text copyable={Boolean(detail?.artifact_id)}>
                {detail?.artifact_id || '-'}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({ id: 'resources.storage.fileCount' })}
            >
              {detail?.file_count ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({ id: 'resources.storage.totalSize' })}
            >
              {detail ? numeral(detail.total_size).format('0.00 b') : '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({ id: 'resources.storage.createdAt' })}
            >
              {detail?.created_at
                ? dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({ id: 'resources.storage.startedAt' })}
            >
              {detail?.started_at
                ? dayjs(detail.started_at).format('YYYY-MM-DD HH:mm:ss')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({ id: 'resources.storage.finishedAt' })}
            >
              {detail?.finished_at
                ? dayjs(detail.finished_at).format('YYYY-MM-DD HH:mm:ss')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'resources.storage.syncTask.from'
              })}
            >
              {detail ? sourceWorker(detail) : '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'resources.storage.syncTask.to'
              })}
            >
              {detail ? detailProfileDestination(detail) : '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({ id: 'common.table.status' })}
            >
              {detail
                ? intl.formatMessage({
                    id: getModelStorageTaskStatusPresentation(detail.state)
                      .messageId
                  })
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'resources.storage.stateMessage'
              })}
            >
              {detail?.state_message || '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'resources.storage.syncTask.errorCode'
              })}
            >
              {detail?.error_code
                ? intl.formatMessage({
                    id: getModelStorageErrorPresentation(detail.error_code)
                      .messageId,
                    defaultMessage: detail.error_code
                  })
                : '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
      <ModelPreheatConfirmModal
        open={Boolean(selected)}
        title={intl.formatMessage({ id: confirmTitle })}
        content={intl.formatMessage(
          { id: confirmContent },
          { id: selected?.task.id || '' }
        )}
        okText={intl.formatMessage({ id: confirmMessage })}
        danger
        loading={submitting}
        onOk={remove}
        onCancel={() => setSelected(null)}
      />
      <ModelStorageSyncBatchModal
        open={batchOpen}
        onCancel={() => setBatchOpen(false)}
        onTasksChanged={() => void load().catch(() => setLoadError(true))}
      />
    </>
  );
};

export default ModelStorageSyncTasks;
