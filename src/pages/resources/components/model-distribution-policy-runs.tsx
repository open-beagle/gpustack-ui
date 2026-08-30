import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  Modal,
  Progress,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  queryModelPreheatPolicyRun,
  queryModelPreheatPolicyRuns
} from '../apis';
import {
  extractModelStorageErrorCode,
  getModelStorageErrorPresentation,
  LatestRequestGate
} from '../config/model-preheat';
import type {
  ModelPreheatDistributionPolicyRun,
  PolicyRunTask
} from '../config/types';
import { ModelStorageErrorAlert } from './model-storage-error-details';

const ACTIVE_RUN_STATES = new Set(['waiting', 'running', 'paused']);

const DISTRIBUTION_TASK_STATES = new Set([
  'pending',
  'running',
  'paused',
  'ready',
  'error',
  'canceled',
  'skipped',
  'skipped_worker_removed'
]);

const shortInternalId = (value?: string | null) => {
  if (!value) return '-';
  return value.length > 16 ? `${value.slice(0, 12)}...` : value;
};

const formatTaskWorker = (task: PolicyRunTask) => {
  const primary =
    task.worker_name ||
    task.worker_ip ||
    (task.worker_id != null ? `Worker #${task.worker_id}` : '') ||
    task.worker_uuid ||
    '-';
  const secondary =
    task.worker_name && task.worker_ip
      ? task.worker_ip
      : task.worker_uuid || '';
  return { primary, secondary };
};

const renderTaskWorker = (task: PolicyRunTask) => {
  const worker = formatTaskWorker(task);
  return (
    <Tooltip title={task.worker_uuid || worker.primary}>
      <Space direction="vertical" size={0}>
        <Typography.Text>{worker.primary}</Typography.Text>
        {worker.secondary && worker.secondary !== worker.primary && (
          <Typography.Text type="secondary">{worker.secondary}</Typography.Text>
        )}
      </Space>
    </Tooltip>
  );
};

