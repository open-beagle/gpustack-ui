import {
  DeleteOutlined,
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  RedoOutlined,
  ReloadOutlined,
  StopOutlined
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  Modal,
  Progress,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message
} from 'antd';
import dayjs from 'dayjs';
import numeral from 'numeral';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteModelPreheatTask,
  queryModelPreheatS3Profiles,
  queryModelPreheatTask,
  queryModelPreheatTasks,
  queryWorkersList,
  runModelPreheatTaskAction
} from '../apis';
import {
  LatestRequestGate,
  getModelPreheatTaskActions,
  getModelStorageErrorPresentation,
  getModelStorageFlowPresentation,
  getModelStorageRevisionPresentation,
  getModelStorageSourceLabel,
  getModelStorageTaskStatusPresentation,
  getModelStorageTransferPresentation,
  type ModelPreheatTaskAction
} from '../config/model-preheat';
import type {
  ModelPreheatTargetSnapshot,
  ModelPreheatTask,
  ModelPreheatWorkerTask
} from '../config/types';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';
import ModelPreheatModal from './model-preheat-modal';

const statusColors: Record<string, string> = {
  pending: 'processing',
  resolving: 'processing',
  scanning: 'processing',
  staging: 'processing',
  publishing: 'processing',
  distributing: 'processing',
  paused: 'warning',
  ready: 'success',
  partial: 'warning',
  error: 'error',
  canceled: 'default'
};

const actionIcons: Record<ModelPreheatTaskAction, React.ReactNode> = {
  pause: <PauseCircleOutlined />,
  resume: <PlayCircleOutlined />,
  cancel: <StopOutlined />,
  retry: <RedoOutlined />
};

type PreheatTaskAction = ModelPreheatTaskAction | 'delete';

const terminalStates = new Set(['ready', 'partial', 'error', 'canceled']);

