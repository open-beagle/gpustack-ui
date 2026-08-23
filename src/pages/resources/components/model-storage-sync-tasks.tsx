import {
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined
} from '@ant-design/icons';
import { useIntl, useNavigate } from '@umijs/max';
import {
  Button,
  Descriptions,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message
} from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteModelStorageSyncTask,
  queryModelStorageSyncTask,
  queryModelStorageSyncTasks
} from '../apis';
import { LatestRequestGate } from '../config/model-preheat';
import type {
  ModelStorageSyncTask,
  ModelStorageSyncTaskDetail
} from '../config/types';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';
import ModelStorageSyncBatchModal from './model-storage-sync-batch-modal';

type TaskAction = 'cancel' | 'delete';

const cancellableStates = new Set(['pending', 'scanning', 'publishing']);
const terminalStates = new Set(['ready', 'error', 'canceled']);

const syncTime = (
  task: Pick<
    ModelStorageSyncTask,
    'started_at' | 'finished_at' | 'updated_at' | 'created_at'
  >
) => task.finished_at || task.started_at || task.updated_at || task.created_at;

const ModelStorageSyncTasks: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const taskRequests = useRef(new LatestRequestGate());
  const [tasks, setTasks] = useState<ModelStorageSyncTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{
    action: TaskAction;
    task: ModelStorageSyncTask;
  } | null>(null);
  const [detail, setDetail] = useState<ModelStorageSyncTaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);

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

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    return taskRequests.current.run(
      () => queryModelStorageSyncTasks({ page: 1, perPage: 100 }),
      (result) => setTasks(result.items),
      () => setLoading(false)
    );
  }, []);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  useEffect(() => {
    if (!tasks.some((task) => cancellableStates.has(task.state))) return;
    const timer = window.setInterval(() => {
      void load(false).catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [load, tasks]);

  const openDetail = async (task: ModelStorageSyncTask) => {
    setDetailLoading(true);
    try {
      setDetail(await queryModelStorageSyncTask(task.id));
    } finally {
      setDetailLoading(false);
    }
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
          onClick={() => void load()}
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
        scroll={{ x: 1120 }}
        columns={[
          {
            title: intl.formatMessage({ id: 'resources.storage.model' }),
            dataIndex: 'model_id',
            width: 230
          },
          {
            title: intl.formatMessage({
              id: 'resources.storage.syncTask.time'
            }),
            width: 180,
            render: (_: unknown, task: ModelStorageSyncTask) =>
              dayjs(syncTime(task)).format('YYYY-MM-DD HH:mm:ss')
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
                  id: `resources.storage.syncTask.state.${state}`
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
                    onClick={() => void openDetail(task)}
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
                          source: task.source,
                          model: task.model_id,
                          revision: task.resolved_revision,
                          profile: String(task.profile_id)
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
                      icon={<DeleteOutlined />}
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
      />
      <Modal
        open={Boolean(detail) || detailLoading}
        centered
        maskClosable={false}
        onCancel={() => setDetail(null)}
        footer={null}
        title={intl.formatMessage({ id: 'resources.storage.syncTaskDetail' })}
      >
        {detailLoading ? (
          <Typography.Text>...</Typography.Text>
        ) : (
          <Descriptions column={1} size="small">
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'resources.storage.modelSource'
              })}
            >
              {detail?.source || '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'resources.storage.syncTask.time'
              })}
            >
              {detail
                ? dayjs(syncTime(detail)).format('YYYY-MM-DD HH:mm:ss')
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
                    id: `resources.storage.syncTask.state.${detail.state}`
                  })
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'resources.storage.syncTask.errorCode'
              })}
            >
              {detail?.error_code
                ? intl.formatMessage({
                    id: `resources.storage.syncTask.error.${detail.error_code}`,
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
        onTasksChanged={() => void load()}
      />
    </>
  );
};

export default ModelStorageSyncTasks;
