import { DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Button, Table, Tag, Tooltip, message } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { deleteModelStorageSyncTask, queryModelStorageSyncTasks } from '../apis';
import type { ModelStorageSyncTask } from '../config/types';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';

const ModelStorageSyncTasks: React.FC = () => {
  const intl = useIntl();
  const [tasks, setTasks] = useState<ModelStorageSyncTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ModelStorageSyncTask | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { setTasks((await queryModelStorageSyncTasks({ page: 1, perPage: 100 })).items); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load().catch(() => undefined); }, [load]);
  const remove = async () => {
    if (!selected) return;
    setSubmitting(true);
    try { await deleteModelStorageSyncTask(selected.id); setSelected(null); message.success(intl.formatMessage({ id: 'common.message.success' })); await load(); } finally { setSubmitting(false); }
  };
  return <>
    <Button icon={<ReloadOutlined />} loading={loading} onClick={load} style={{ marginBottom: 16 }}>{intl.formatMessage({ id: 'common.button.refresh' })}</Button>
    <Table rowKey="id" loading={loading} dataSource={tasks} scroll={{ x: 900 }} columns={[
      { title: 'ID', dataIndex: 'id' }, { title: intl.formatMessage({ id: 'resources.storage.model' }), dataIndex: 'model_id' },
      { title: intl.formatMessage({ id: 'resources.storage.modelSource' }), dataIndex: 'source' }, { title: intl.formatMessage({ id: 'resources.storage.version' }), dataIndex: 'resolved_revision' },
      { title: intl.formatMessage({ id: 'common.table.status' }), dataIndex: 'state', render: (state: string) => <Tag>{state}</Tag> },
      { title: intl.formatMessage({ id: 'common.table.operation' }), render: (_: unknown, task: ModelStorageSyncTask) => <Tooltip title={intl.formatMessage({ id: 'resources.storage.cancelSync' })}><Button danger type="text" icon={<DeleteOutlined />} onClick={() => setSelected(task)} /></Tooltip> }
    ]} />
    <ModelPreheatConfirmModal open={Boolean(selected)} title={intl.formatMessage({ id: 'resources.storage.cancelSyncConfirm' })} content={intl.formatMessage({ id: 'resources.storage.cancelSyncContent' }, { id: selected?.id || '' })} okText={intl.formatMessage({ id: 'resources.storage.cancelSync' })} danger loading={submitting} onOk={remove} onCancel={() => setSelected(null)} />
  </>;
};

export default ModelStorageSyncTasks;
