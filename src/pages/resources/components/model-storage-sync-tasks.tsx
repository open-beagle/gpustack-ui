import { DeleteOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Button, Descriptions, Modal, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { deleteModelStorageSyncTask, queryModelStorageSyncTask, queryModelStorageSyncTasks } from '../apis';
import { getModelStorageTransferPresentation } from '../config/model-preheat';
import type { ModelStorageSyncTask, ModelStorageSyncTaskDetail } from '../config/types';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';
import ModelStorageSyncBatchModal from './model-storage-sync-batch-modal';

const transferMethod = (
  intl: ReturnType<typeof useIntl>,
  task: Pick<ModelStorageSyncTaskDetail, 'transfer_source' | 'transfer_profile_id' | 'profile' | 'source_worker_id' | 'source_worker_name'>
) => {
  const presentation = getModelStorageTransferPresentation(task.transfer_source);
  return intl.formatMessage(
    { id: presentation.messageId },
    {
      worker: presentation.includeWorker ? task.source_worker_name || `Worker #${task.source_worker_id || '-'}` : '',
      profile: presentation.includeProfile ? task.profile?.name || `Profile #${task.transfer_profile_id || '-'}` : ''
    }
);
};

const cancellableStates = new Set(['pending', 'scanning', 'publishing']);

const ModelStorageSyncTasks: React.FC = () => {
  const intl = useIntl();
  const [tasks, setTasks] = useState<ModelStorageSyncTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ModelStorageSyncTask | null>(null);
  const [detail, setDetail] = useState<ModelStorageSyncTaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const load = useCallback(async () => { setLoading(true); try { setTasks((await queryModelStorageSyncTasks({ page: 1, perPage: 100 })).items); } finally { setLoading(false); } }, []);
  useEffect(() => { void load().catch(() => undefined); }, [load]);
  const openDetail = async (task: ModelStorageSyncTask) => { setDetailLoading(true); try { setDetail(await queryModelStorageSyncTask(task.id)); } finally { setDetailLoading(false); } };
  const remove = async () => { if (!selected) return; setSubmitting(true); try { await deleteModelStorageSyncTask(selected.id); setSelected(null); message.success(intl.formatMessage({ id: 'common.message.success' })); await load(); } finally { setSubmitting(false); } };
  return <>
    <Space style={{ marginBottom: 16 }}>
      <Button icon={<ReloadOutlined />} loading={loading} onClick={load}>{intl.formatMessage({ id: 'common.button.refresh' })}</Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setBatchOpen(true)}>{intl.formatMessage({ id: 'resources.storage.syncBatch.create' })}</Button>
    </Space>
    <Table rowKey="id" loading={loading} dataSource={tasks} scroll={{ x: 900 }} columns={[
      { title: 'ID', dataIndex: 'id' }, { title: intl.formatMessage({ id: 'resources.storage.model' }), dataIndex: 'model_id' },
      { title: intl.formatMessage({ id: 'resources.storage.modelSource' }), dataIndex: 'source' }, { title: intl.formatMessage({ id: 'resources.storage.version' }), dataIndex: 'resolved_revision' },
      { title: intl.formatMessage({ id: 'common.table.status' }), dataIndex: 'state', render: (state: string) => <Tag>{state}</Tag> },
      { title: intl.formatMessage({ id: 'common.table.operation' }), render: (_: unknown, task: ModelStorageSyncTask) => <><Tooltip title={intl.formatMessage({ id: 'common.button.detail' })}><Button type="text" icon={<EyeOutlined />} onClick={() => void openDetail(task)} /></Tooltip>{cancellableStates.has(task.state) && <Tooltip title={intl.formatMessage({ id: 'resources.storage.cancelSync' })}><Button danger type="text" icon={<DeleteOutlined />} onClick={() => setSelected(task)} /></Tooltip>}</> }
    ]} />
    <Modal open={Boolean(detail) || detailLoading} centered maskClosable={false} onCancel={() => setDetail(null)} footer={null} title={intl.formatMessage({ id: 'resources.storage.syncTaskDetail' })}>
      {detailLoading ? <Typography.Text>...</Typography.Text> : <Descriptions column={1} size="small"><Descriptions.Item label={intl.formatMessage({ id: 'resources.storage.modelSource' })}>{detail?.source}</Descriptions.Item><Descriptions.Item label={intl.formatMessage({ id: 'resources.storage.transferMethod' })}>{detail && transferMethod(intl, detail)}</Descriptions.Item><Descriptions.Item label="Artifact ID">{detail?.artifact_id || '-'}</Descriptions.Item></Descriptions>}
    </Modal>
    <ModelPreheatConfirmModal open={Boolean(selected)} title={intl.formatMessage({ id: 'resources.storage.cancelSyncConfirm' })} content={intl.formatMessage({ id: 'resources.storage.cancelSyncContent' }, { id: selected?.id || '' })} okText={intl.formatMessage({ id: 'resources.storage.cancelSync' })} danger loading={submitting} onOk={remove} onCancel={() => setSelected(null)} />
    <ModelStorageSyncBatchModal open={batchOpen} onCancel={() => setBatchOpen(false)} onTasksChanged={() => void load()} />
  </>;
};

export default ModelStorageSyncTasks;
