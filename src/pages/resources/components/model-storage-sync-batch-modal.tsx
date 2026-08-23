import ModalFooter from '@/components/modal-footer';
import { useIntl } from '@umijs/max';
import { Alert, Button, Descriptions, Modal, Select, Space, Table, Typography } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createModelStorageSyncBatch,
  queryModelFilesList,
  queryModelPreheatS3Profiles,
  queryWorkersList
} from '../apis';
import {
  IdempotencyKeyLifecycle,
  LatestRequestGate,
  loadAllPaginated
} from '../config/model-preheat';
import type {
  ListItem as Worker,
  ModelFile,
  ModelPreheatS3Profile,
  ModelStorageSyncBatchItem,
  ModelStorageSyncBatchResult,
  ModelStorageSyncScope
} from '../config/types';

interface Props {
  open: boolean;
  onCancel: () => void;
  onTasksChanged: () => void;
}

const activeProfiles = (profiles: ModelPreheatS3Profile[]) =>
  profiles.filter((profile) => profile.lifecycle_state === 'active');

const syncableModels = (models: ModelFile[]) =>
  models.filter(
    (model) =>
      model.state === 'ready' &&
      Boolean(model.resolved_revision) &&
      ['modelscope', 'huggingface'].includes(model.source)
  );

const modelName = (model: ModelFile) =>
  model.model_scope_model_id || model.huggingface_repo_id || model.local_path;

