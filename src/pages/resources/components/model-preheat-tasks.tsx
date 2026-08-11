import {
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
  Button,
  Descriptions,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message
} from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  queryModelPreheatTask,
  queryModelPreheatTasks,
  runModelPreheatTaskAction
} from '../apis';
import {
  LatestRequestGate,
  getModelPreheatTaskActions,
  type ModelPreheatTaskAction
} from '../config/model-preheat';
import type {
  ModelPreheatTargetSnapshot,
  ModelPreheatTask
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

const ModelPreheatTasks: React.FC = () => {
  const intl = useIntl();
  const taskRequests = useRef(new LatestRequestGate());
  const detailRequests = useRef(new LatestRequestGate());
  const [tasks, setTasks] = useState<ModelPreheatTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<ModelPreheatTask | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirm, setConfirm] = useState<{
    task: ModelPreheatTask;
    action: ModelPreheatTaskAction;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadTasks = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      return taskRequests.current.run(
        () => queryModelPreheatTasks({ page, perPage: pageSize }),
        (result) => {
          setTasks(result.items);
          setTotal(result.pagination.total);
        },
        () => setLoading(false)
      );
    },
    [page, pageSize]
  );

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    async function refresh(silent: boolean) {
      try {
        await loadTasks(silent);
      } catch {
        // 下一轮继续尝试，页面保留最后一次成功数据。
      }
      if (active) {
        timer = window.setTimeout(() => {
          void refresh(true);
        }, 5000);
      }
    }
    void refresh(false);
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [loadTasks]);

  useEffect(
    () => () => {
      taskRequests.current.invalidate();
      detailRequests.current.invalidate();
    },
    []
  );

  const openDetail = async (task: ModelPreheatTask) => {
    setDetail(task);
    setDetailLoading(true);
    return detailRequests.current.run(
      () => queryModelPreheatTask(task.id),
      setDetail,
      () => setDetailLoading(false)
    );
  };

  const handleAction = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      const task = await runModelPreheatTaskAction(
        confirm.task.id,
        confirm.action
      );
      setConfirm(null);
      if (detail?.id === task.id) setDetail(task);
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      await loadTasks();
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 70
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.model' }),
      dataIndex: 'model_id',
      ellipsis: true
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.revision' }),
      dataIndex: 'resolved_revision',
      ellipsis: true
    },
    {
      title: intl.formatMessage({ id: 'common.table.status' }),
      dataIndex: 'execution_state',
      width: 120,
      render: (value: string) => (
        <Tag color={statusColors[value]}>
          {intl.formatMessage({ id: `resources.preheat.state.${value}` })}
        </Tag>
      )
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.attempt' }),
      dataIndex: 'attempt',
      width: 90
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.targetCount' }),
      dataIndex: 'target_worker_uuids',
      width: 110,
      render: (value: string[]) => value.length
    },
    {
      title: intl.formatMessage({ id: 'common.table.createTime' }),
      dataIndex: 'created_at',
      width: 170,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss')
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
              onClick={() => {
                void openDetail(task).catch(() => undefined);
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
                onClick={() => setConfirm({ task, action })}
              />
            </Tooltip>
          ))}
        </Space>
      )
    }
  ];

  const targetColumns = [
    {
      title: intl.formatMessage({ id: 'resources.preheat.worker' }),
      dataIndex: 'worker_name'
    },
    {
      title: 'Worker ID',
      dataIndex: 'worker_id'
    },
    {
      title: 'UUID',
      dataIndex: 'worker_uuid'
    }
  ];

  return (
    <>
      <Space
        style={{
          width: '100%',
          justifyContent: 'space-between',
          marginBottom: 16
        }}
      >
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            void loadTasks().catch(() => undefined);
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
        scroll={{ x: 1050 }}
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
      <ModelPreheatModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onCreated={(task) => {
          setCreateOpen(false);
          message.success(intl.formatMessage({ id: 'common.message.success' }));
          void loadTasks().catch(() => undefined);
          void openDetail(task).catch(() => undefined);
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
        }}
      >
        <Spin spinning={detailLoading}>
          <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} size="small">
            <Descriptions.Item
              label={intl.formatMessage({ id: 'resources.preheat.model' })}
            >
              {detail?.model_id}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({ id: 'resources.preheat.revision' })}
            >
              {detail?.resolved_revision}
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({ id: 'common.table.status' })}
            >
              {detail?.execution_state}
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
            <Descriptions.Item label="Cache Key" span={3}>
              <Typography.Text copyable>{detail?.cache_key}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Generation ID" span={3}>
              {detail?.generation_id}
            </Descriptions.Item>
          </Descriptions>
        </Spin>
        <Table<ModelPreheatTargetSnapshot>
          rowKey="worker_uuid"
          size="small"
          style={{ marginTop: 16 }}
          columns={targetColumns}
          dataSource={detail?.target_worker_snapshot || []}
          pagination={false}
        />
      </Modal>
      <ModelPreheatConfirmModal
        open={Boolean(confirm)}
        title={intl.formatMessage({
          id: `resources.preheat.action.${confirm?.action || 'cancel'}Confirm`
        })}
        content={intl.formatMessage(
          { id: 'resources.preheat.action.content' },
          { id: confirm?.task.id || '', model: confirm?.task.model_id || '' }
        )}
        okText={intl.formatMessage({
          id: `resources.preheat.action.${confirm?.action || 'cancel'}`
        })}
        danger={confirm?.action === 'cancel'}
        loading={actionLoading}
        onOk={handleAction}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
};

export default ModelPreheatTasks;