const ModelDistributionPolicyRuns: React.FC = () => {
  const intl = useIntl();
  const listRequests = useRef(new LatestRequestGate());
  const detailRequests = useRef(new LatestRequestGate());
  const [runs, setRuns] = useState<ModelPreheatDistributionPolicyRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] =
    useState<ModelPreheatDistributionPolicyRun | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        await listRequests.current.run(
          () => queryModelPreheatPolicyRuns({ page, perPage: pageSize }),
          (result) => {
            setRuns(result.items);
            setTotal(result.pagination.total);
            setLoadError(false);
          },
          () => setLoading(false)
        );
      } catch {
        setLoadError(true);
        setLoading(false);
      }
    },
    [page, pageSize]
  );

  const openDetail = async (runId: number) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      await detailRequests.current.run(
        () => queryModelPreheatPolicyRun(runId),
        setDetail,
        () => setDetailLoading(false)
      );
    } catch (error) {
      setDetailError(extractModelStorageErrorCode(error) || 'unknown');
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    detailRequests.current.invalidate();
    setDetailOpen(false);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!runs.some((run) => ACTIVE_RUN_STATES.has(run.execution_state))) return;
    const timer = window.setInterval(() => void load(false), 3000);
    return () => window.clearInterval(timer);
  }, [load, runs]);

  useEffect(() => {
    if (!detailOpen || !detail) return;
    if (!ACTIVE_RUN_STATES.has(detail.execution_state)) return;
    const timer = window.setTimeout(async () => {
      try {
        await detailRequests.current.run(
          () => queryModelPreheatPolicyRun(detail.id),
          setDetail
        );
      } catch (error) {
        setDetailError(extractModelStorageErrorCode(error) || 'unknown');
      }
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [detail, detailOpen]);

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
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={runs}
        scroll={{ x: 1280 }}
        columns={[
          {
            title: intl.formatMessage({
              id: 'resources.storage.distributionTasks.policy'
            }),
            dataIndex: 'policy_name',
            width: 220,
            render: (value: string | null, run) => value || `#${run.policy_id}`
          },
          {
            title: intl.formatMessage({ id: 'resources.storage.model' }),
            dataIndex: 'model_id',
            width: 240,
            render: (value: string | null) => value || '-'
          },
          {
            title: intl.formatMessage({
              id: 'resources.preheat.schedule.triggerMode'
            }),
            dataIndex: 'trigger',
            width: 130,
            render: (value: ModelPreheatDistributionPolicyRun['trigger']) =>
              intl.formatMessage({
                id: `resources.preheat.schedule.triggerMode.${value}`
              })
          },
          {
            title: intl.formatMessage({ id: 'common.table.status' }),
            dataIndex: 'execution_state',
            width: 130,
            render: (value: string) => (
              <Tag
                color={
                  value === 'ready'
                    ? 'success'
                    : value === 'error' || value === 'partial_error'
                      ? 'error'
                      : value === 'skipped'
                        ? 'default'
                        : 'processing'
                }
              >
                {intl.formatMessage({
                  id: `resources.storage.distributionPolicy.execution.${value}`
                })}
              </Tag>
            )
          },
          {
            title: intl.formatMessage({
              id: 'resources.storage.distributionPolicy.progress'
            }),
            width: 170,
            render: (_: unknown, run) => (
              <Space direction="vertical" size={0}>
                <Progress
                  percent={Math.round(run.summary.progress)}
                  size="small"
                />
                <Typography.Text type="secondary">
                  {intl.formatMessage(
                    {
                      id: 'resources.storage.distributionPolicy.progressCount'
                    },
                    {
                      completed: run.summary.ready,
                      total: run.summary.total
                    }
                  )}
                </Typography.Text>
              </Space>
            )
          },
          {
            title: intl.formatMessage({
              id: 'resources.storage.syncPolicy.windowStart'
            }),
            dataIndex: 'window_start_utc',
            width: 180,
            render: (value: string | null) =>
              value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'
          },
          {
            title: intl.formatMessage({
              id: 'resources.storage.distributionPolicy.startedAt'
            }),
            dataIndex: 'started_at',
            width: 180,
            render: (value: string | null) =>
              value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'
          },
          {
            title: intl.formatMessage({
              id: 'resources.storage.distributionPolicy.finishedAt'
            }),
            dataIndex: 'finished_at',
            width: 180,
            render: (value: string | null) =>
              value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'
          },
          {
            title: intl.formatMessage({ id: 'common.table.operation' }),
            width: 90,
            fixed: 'right' as const,
            render: (_: unknown, run) => (
              <Tooltip
                title={intl.formatMessage({
                  id: 'resources.storage.distributionPolicy.runDetail'
                })}
              >
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  aria-label={intl.formatMessage({
                    id: 'resources.storage.distributionPolicy.runDetail'
                  })}
                  onClick={() => void openDetail(run.id)}
                />
              </Tooltip>
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
            listRequests.current.invalidate();
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
            <Button size="small" onClick={() => void load()}>
              {intl.formatMessage({ id: 'common.button.retry' })}
            </Button>
          }
        />
      )}
      <Modal
        open={detailOpen}
        centered
        width={860}
        title={intl.formatMessage({
          id: 'resources.storage.distributionPolicy.runDetail'
        })}
        footer={null}
        loading={detailLoading}
        styles={{ body: { maxHeight: '68vh', overflowY: 'auto' } }}
        onCancel={closeDetail}
      >
        {detailError && (
          <ModelStorageErrorAlert
            errorCode={detailError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        {detail && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'resources.storage.distributionTasks.policy'
                })}
              >
                {detail.policy_name || `#${detail.policy_id}`}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'resources.storage.model' })}
              >
                {detail.model_id || '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'resources.storage.distributionPolicy.executionState'
                })}
              >
                {intl.formatMessage({
                  id: `resources.storage.distributionPolicy.execution.${detail.execution_state}`
                })}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'resources.storage.distributionPolicy.progress'
                })}
              >
                {Math.round(detail.summary.progress)}%
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'resources.preheat.schedule.triggerMode'
                })}
              >
                {intl.formatMessage({
                  id: `resources.preheat.schedule.triggerMode.${detail.trigger}`
                })}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'resources.storage.syncPolicy.windowStart'
                })}
              >
                {dayjs(detail.window_start_utc).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'resources.storage.distributionPolicy.startedAt'
                })}
              >
                {detail.started_at
                  ? dayjs(detail.started_at).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'resources.storage.distributionPolicy.finishedAt'
                })}
              >
                {detail.finished_at
                  ? dayjs(detail.finished_at).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}
              </Descriptions.Item>
            </Descriptions>
            {detail.error_code && (
              <ModelStorageErrorAlert
                errorCode={detail.error_code}
                type="error"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
            <Table
              rowKey={(task) =>
                `${task.id || 'task'}:${task.artifact_id || ''}:${task.worker_uuid || task.worker_id || ''}:${task.error_code || ''}`
              }
              style={{ marginTop: 16 }}
              size="small"
              pagination={false}
              dataSource={detail.tasks}
              scroll={{ x: 760 }}
              columns={[
                {
                  title: intl.formatMessage({
                    id: 'resources.storage.model'
                  }),
                  key: 'model',
                  ellipsis: true,
                  render: (_: unknown, task) => (
                    <Tooltip title={task.artifact_id || task.model_id || '-'}>
                      <Typography.Text>
                        {task.model_id || shortInternalId(task.artifact_id)}
                      </Typography.Text>
                    </Tooltip>
                  )
                },
                {
                  title: intl.formatMessage({
                    id: 'resources.storage.distributionPolicy.worker'
                  }),
                  key: 'worker',
                  ellipsis: true,
                  render: (_: unknown, task) => renderTaskWorker(task)
                },
                {
                  title: intl.formatMessage({ id: 'common.table.status' }),
                  dataIndex: 'state',
                  width: 120,
                  render: (value: string) =>
                    intl.formatMessage({
                      id: `resources.storage.distributionPolicy.taskState.${
                        DISTRIBUTION_TASK_STATES.has(value) ? value : 'unknown'
                      }`
                    })
                },
                {
                  title: intl.formatMessage({
                    id: 'resources.storage.distributionPolicy.progress'
                  }),
                  dataIndex: 'progress',
                  width: 150,
                  render: (value: number) => (
                    <Progress percent={Math.round(value)} size="small" />
                  )
                },
                {
                  title: intl.formatMessage({
                    id: 'resources.storage.distributionPolicy.failureReason'
                  }),
                  key: 'error',
                  width: 220,
                  render: (_: unknown, task) => {
                    if (task.state !== 'error' || !task.error_code) return '-';
                    const presentation = getModelStorageErrorPresentation(
                      task.error_code
                    );
                    return (
                      <Space direction="vertical" size={0}>
                        <Typography.Text type="danger">
                          {intl.formatMessage({ id: presentation.messageId })}
                        </Typography.Text>
                        <Typography.Text
                          code
                          copyable={{ text: presentation.value }}
                        >
                          {presentation.value}
                        </Typography.Text>
                      </Space>
                    );
                  }
                }
              ]}
            />
          </>
        )}
      </Modal>
    </>
  );
};

export default ModelDistributionPolicyRuns;