const ModelStorageSyncBatchModal: React.FC<Props> = ({
  open,
  onCancel,
  onTasksChanged
}) => {
  const intl = useIntl();
  const idempotency = useRef(new IdempotencyKeyLifecycle());
  const dependencyRequests = useRef(new LatestRequestGate());
  const modelRequests = useRef(new LatestRequestGate());
  const [profiles, setProfiles] = useState<ModelPreheatS3Profile[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [models, setModels] = useState<ModelFile[]>([]);
  const [profileId, setProfileId] = useState<number>();
  const [scope, setScope] = useState<ModelStorageSyncScope>('single_model');
  const [workerId, setWorkerId] = useState<number>();
  const [workerIds, setWorkerIds] = useState<number[]>([]);
  const [modelFileId, setModelFileId] = useState<number>();
  const [loading, setLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ModelStorageSyncBatchResult | null>(null);

  const readyWorkers = useMemo(
    () => workers.filter((worker) => worker.state === 'ready'),
    [workers]
  );
  const defaultProfile = useMemo(
    () => activeProfiles(profiles).find((profile) => profile.is_default),
    [profiles]
  );

  useEffect(() => {
    if (!open) {
      dependencyRequests.current.invalidate();
      modelRequests.current.invalidate();
      return;
    }
    idempotency.current.start();
    dependencyRequests.current.invalidate();
    modelRequests.current.invalidate();
    setLoading(true);
    setResult(null);
    setProfiles([]);
    setWorkers([]);
    setProfileId(undefined);
    setScope('single_model');
    setWorkerId(undefined);
    setWorkerIds([]);
    setModelFileId(undefined);
    setModels([]);
    void dependencyRequests.current
      .run(
        () =>
          Promise.all([
            loadAllPaginated<ModelPreheatS3Profile>((page, perPage) =>
              queryModelPreheatS3Profiles({ page, perPage })
            ),
            loadAllPaginated<Worker>((page, perPage) =>
              queryWorkersList({ page, perPage })
            )
          ]),
        ([profileItems, workerItems]) => {
          const nextProfiles = activeProfiles(profileItems);
          setProfiles(nextProfiles);
          setProfileId(nextProfiles.find((profile) => profile.is_default)?.id);
          setWorkers(workerItems);
        },
        () => setLoading(false)
      )
      .catch(() => undefined)
    return () => dependencyRequests.current.invalidate();
  }, [open]);

  useEffect(() => {
    if (!open || scope !== 'single_model' || !workerId) {
      modelRequests.current.invalidate();
      setModels([]);
      setModelFileId(undefined);
      return;
    }
    setModelsLoading(true);
    setModelFileId(undefined);
    void modelRequests.current
      .run(
        () =>
          loadAllPaginated<ModelFile>((page, perPage) =>
            queryModelFilesList(
              { page, perPage, worker_id: workerId } as Global.SearchParams
            )
          ),
        (items) => setModels(syncableModels(items)),
        () => setModelsLoading(false)
      )
      .catch(() => undefined)
    return () => modelRequests.current.invalidate();
  }, [open, scope, workerId]);

  const close = () => {
    if (submitting) return;
    idempotency.current.abandon();
    onCancel();
  };

  const submit = async () => {
    if (!profileId || submitting) return;
    if (scope === 'single_model' && !modelFileId) return;
    if (scope === 'selected_workers' && !workerIds.length) return;
    setSubmitting(true);
    try {
      const batch = await createModelStorageSyncBatch(
        {
          profile_id: profileId,
          scope,
          ...(scope === 'single_model' ? { model_file_id: modelFileId } : {}),
          ...(scope === 'selected_workers' ? { worker_ids: workerIds } : {})
        },
        idempotency.current.current()
      );
      idempotency.current.complete();
      setResult(batch);
      onTasksChanged();
    } finally {
      setSubmitting(false);
    }
  };

  const rows = result
    ? [
        ...result.created.map((item) => ({ ...item, status: 'created' })),
        ...result.skipped.map((item) => ({ ...item, status: 'skipped' })),
        ...result.failed.map((item) => ({ ...item, status: 'failed' }))
      ]
    : [];
  const canSubmit =
    Boolean(profileId) &&
    !loading &&
    !submitting &&
    (scope !== 'single_model' || Boolean(modelFileId)) &&
    (scope !== 'selected_workers' || workerIds.length > 0) &&
    (scope !== 'all_ready_workers' || readyWorkers.length > 0);

  return (
    <Modal
      open={open}
      centered
      width={720}
      title={intl.formatMessage({ id: 'resources.storage.syncBatch.create' })}
      closable={!submitting}
      maskClosable={false}
      keyboard={false}
      onCancel={close}
      footer={
        result ? (
          <Button type="primary" onClick={close}>
            {intl.formatMessage({ id: 'common.button.close' })}
          </Button>
        ) : (
          <ModalFooter
            onOk={submit}
            onCancel={close}
            okText={intl.formatMessage({ id: 'resources.storage.sync.submit' })}
            loading={submitting}
            okBtnProps={{ disabled: !canSubmit }}
            cancelBtnProps={{ disabled: submitting }}
          />
        )
      }
    >
      {result ? (
        <>
          <Descriptions column={4} size="small" title={intl.formatMessage({ id: 'resources.storage.syncBatch.result' })}>
            <Descriptions.Item label={intl.formatMessage({ id: 'resources.storage.syncBatch.planned' })}>{result.planned}</Descriptions.Item>
            <Descriptions.Item label={intl.formatMessage({ id: 'resources.storage.syncBatch.created' })}>{result.created.length}</Descriptions.Item>
            <Descriptions.Item label={intl.formatMessage({ id: 'resources.storage.syncBatch.skipped' })}>{result.skipped.length}</Descriptions.Item>
            <Descriptions.Item label={intl.formatMessage({ id: 'resources.storage.syncBatch.failed' })}>{result.failed.length}</Descriptions.Item>
          </Descriptions>
          <Table
            rowKey={(item) => `${item.status}-${item.model_file_id}-${item.worker_id}-${item.task_id}-${item.reason}`}
            size="small"
            dataSource={rows}
            pagination={false}
            scroll={{ x: 600 }}
            columns={[
              { title: intl.formatMessage({ id: 'common.table.status' }), dataIndex: 'status', render: (status: string) => intl.formatMessage({ id: `resources.storage.syncBatch.${status}` }) },
              { title: intl.formatMessage({ id: 'resources.storage.model' }), dataIndex: 'model_file_id', render: (value: number | null) => value || '-' },
              { title: 'Worker ID', dataIndex: 'worker_id', render: (value: number | null) => value || '-' },
              { title: 'Task ID', dataIndex: 'task_id', render: (value: number | null) => value || '-' },
              { title: intl.formatMessage({ id: 'resources.storage.syncBatch.reason' }), dataIndex: 'reason', render: (reason: string | null) => reason ? intl.formatMessage({ id: `resources.storage.syncBatch.reason.${reason}`, defaultMessage: reason }) : '-' }
            ]}
          />
        </>
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {!defaultProfile && (
            <Alert type="info" showIcon message={intl.formatMessage({ id: 'resources.storage.sync.noDefault' })} />
          )}
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Typography.Text>{intl.formatMessage({ id: 'resources.storage.targetProfile' })}</Typography.Text>
            <Select
              value={profileId}
              loading={loading}
              placeholder={intl.formatMessage({ id: 'resources.storage.targetProfile' })}
              onChange={setProfileId}
              options={activeProfiles(profiles).map((profile) => ({ value: profile.id, label: profile.name }))}
            />
          </Space>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Typography.Text>{intl.formatMessage({ id: 'resources.storage.syncBatch.scope' })}</Typography.Text>
            <Select
              value={scope}
              onChange={(value: ModelStorageSyncScope) => {
                setScope(value);
                setWorkerId(undefined);
                setWorkerIds([]);
                setModelFileId(undefined);
              }}
              options={(['single_model', 'selected_workers', 'all_ready_workers'] as ModelStorageSyncScope[]).map((value) => ({ value, label: intl.formatMessage({ id: `resources.storage.syncBatch.scope.${value}` }) }))}
            />
          </Space>
          <Alert type="info" showIcon message={intl.formatMessage({ id: `resources.storage.syncBatch.description.${scope}` })} />
          {scope === 'single_model' && (
            <>
              <Select
                showSearch
                optionFilterProp="label"
                value={workerId}
                placeholder={intl.formatMessage({ id: 'resources.storage.syncBatch.selectWorker' })}
                onChange={setWorkerId}
                options={readyWorkers.map((worker) => ({ value: worker.id, label: worker.name }))}
              />
              {workerId && !modelsLoading && !models.length ? (
                <Alert type="info" showIcon message={intl.formatMessage({ id: 'resources.storage.syncBatch.noSyncableModels' })} />
              ) : (
                <Select
                  showSearch
                  optionFilterProp="label"
                  value={modelFileId}
                  loading={modelsLoading}
                  disabled={!workerId}
                  placeholder={intl.formatMessage({ id: 'resources.storage.syncBatch.selectModel' })}
                  onChange={setModelFileId}
                  options={models.map((model) => ({ value: model.id, label: `${modelName(model)} (${model.resolved_revision})` }))}
                />
              )}
            </>
          )}
          {scope === 'selected_workers' && (
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              value={workerIds}
              placeholder={intl.formatMessage({ id: 'resources.storage.syncBatch.selectWorker' })}
              onChange={setWorkerIds}
              options={readyWorkers.map((worker) => ({ value: worker.id, label: worker.name }))}
            />
          )}
          {scope === 'all_ready_workers' && !readyWorkers.length && (
            <Alert type="info" showIcon message={intl.formatMessage({ id: 'resources.preheat.noReadyWorkers' })} />
          )}
        </Space>
      )}
    </Modal>
  );
};

export default ModelStorageSyncBatchModal;