const ModelPreheatTasks: React.FC = () => {
  const intl = useIntl();
  const taskRequests = useRef(new LatestRequestGate());
  const detailRequests = useRef(new LatestRequestGate());
  const shouldPollTasks = useRef(true);
  const pollingTimer = useRef<number>();
  const pollingRunning = useRef(false);
  const pollingRestartRequested = useRef(false);
  const pollingMounted = useRef(false);
  const pollingGeneration = useRef(0);
  const [tasks, setTasks] = useState<ModelPreheatTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<ModelPreheatTask | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [detailPollGeneration, setDetailPollGeneration] = useState(0);
  const [confirm, setConfirm] = useState<{
    task: ModelPreheatTask;
    action: PreheatTaskAction;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [profileNames, setProfileNames] = useState<Record<number, string>>({});
  const [workerNames, setWorkerNames] = useState<Record<number, string>>({});
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    void Promise.all([
      queryModelPreheatS3Profiles({ page: 1, perPage: 100 }),
      queryWorkersList({ page: 1, perPage: 100 })
    ])
      .then(([profilePage, workerPage]) => {
        setProfileNames(
          Object.fromEntries(
            profilePage.items.map((profile) => [profile.id, profile.name])
          )
        );
        setWorkerNames(
          Object.fromEntries(
            workerPage.items.map((worker) => [worker.id, worker.name])
          )
        );
      })
      .catch(() => undefined);
  }, []);

  const formatTransferMethod = (task: ModelPreheatTask | null) => {
    const presentation = getModelStorageTransferPresentation(
      task?.transfer_source || null
    );
    return intl.formatMessage(
      { id: presentation.messageId },
      {
        worker: presentation.includeWorker
          ? workerNames[task?.source_worker_id || 0] ||
            `Worker #${task?.source_worker_id || '-'}`
          : '',
        profile: presentation.includeProfile
          ? profileNames[task?.transfer_profile_id || 0] ||
            `Profile #${task?.transfer_profile_id || '-'}`
          : ''
      }
    );
  };

  const loadTasks = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      return taskRequests.current.run(
        () => queryModelPreheatTasks({ page, perPage: pageSize }),
        (result) => {
          setTasks(result.items);
          setTotal(result.pagination.total);
          setLoadError(false);
          // 低频轮询用于发现定时策略新建的任务；活动任务期间切高频。
          shouldPollTasks.current =
            result.items.length === 0 ||
            result.items.some(
              (task) =>
                !['ready', 'partial', 'error', 'canceled'].includes(
                  task.execution_state
                )
            );
        },
        () => setLoading(false)
      );
    },
    [page, pageSize]
  );

  const clearPollingTimer = useCallback(() => {
    if (pollingTimer.current !== undefined) {
      window.clearTimeout(pollingTimer.current);
      pollingTimer.current = undefined;
    }
  }, []);

  const startPolling = useCallback(
    async (silent = false) => {
      clearPollingTimer();
      const generation = ++pollingGeneration.current;
      if (!pollingMounted.current) return;
      if (pollingRunning.current) {
        pollingRestartRequested.current = true;
        return;
      }
      pollingRunning.current = true;
      try {
        await loadTasks(silent);
      } catch {
        setLoadError(true);
      } finally {
        pollingRunning.current = false;
      }
      if (!pollingMounted.current) return;
      if (pollingRestartRequested.current) {
        pollingRestartRequested.current = false;
        void startPolling(false);
        return;
      }
      if (generation !== pollingGeneration.current) return;
      pollingTimer.current = window.setTimeout(
        () => void startPolling(true),
        shouldPollTasks.current ? 5000 : 15000
      );
    },
    [clearPollingTimer, loadTasks]
  );

  useEffect(() => {
    pollingMounted.current = true;
    void startPolling(false);
    return () => {
      pollingMounted.current = false;
      pollingGeneration.current += 1;
      pollingRestartRequested.current = false;
      clearPollingTimer();
    };
  }, [clearPollingTimer, startPolling]);

  useEffect(
    () => () => {
      taskRequests.current.invalidate();
      detailRequests.current.invalidate();
    },
    []
  );

  const openDetail = async (task: ModelPreheatTask) => {
    setDetail(task);
    setDetailLoading(task.id !== detail?.id);
    setDetailError(false);
    setDetailPollGeneration((generation) => generation + 1);
    return detailRequests.current.run(
      () => queryModelPreheatTask(task.id),
      setDetail,
      () => setDetailLoading(false)
    );
  };

  useEffect(() => {
    if (!detail || detailLoading || terminalStates.has(detail.execution_state)) return;
    let disposed = false;
    const timer = window.setTimeout(() => {
      detailRequests.current
        .run(
          () => queryModelPreheatTask(detail.id),
          (next) => {
            if (!disposed) {
              setDetail(next);
              setDetailError(false);
              if (!terminalStates.has(next.execution_state)) {
                setDetailPollGeneration((generation) => generation + 1);
              }
            }
          },
          () => undefined
        )
        .catch(() => {
          if (!disposed) {
            setDetailError(true);
            setDetailPollGeneration((generation) => generation + 1);
          }
        });
    }, 3000);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
  }, [
    detail?.id,
    detail?.execution_state,
    detail?.updated_at,
    detailLoading,
    detailPollGeneration
  ]);

  const handleAction = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      if (confirm.action === 'delete') {
        await deleteModelPreheatTask(confirm.task.id);
        setConfirm(null);
        if (detail?.id === confirm.task.id) setDetail(null);
        message.success(intl.formatMessage({ id: 'common.message.success' }));
        await startPolling(false);
        return;
      }
      const task = await runModelPreheatTaskAction(
        confirm.task.id,
        confirm.action
      );
      setConfirm(null);
      if (detail?.id === task.id) setDetail(task);
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      await startPolling(false);
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      title: intl.formatMessage({ id: 'resources.preheat.model' }),
      dataIndex: 'model_id',
      width: 280,
      fixed: 'left' as const,
      render: (value: string, task: ModelPreheatTask) => {
        const revision = getModelStorageRevisionPresentation(task.resolved_revision);
        return (
          <Space direction="vertical" size={0} style={{ maxWidth: 248 }}>
            <Typography.Text ellipsis={{ tooltip: value }}>{value}</Typography.Text>
            <Tooltip title={revision.full}>
              <Typography.Text type="secondary">
                {intl.formatMessage({ id: 'resources.preheat.revision' })}:{' '}
                {revision.short}
              </Typography.Text>
            </Tooltip>
          </Space>
        );
      }
    },
    {
      title: intl.formatMessage({ id: 'resources.storage.modelSource' }),
      dataIndex: 'source',
      width: 130,
      render: (source: ModelPreheatTask['source']) =>
        getModelStorageSourceLabel(
          source as 'modelscope' | 'huggingface' | 'ollama_library'
        )
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.confirm.flow' }),
      width: 240,
      render: (_: unknown, task: ModelPreheatTask) => {
        const source = workerNames[task.source_worker_id || 0] || '';
        const profile =
          profileNames[task.transfer_profile_id || task.s3_profile_id] ||
          `Profile #${task.s3_profile_id}`;
        const flow = getModelStorageFlowPresentation(
          source,
          profile,
          task.delivery_mode === 's3_and_workers'
            ? `${task.target_worker_uuids.length}`
            : undefined
        );
        return intl.formatMessage({ id: flow.messageId }, flow.values);
      }
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.nodeCount' }),
      width: 100,
      render: (_: unknown, task: ModelPreheatTask) =>
        task.delivery_mode === 's3_only'
          ? 'S3'
          : `${task.target_worker_uuids.length}`
    },
    {
      title: intl.formatMessage({ id: 'common.table.status' }),
      dataIndex: 'execution_state',
      width: 120,
      render: (value: string | null) => {
        const status = getModelStorageTaskStatusPresentation(value);
        return (
          <Tag color={statusColors[value || 'unknown']}>
            {intl.formatMessage({ id: status.messageId })}
          </Tag>
        );
      }
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.attempt' }),
      dataIndex: 'attempt',
      width: 90
    },
    {
      title: intl.formatMessage({ id: 'common.table.createTime' }),
      dataIndex: 'created_at',
      width: 170,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: intl.formatMessage({ id: 'resources.storage.startedAt' }),
      dataIndex: 'started_at',
      width: 170,
      render: (value: string | null | undefined) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: intl.formatMessage({ id: 'resources.storage.finishedAt' }),
      dataIndex: 'finished_at',
      width: 170,
      render: (value: string | null | undefined) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: intl.formatMessage({ id: 'common.table.operation' }),
      key: 'operation',
      width: 180,
      render: (_: unknown, task: ModelPreheatTask) => (
        <Space size={4}>
          <Tooltip title={intl.formatMessage({ id: 'common.button.detail' })}>
            <Button
              type="text"
              icon={<EyeOutlined />}
              aria-label={intl.formatMessage({ id: 'common.button.detail' })}
              onClick={() => {
                void openDetail(task).catch(() => setDetailError(true));
              }}
            />
          </Tooltip>
          {getModelPreheatTaskActions(
            task.desired_state,
            task.execution_state
          ).map((action) => (
            <Tooltip
              key={action}
              title={intl.formatMessage({
                id: `resources.preheat.action.${action}`
              })}
            >
              <Button
                type="text"
                danger={action === 'cancel'}
                icon={actionIcons[action]}
                aria-label={intl.formatMessage({
                  id: `resources.preheat.action.${action}`
                })}
                onClick={() => setConfirm({ task, action })}
              />
            </Tooltip>
          ))}
          {terminalStates.has(task.execution_state) && (
            <Tooltip
              title={intl.formatMessage({
                id: 'resources.preheat.action.delete'
              })}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                aria-label={intl.formatMessage({
                  id: 'resources.preheat.action.delete'
                })}
                onClick={() => setConfirm({ task, action: 'delete' })}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const targetColumns = [
    {
      title: intl.formatMessage({ id: 'resources.preheat.worker' }),
      render: (_: unknown, worker: ModelPreheatTargetSnapshot) => (
        <Tooltip title={worker.worker_uuid}>
          <Typography.Text>
            {worker.worker_name || `Worker #${worker.worker_id}`}
          </Typography.Text>
        </Tooltip>
      )
    }
  ];

  const workerTaskColumns = [
    {
      title: intl.formatMessage({ id: 'resources.preheat.worker' }),
      width: 180,
      render: (_: unknown, item: ModelPreheatWorkerTask) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>
            {item.worker_name ||
              item.worker_ip ||
              (item.worker_id != null ? `Worker #${item.worker_id}` : '-')}
          </Typography.Text>
          <Tooltip title={item.worker_uuid}>
            <Typography.Text type="secondary">
              {item.worker_name && item.worker_ip
                ? item.worker_ip
                : item.worker_uuid}
            </Typography.Text>
          </Tooltip>
        </Space>
      )
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.workerRole' }),
      dataIndex: 'role',
      width: 110,
      render: (role: string) =>
        intl.formatMessage({ id: `resources.preheat.workerRole.${role}` })
    },
    {
      title: intl.formatMessage({ id: 'common.table.status' }),
      dataIndex: 'state',
      width: 120,
      render: (value: string) => {
        const status = getModelStorageTaskStatusPresentation(value);
        return (
          <Tag color={statusColors[value || 'unknown']}>
            {intl.formatMessage({ id: status.messageId })}
          </Tag>
        );
      }
    },
    {
      title: intl.formatMessage({ id: 'resources.modelcache.progress' }),
      dataIndex: 'progress',
      width: 160,
      render: (value: number, item: ModelPreheatWorkerTask) => (
        <Space direction="vertical" size={0} style={{ width: 140 }}>
          <Progress
            percent={Math.round(value || 0)}
            size="small"
            status={item.state === 'error' ? 'exception' : undefined}
          />
          <Typography.Text type="secondary">
            {item.total_size
              ? `${numeral(item.downloaded_size).format('0.00 b')} / ${numeral(item.total_size).format('0.00 b')}`
              : '-'}
          </Typography.Text>
        </Space>
      )
    },
    {
      title: intl.formatMessage({
        id: 'resources.storage.syncTask.errorCode'
      }),
      width: 180,
      render: (_: unknown, item: ModelPreheatWorkerTask) =>
        item.state_message || item.error_code || '-'
    }
  ];

  const workerTaskData = detail?.worker_tasks || [];
  const detailFailure = detail?.error_code
    ? getModelStorageErrorPresentation(detail.error_code)
    : null;
  const detailStateMessage =
    detail?.state_message && detail.state_message !== detail.error_code
      ? detail.state_message
      : null;

  return (
    <>
      <Space
        style={{
          marginBottom: 16
        }}
      >
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            void startPolling(false);
          }}
          loading={loading}
        >
          {intl.formatMessage({ id: 'common.button.refresh' })}
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
        >
          {intl.formatMessage({ id: 'resources.preheat.task.create' })}
        </Button>
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={tasks}
        loading={loading}
        scroll={{ x: 1450 }}
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
            <Button size="small" onClick={() => void startPolling(false)}>
              {intl.formatMessage({ id: 'common.button.retry' })}
            </Button>
          }
        />
      )}
      <ModelPreheatModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onCreated={(task) => {
          setCreateOpen(false);
          message.success(intl.formatMessage({ id: 'common.message.success' }));
          void startPolling(false);
          void openDetail(task).catch(() => setDetailError(true));
        }}
      />
      <Modal
        open={Boolean(detail)}
        centered
        width={860}
        title={intl.formatMessage(
          { id: 'resources.preheat.task.detail' },
          { id: detail?.id || '' }
        )}
        footer={null}
        onCancel={() => {
          detailRequests.current.invalidate();
          setDetail(null);
          setDetailError(false);
        }}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Spin spinning={detailLoading}>
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
                    detail &&
                    void openDetail(detail).catch(() => setDetailError(true))
                  }
                >
                  {intl.formatMessage({ id: 'common.button.retry' })}
                </Button>
              }
            />
          )}
          <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} size="small">
            <Descriptions.Item
              label={intl.formatMessage({ id: 'resources.preheat.model' })}
            >
              {detail?.model_id}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({ id: 'resources.preheat.revision' })}
            >
              {
                getModelStorageRevisionPresentation(detail?.resolved_revision)
                  .short
              }
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({ id: 'common.table.status' })}
            >
              {detail
                ? intl.formatMessage({
                    id: getModelStorageTaskStatusPresentation(
                      detail.execution_state
                    ).messageId
                  })
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'resources.preheat.targetScope'
              })}
            >
              {detail?.target_scope}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'resources.preheat.backfillPolicy'
              })}
            >
              {detail?.s3_backfill_policy}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({ id: 'resources.preheat.attempt' })}
            >
              {detail?.attempt}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'resources.storage.transferMethod'
              })}
              span={3}
            >
              {formatTransferMethod(detail)}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({ id: 'resources.storage.artifactId' })}
              span={3}
            >
              <Typography.Text copyable>
                {detail?.artifact_id || '-'}
              </Typography.Text>
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
              label={intl.formatMessage({ id: 'resources.storage.fileCount' })}
            >
              {detail?.file_count ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({ id: 'resources.storage.totalSize' })}
            >
              {detail?.total_size != null
                ? numeral(detail.total_size).format('0.00 b')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'resources.storage.stateMessage'
              })}
              span={2}
            >
              {detailStateMessage || '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'resources.storage.syncTask.errorCode'
              })}
              span={3}
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
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'resources.storage.taskTimeline'
              })}
              span={3}
            >
              {detail
                ? `${intl.formatMessage({ id: 'resources.storage.createdAt' })} ${dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss')} -> ${intl.formatMessage({ id: 'resources.storage.updatedAt' })} ${dayjs(detail.updated_at).format('YYYY-MM-DD HH:mm:ss')}`
                : '-'}
            </Descriptions.Item>
          </Descriptions>
        </Spin>
        {workerTaskData.length ? (
          <Table<ModelPreheatWorkerTask>
            rowKey="id"
            size="small"
            style={{ marginTop: 16 }}
            columns={workerTaskColumns}
            dataSource={workerTaskData}
            pagination={false}
            scroll={{ x: 760 }}
          />
        ) : (
          <Table<ModelPreheatTargetSnapshot>
            rowKey="worker_uuid"
            size="small"
            style={{ marginTop: 16 }}
            columns={targetColumns}
            dataSource={detail?.target_worker_snapshot || []}
            pagination={false}
            scroll={{ x: 620 }}
          />
        )}
      </Modal>
      <ModelPreheatConfirmModal
        open={Boolean(confirm)}
        title={intl.formatMessage({
          id: `resources.preheat.action.${confirm?.action || 'cancel'}Confirm`
        })}
        content={intl.formatMessage(
          {
            id:
              confirm?.action === 'delete'
                ? 'resources.preheat.action.deleteContent'
                : 'resources.preheat.action.content'
          },
          { id: confirm?.task.id || '', model: confirm?.task.model_id || '' }
        )}
        okText={intl.formatMessage({
          id: `resources.preheat.action.${confirm?.action || 'cancel'}`
        })}
        danger={confirm?.action === 'cancel' || confirm?.action === 'delete'}
        loading={actionLoading}
        onOk={handleAction}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
};

export default ModelPreheatTasks;
