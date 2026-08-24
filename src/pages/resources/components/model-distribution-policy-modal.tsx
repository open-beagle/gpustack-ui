import ModalFooter from '@/components/modal-footer';
import { useIntl } from '@umijs/max';
import { Alert, Form, Input, Modal, Radio, Select } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import {
  createModelPreheatPolicy,
  queryModelPreheatS3Profiles,
  queryModelStorageArtifacts,
  queryModelStorageSyncTasks,
  queryWorkersList
} from '../apis';
import {
  getModelStorageSourceLabel,
  loadAllPaginated
} from '../config/model-preheat';
import type {
  ListItem,
  ModelPreheatS3Profile,
  ModelStorageArtifact,
  ModelStorageSyncTask
} from '../config/types';

interface Props {
  open: boolean;
  initialSyncTaskId?: number;
  onCancel: () => void;
  onSaved: () => void;
}

const ModelDistributionPolicyModal: React.FC<Props> = ({
  open,
  initialSyncTaskId,
  onCancel,
  onSaved
}) => {
  const intl = useIntl();
  const [form] = Form.useForm();
  const [profiles, setProfiles] = useState<ModelPreheatS3Profile[]>([]);
  const [workers, setWorkers] = useState<ListItem[]>([]);
  const [tasks, setTasks] = useState<ModelStorageSyncTask[]>([]);
  const [artifacts, setArtifacts] = useState<ModelStorageArtifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const sourceType = Form.useWatch('source_type', form);
  const profileId = Form.useWatch('profile_id', form);
  const targetScope = Form.useWatch('target_scope', form);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      loadAllPaginated<ModelPreheatS3Profile>((page, perPage) =>
        queryModelPreheatS3Profiles({ page, perPage })
      ),
      loadAllPaginated<ListItem>((page, perPage) =>
        queryWorkersList({ page, perPage })
      ),
      loadAllPaginated<ModelStorageSyncTask>((page, perPage) =>
        queryModelStorageSyncTasks({ page, perPage })
      )
    ])
      .then(([profileItems, workerItems, taskItems]) => {
        const activeProfiles = profileItems.filter(
          (item) => item.lifecycle_state === 'active'
        );
        setProfiles(activeProfiles);
        setWorkers(workerItems.filter((item) => item.state === 'ready'));
        setTasks(
          taskItems.filter(
            (item) => item.state === 'ready' && Boolean(item.artifact_id)
          )
        );
        form.setFieldsValue({
          source_type: initialSyncTaskId ? 'sync_task' : 'artifact',
          sync_task_id: initialSyncTaskId,
          profile_id:
            activeProfiles.find((item) => item.is_default)?.id ||
            activeProfiles[0]?.id,
          target_scope: 'selected_workers',
          worker_uuids: []
        });
      })
      .finally(() => setLoading(false));
  }, [form, initialSyncTaskId, open]);

  useEffect(() => {
    setArtifacts([]);
    form.setFieldValue('artifact_id', undefined);
    if (!open || sourceType !== 'artifact' || !profileId) return;
    void queryModelStorageArtifacts(profileId).then((items) =>
      setArtifacts(items.filter((item) => item.manifest_state === 'valid'))
    );
  }, [form, open, profileId, sourceType]);

  const gpuNames = useMemo(
    () =>
      Array.from(
        new Set(
          workers.flatMap(
            (worker) => worker.status?.gpu_devices?.map((gpu) => gpu.name) || []
          )
        )
      ).map((value) => ({ value, label: value })),
    [workers]
  );

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await createModelPreheatPolicy({
        name: values.name,
        ...(values.source_type === 'artifact'
          ? { profile_id: values.profile_id, artifact_id: values.artifact_id }
          : { sync_task_id: values.sync_task_id }),
        target_scope: values.target_scope,
        worker_selector:
          values.target_scope === 'same_gpu_model'
            ? {}
            : { worker_uuids: values.worker_uuids },
        gpu_selector:
          values.target_scope === 'same_gpu_model'
            ? { gpu_names: values.gpu_names }
            : {}
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      centered
      width={720}
      maskClosable={false}
      title={intl.formatMessage({
        id: 'resources.storage.distributionPolicy.create'
      })}
      onCancel={onCancel}
      footer={
        <ModalFooter
          onOk={save}
          onCancel={onCancel}
          loading={saving}
          okText={intl.formatMessage({ id: 'common.button.save' })}
        />
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={intl.formatMessage({
          id: 'resources.storage.distributionPolicy.hint'
        })}
      />
      <Form form={form} layout="vertical" disabled={loading || saving}>
        <Form.Item
          name="name"
          label={intl.formatMessage({ id: 'resources.preheat.policy.name' })}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="source_type"
          label={intl.formatMessage({
            id: 'resources.storage.distributionPolicy.source'
          })}
        >
          <Radio.Group
            options={[
              {
                value: 'artifact',
                label: intl.formatMessage({
                  id: 'resources.storage.distributionPolicy.artifact'
                })
              },
              {
                value: 'sync_task',
                label: intl.formatMessage({
                  id: 'resources.storage.distributionPolicy.syncTask'
                })
              }
            ]}
          />
        </Form.Item>
        {sourceType === 'artifact' ? (
          <>
            <Form.Item
              name="profile_id"
              label={intl.formatMessage({
                id: 'resources.storage.targetProfile'
              })}
              rules={[{ required: true }]}
            >
              <Select
                options={profiles.map((item) => ({
                  value: item.id,
                  label: item.name
                }))}
              />
            </Form.Item>
            <Form.Item
              name="artifact_id"
              label={intl.formatMessage({
                id: 'resources.storage.distributionPolicy.artifact'
              })}
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={artifacts.map((item) => ({
                  value: item.artifact_id,
                  label: `${getModelStorageSourceLabel(item.source)} · ${item.model_id} (${item.resolved_revision.slice(0, 12)})`
                }))}
              />
            </Form.Item>
          </>
        ) : (
          <Form.Item
            name="sync_task_id"
            label={intl.formatMessage({
              id: 'resources.storage.distributionPolicy.syncTask'
            })}
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={tasks.map((item) => ({
                value: item.id,
                label: `#${item.id} ${getModelStorageSourceLabel(item.source)} · ${item.model_id}`
              }))}
            />
          </Form.Item>
        )}
        <Form.Item
          name="target_scope"
          label={intl.formatMessage({
            id: 'resources.preheat.form.targetScope'
          })}
          rules={[{ required: true }]}
        >
          <Select
            options={['selected_workers', 'same_gpu_model'].map((value) => ({
              value,
              label: intl.formatMessage({
                id: `resources.preheat.target.${value}`
              })
            }))}
          />
        </Form.Item>
        {targetScope === 'same_gpu_model' ? (
          <Form.Item
            name="gpu_names"
            label={intl.formatMessage({
              id: 'resources.preheat.form.gpuModel'
            })}
            rules={[{ required: true }]}
          >
            <Select mode="multiple" options={gpuNames} />
          </Form.Item>
        ) : (
          <Form.Item
            name="worker_uuids"
            label={intl.formatMessage({
              id: 'resources.storage.syncBatch.selectWorker'
            })}
            rules={[{ required: true }]}
          >
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              options={workers.map((item) => ({
                value: item.worker_uuid,
                label: item.name
              }))}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default ModelDistributionPolicyModal;
