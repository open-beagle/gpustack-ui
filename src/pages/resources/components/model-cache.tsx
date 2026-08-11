import AutoTooltip from '@/components/auto-tooltip';
import { convertFileSize } from '@/utils';
import {
  DeleteOutlined,
  QuestionCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import {
  Button,
  Input,
  Progress,
  Segmented,
  Space,
  Table,
  Tag,
  Tooltip,
  message,
  type TableProps
} from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  deleteModelCache,
  deleteModelCacheTask,
  queryModelCache,
  queryModelCacheTasks,
  queryWorkersList
} from '../apis';
import {
  ModelCacheItem,
  ModelCacheTask,
  ListItem as WorkerListItem
} from '../config/types';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';

const HighlightTable = styled.div`
  .model-cache-task-highlight > td {
    background: var(--ant-color-primary-bg) !important;
  }
`;

type DeleteConfirmation =
  | { kind: 'model'; record: ModelCacheItem }
  | { kind: 'task'; record: ModelCacheTask; running: boolean };

const ModelCache: React.FC = () => {
  const intl = useIntl();
  const params = new URLSearchParams(window.location.search);
  const highlightedTaskId = Number(params.get('task_id')) || undefined;
  const [tab, setTab] = useState(
    params.get('tab') === 'tasks' ? 'tasks' : 'cached'
  );
  const [search, setSearch] = useState('');
  const [models, setModels] = useState<ModelCacheItem[]>([]);
  const [tasks, setTasks] = useState<ModelCacheTask[]>([]);
  const [workers, setWorkers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<DeleteConfirmation | null>(
    null
  );
  const [confirmLoading, setConfirmLoading] = useState(false);

  const text = useCallback(
    (id: string, values?: Record<string, string | number>) =>
      intl.formatMessage({ id }, values),
    [intl]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'cached') {
        const result = await queryModelCache({ search: search || undefined });
        setModels(result.items || []);
      } else {
        const [taskResult, workerResult] = await Promise.all([
          queryModelCacheTasks({ page: 1, perPage: 100 }),
          queryWorkersList({ page: 1, perPage: 100 })
        ]);
        setTasks(taskResult.items || []);
        setWorkers(
          Object.fromEntries(
            (workerResult.items || []).map((worker: WorkerListItem) => [
              worker.id,
              worker.name
            ])
          )
        );
      }
    } finally {
      setLoading(false);
    }
  }, [search, tab]);

  useEffect(() => {
    load();
  }, [load]);

  const switchTab = (value: string | number) => {
    const next = String(value);
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    if (next !== 'tasks') url.searchParams.delete('task_id');
    window.history.replaceState(null, '', url);
  };

  const confirmDeleteModel = (record: ModelCacheItem) => {
    setConfirmation({ kind: 'model', record });
  };

  const confirmDeleteTask = (record: ModelCacheTask) => {
    setConfirmation({
      kind: 'task',
      record,
      running: ['pending', 'uploading'].includes(record.state)
    });
  };

  const handleDelete = async () => {
    if (!confirmation || confirmLoading) return;
    setConfirmLoading(true);
    try {
      if (confirmation.kind === 'model') {
        await deleteModelCache(confirmation.record.model_id);
      } else {
        await deleteModelCacheTask(confirmation.record.id);
      }
      setConfirmation(null);
      message.success(text('common.message.success'));
      await load();
    } finally {
      setConfirmLoading(false);
    }
  };

  const operation = (onClick: () => void, label: string) => (
    <Tooltip title={label}>
      <Button
        type="text"
        danger
        aria-label={label}
        icon={<DeleteOutlined />}
        onClick={onClick}
      />
    </Tooltip>
  );

  const modelColumns: TableProps<ModelCacheItem>['columns'] = [
    { title: text('resources.modelcache.model'), dataIndex: 'model_id' },
    {
      title: text('resources.modelcache.s3Path'),
      dataIndex: 's3_path',
      ellipsis: { showTitle: false },
      render: (value: string) => <AutoTooltip ghost>{value}</AutoTooltip>
    },
    {
      title: text('resources.modelcache.capacity'),
      dataIndex: 'total_size',
      align: 'right',
      render: (value: number) => convertFileSize(value, 1, true)
    },
    {
      title: text('resources.modelcache.fileCount'),
      dataIndex: 'file_count',
      align: 'right'
    },
    {
      title: text('resources.modelcache.updatedAt'),
      dataIndex: 'updated_at',
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: text('common.table.operation'),
      width: 90,
      align: 'center',
      render: (_, record) =>
        operation(
          () => confirmDeleteModel(record),
          text('resources.modelcache.deleteCache')
        )
    }
  ];

  const taskColumns: TableProps<ModelCacheTask>['columns'] = [
    { title: text('resources.modelcache.model'), dataIndex: 'model_id' },
    {
      title: text('resources.modelcache.sourceWorker'),
      dataIndex: 'worker_id',
      render: (value: number) => workers[value] || `#${value}`
    },
    {
      title: text('resources.modelcache.target'),
      dataIndex: 'target_path',
      ellipsis: true
    },
    {
      title: text('common.table.status'),
      dataIndex: 'state',
      render: (value: ModelCacheTask['state'], record) => (
        <Space direction="vertical" size={2}>
          <Tag
            color={
              value === 'ready'
                ? 'success'
                : value === 'error'
                  ? 'error'
                  : 'processing'
            }
          >
            {text(`resources.modelcache.state.${value}`)}
          </Tag>
          {record.error_message && <span>{record.error_message}</span>}
        </Space>
      )
    },
    {
      title: text('resources.modelcache.progress'),
      dataIndex: 'progress',
      width: 180,
      render: (value: number, record) => (
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <Progress percent={Math.round(value)} size="small" />
          <span style={{ color: 'var(--ant-color-text-secondary)' }}>
            {convertFileSize(record.uploaded_size, 1, true)} /{' '}
            {convertFileSize(record.total_size, 1, true)}
          </span>
        </Space>
      )
    },
    {
      title: text('common.table.createTime'),
      dataIndex: 'created_at',
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: text('common.table.operation'),
      width: 90,
      align: 'center',
      render: (_, record) =>
        operation(
          () => confirmDeleteTask(record),
          text('resources.modelcache.deleteTask')
        )
    }
  ];

  return (
    <PageContainer
      ghost
      header={{
        title: (
          <span>
            {text('resources.modelcache.title')}{' '}
            <Tooltip title={text('resources.modelcache.description')}>
              <QuestionCircleOutlined
                aria-label={text('resources.modelcache.description')}
                style={{ color: 'var(--ant-color-text-tertiary)' }}
              />
            </Tooltip>
          </span>
        ),
        breadcrumb: {}
      }}
    >
      <Space
        direction="vertical"
        size={18}
        style={{ width: '100%', marginTop: 24 }}
      >
        <Segmented
          value={tab}
          onChange={switchTab}
          options={[
            { label: text('resources.modelcache.cached'), value: 'cached' },
            { label: text('resources.modelcache.tasks'), value: 'tasks' }
          ]}
        />
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          {tab === 'cached' ? (
            <Input.Search
              allowClear
              placeholder={text('resources.modelcache.search')}
              style={{ width: 320, maxWidth: '100%' }}
              onSearch={setSearch}
            />
          ) : (
            <span />
          )}
          <Button icon={<ReloadOutlined />} onClick={load}>
            {text('resources.modelcache.refresh')}
          </Button>
        </Space>
        {tab === 'cached' ? (
          <Table<ModelCacheItem>
            rowKey="model_id"
            loading={loading}
            columns={modelColumns}
            dataSource={models}
            pagination={{ pageSize: 20 }}
            scroll={{ x: 980 }}
          />
        ) : (
          <HighlightTable>
            <Table<ModelCacheTask>
              rowKey="id"
              loading={loading}
              columns={taskColumns}
              dataSource={tasks}
              rowClassName={(record) =>
                record.id === highlightedTaskId
                  ? 'model-cache-task-highlight'
                  : ''
              }
              pagination={{ pageSize: 20 }}
              scroll={{ x: 1100 }}
            />
          </HighlightTable>
        )}
      </Space>
      <ModelPreheatConfirmModal
        open={!!confirmation}
        title={text(
          confirmation?.kind === 'model'
            ? 'resources.modelcache.deleteCache'
            : 'resources.modelcache.deleteTask'
        )}
        content={
          confirmation?.kind === 'model'
            ? text('resources.modelcache.deleteCache.content', {
                model: confirmation.record.model_id,
                files: confirmation.record.file_count,
                size: convertFileSize(confirmation.record.total_size, 1, true)
              })
            : text(
                confirmation?.running
                  ? 'resources.modelcache.deleteTask.running'
                  : 'resources.modelcache.deleteTask.finished',
                { id: confirmation?.record.id || '' }
              )
        }
        okText={text('common.button.delete')}
        loading={confirmLoading}
        danger
        onOk={handleDelete}
        onCancel={() => setConfirmation(null)}
      />
    </PageContainer>
  );
};

export default ModelCache;
