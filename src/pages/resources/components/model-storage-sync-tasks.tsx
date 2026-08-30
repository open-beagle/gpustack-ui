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
  extractModelStorageErrorCode,
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
  const selectedTaskKeysRef = useRef<React.Key[]>([]);
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
  const [selectedTaskKeys, setSelectedTaskKeys] = useState<React.Key[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<ModelStorageSyncTask[]>(
    []
  );
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);
  const [batchFailures, setBatchFailures] = useState<
    Array<{ task: ModelStorageSyncTask; errorCode: string }>
  >([]);
  const [batchAttemptTotal, setBatchAttemptTotal] = useState(0);
  selectedTaskKeysRef.current = selectedTaskKeys;
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
      | 'source_worker_id'
      | 'worker_id'
      | 'worker_uuid'
      | 'source_worker_name'
      | 'source_worker_ip'
    >
  ) => {
    const workerId = task.source_worker_id || task.worker_id;
    const primary =
      task.source_worker_name ||
      task.source_worker_ip ||
      (workerId ? `Worker #${workerId}` : '') ||
      task.worker_uuid ||
      '-';
    const secondary =
      task.source_worker_name && task.source_worker_ip
        ? task.source_worker_ip
        : '';
    return (
      <Tooltip title={task.worker_uuid || primary}>
        <Space direction="vertical" size={0}>
          <Typography.Text>{primary}</Typography.Text>
          {secondary && (
            <Typography.Text type="secondary">{secondary}</Typography.Text>
          )}
        </Space>
      </Tooltip>
    );
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
          setSelectedTasks((current) => {
            const selectedSet = new Set(
              selectedTaskKeysRef.current.map(Number)
            );
            const records = new Map(
              current
                .filter((item) => selectedSet.has(item.id))
                .map((item) => [item.id, item])
            );
            result.items
              .filter((item) => selectedSet.has(item.id))
              .forEach((item) => records.set(item.id, item));
            return Array.from(records.values());
          });
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

  const removeBatch = async () => {
    if (!selectedTasks.length || submitting) return;
    const targetKeys = new Set(selectedTaskKeys.map(Number));
    const targets = selectedTasks.filter((task) => targetKeys.has(task.id));
    setSubmitting(true);
    setBatchFailures([]);
    setBatchAttemptTotal(targets.length);
    try {
      const settled = await Promise.allSettled(
        targets.map((task) => deleteModelStorageSyncTask(task.id))
      );
      const succeededIds: number[] = [];
      const failures: Array<{
        task: ModelStorageSyncTask;
        errorCode: string;
      }> = [];
      settled.forEach((result, index) => {
        const task = targets[index];
        if (result.status === 'fulfilled') succeededIds.push(task.id);
        else
          failures.push({
            task,
            errorCode: extractModelStorageErrorCode(result.reason) || 'unknown'
          });
      });
      const succeededSet = new Set(succeededIds);
      const remainingKeys = selectedTaskKeysRef.current.filter(
        (key) => !succeededSet.has(Number(key))
      );
      selectedTaskKeysRef.current = remainingKeys;
      setSelectedTaskKeys(remainingKeys);
      setSelectedTasks((items) =>
        items.filter((item) => !succeededSet.has(item.id))
      );
      setBatchFailures(failures);
      setBatchConfirmOpen(false);
      if (succeededIds.length)
        message.success(intl.formatMessage({ id: 'common.message.success' }));
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCancellableCount = selectedTasks.filter((task) =>
    cancellableStates.has(task.state)
  ).length;
  const selectedTerminalCount = selectedTasks.filter((task) =>
    terminalStates.has(task.state)
  ).length;

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
  const detailFailure = detail?.error_code
    ? getModelStorageErrorPresentation(detail.error_code)
    : null;
  const detailStateMessage =
    detail?.state_message && detail.state_message !== detail.error_code
      ? detail.state_message
      : null;

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
        <Typography.Text>
          {intl.formatMessage(
            { id: 'resources.storage.syncTask.batch.selectedCount' },
            { count: selectedTaskKeys.length }
          )}
        </Typography.Text>
        <Button
          danger
          icon={<DeleteOutlined />}
          disabled={!selectedTaskKeys.length}
          onClick={() => {
            setBatchFailures([]);
            setBatchConfirmOpen(true);
          }}
        >
          {intl.formatMessage({
            id: 'resources.storage.syncTask.batch.action'
          })}
        </Button>
      </Space>
      {batchFailures.length > 0 && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message={intl.formatMessage(
            { id: 'resources.storage.syncTask.batch.failedSummary' },
            {
              failed: batchFailures.length,
              total: batchAttemptTotal
            }
          )}
          description={
            <Space direction="vertical" size={0}>
              {batchFailures.map(({ task, errorCode }) => {
                const presentation =
                  getModelStorageErrorPresentation(errorCode);
                return (
                  <Typography.Text key={task.id}>
                    #{task.id}:{' '}
                    {intl.formatMessage({ id: presentation.messageId })}
                  </Typography.Text>
                );
              })}
            </Space>
          }
        />
      )}
      <Table
        rowKey="id"
        loading={loading}
        dataSource={tasks}
        scroll={{ x: 1600 }}
        rowSelection={{
          selectedRowKeys: selectedTaskKeys,
          preserveSelectedRowKeys: true,
          getCheckboxProps: (task) => ({
            disabled:
              !cancellableStates.has(task.state) &&
              !terminalStates.has(task.state)
          }),
          onChange: (keys, rows) => {
            const keySet = new Set(keys.map(Number));
            const records = new Map(
              selectedTasks
                .filter((item) => keySet.has(item.id))
                .map((item) => [item.id, item])
            );
            rows.forEach((item) => records.set(item.id, item));
            selectedTaskKeysRef.current = keys;
            setSelectedTaskKeys(keys);
            setSelectedTasks(Array.from(records.values()));
          }
        }}
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
                          policy_tab: 'distribution',
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
          showTotal: (value) =>
            intl.formatMessage(
              { id: 'resources.storage.pagination.total' },
              { total: value }
            ),
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
              label={intl.formatMessage({ id: 'resources.storage.model' })}
            >
              {detail?.model_id || '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'resources.storage.modelSource'
              })}
            >
              {detail ? getModelStorageSourceLabel(detail.source) : '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({ id: 'resources.storage.artifactId' })}
            >
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
              {detailStateMessage || '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'resources.storage.syncTask.errorCode'
              })}
            >
              {detailFailure && detail?.error_code ? (
                <Space direction="vertical" size={2}>
                  <Typography.Text strong>
                    {intl.formatMessage({
                      id: detailFailure.messageId,
                      defaultMessage: detail.error_code
                    })}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    {intl.formatMessage({ id: detailFailure.actionHintId })}
                  </Typography.Text>
                  <Typography.Text code copyable={{ text: detail.error_code }}>
                    {detail.error_code}
                  </Typography.Text>
                </Space>
              ) : (
                '-'
              )}
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
      <ModelPreheatConfirmModal
        open={batchConfirmOpen}
        title={intl.formatMessage({
          id: 'resources.storage.syncTask.batch.confirmTitle'
        })}
        content={
          <Space direction="vertical" size={4}>
            <Typography.Text>
              {intl.formatMessage(
                { id: 'resources.storage.syncTask.batch.confirmContent' },
                { total: selectedTaskKeys.length }
              )}
            </Typography.Text>
            <Typography.Text>
              {intl.formatMessage(
                { id: 'resources.storage.syncTask.batch.confirmCounts' },
                {
                  cancel: selectedCancellableCount,
                  delete: selectedTerminalCount
                }
              )}
            </Typography.Text>
          </Space>
        }
        okText={intl.formatMessage({
          id: 'resources.storage.syncTask.batch.action'
        })}
        danger
        loading={submitting}
        onOk={removeBatch}
        onCancel={() => setBatchConfirmOpen(false)}
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
