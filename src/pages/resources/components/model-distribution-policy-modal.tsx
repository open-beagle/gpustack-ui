import ModalFooter from '@/components/modal-footer';
import ScrollerModal from '@/components/scroller-modal';
import { useIntl } from '@umijs/max';
import { Alert, Button, Form, Input, Select } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createModelPreheatPolicy,
  queryModelPreheatS3Profiles,
  queryModelStorageSyncTask,
  queryWorkersList
} from '../apis';
import { loadAllPaginated } from '../config/model-preheat';
import type { ListItem, ModelPreheatS3Profile } from '../config/types';
import ArtifactSelect, { type ArtifactSelectionState } from './artifact-select';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';
import ModelPreheatCreateSummary from './model-preheat-create-summary';
import ScheduleEditor, {
  getBrowserTimezone,
  getSchedulePayload,
  type ScheduleDraft
} from './model-storage-schedule-editor';
import WorkerUuidMultiSelect, {
  getEligibleWorkerUuidRecords
} from './worker-uuid-multi-select';

interface FormValues extends ScheduleDraft {
  name: string;
  profile_id: number;
  artifact_id: string;
  target_scope: 'selected_workers' | 'same_gpu_model';
  worker_uuids: string[];
  gpu_names: string[];
}

interface Props {
  open: boolean;
  initialSyncTaskId?: number;
  initialProfileId?: number;
  initialArtifactId?: string;
  onCancel: () => void;
  onSaved: () => void;
}

const ModelDistributionPolicyModal: React.FC<Props> = ({
  open,
  initialSyncTaskId,
  initialProfileId,
  initialArtifactId,
  onCancel,
  onSaved
}) => {
  const intl = useIntl();
  const [form] = Form.useForm();
  const [profiles, setProfiles] = useState<ModelPreheatS3Profile[]>([]);
  const [workers, setWorkers] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dependencyRevision, setDependencyRevision] = useState(0);
  const [dataError, setDataError] = useState(false);
  const [saving, setSaving] = useState(false);
  const artifactSelectionRef = useRef<ArtifactSelectionState>({
    status: 'unresolved'
  });
  const [artifactSelection, setArtifactSelection] =
    useState<ArtifactSelectionState>(artifactSelectionRef.current);
  const selectedArtifact = artifactSelection.artifact;
  const [confirmValues, setConfirmValues] = useState<FormValues | null>(null);
  const profileId = Form.useWatch('profile_id', form);
  const targetScope = Form.useWatch('target_scope', form);
  const selectedProfile = profiles.find((item) => item.id === profileId);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setDataError(false);
    artifactSelectionRef.current = { status: 'unresolved' };
    setArtifactSelection(artifactSelectionRef.current);
    Promise.all([
      loadAllPaginated<ModelPreheatS3Profile>((page, perPage) =>
        queryModelPreheatS3Profiles({ page, perPage })
      ),
      loadAllPaginated<ListItem>((page, perPage) =>
        queryWorkersList({ page, perPage })
      ),
      initialSyncTaskId
        ? queryModelStorageSyncTask(initialSyncTaskId)
        : Promise.resolve(null)
    ])
      .then(([profileItems, workerItems, syncTask]) => {
        const activeProfiles = profileItems.filter(
          (item) => item.lifecycle_state === 'active'
        );
        if (
          syncTask &&
          (syncTask.state !== 'ready' ||
            !syncTask.artifact_id ||
            !syncTask.profile?.id ||
            !activeProfiles.some((item) => item.id === syncTask.profile?.id))
        ) {
          throw new Error('sync_task_artifact_not_ready');
        }
        setProfiles(activeProfiles);
        setWorkers(workerItems);
        form.setFieldsValue({
          profile_id:
            syncTask?.profile?.id ||
            initialProfileId ||
            activeProfiles.find((item) => item.is_default)?.id ||
            activeProfiles[0]?.id,
          artifact_id: syncTask?.artifact_id || initialArtifactId,
          target_scope: 'selected_workers',
          worker_uuids: [],
          trigger_mode: 'manual',
          schedule_preset: 'manual',
          timezone: getBrowserTimezone()
        });
      })
      .catch(() => setDataError(true))
      .finally(() => setLoading(false));
  }, [
    dependencyRevision,
    form,
    initialArtifactId,
    initialProfileId,
    initialSyncTaskId,
    open
  ]);

  const gpuNames = useMemo(
    () =>
      Array.from(
        new Set(
          getEligibleWorkerUuidRecords(workers).flatMap(
            (worker) => worker.status?.gpu_devices?.map((gpu) => gpu.name) || []
          )
        )
      ).map((value) => ({ value, label: value })),
    [workers]
  );

  const save = async () => {
    const values = (await form.validateFields()) as FormValues;
    setConfirmValues(values);
  };

  const confirmSave = async () => {
    if (!confirmValues) return;
    const values = confirmValues;
    setSaving(true);
    try {
      const schedulePayload = getSchedulePayload(values, true);
      await createModelPreheatPolicy({
        name: values.name,
        profile_id: values.profile_id,
        artifact_id: values.artifact_id,
        target_scope: values.target_scope,
        worker_selector:
          values.target_scope === 'same_gpu_model'
            ? {}
            : { worker_uuids: values.worker_uuids },
        gpu_selector:
          values.target_scope === 'same_gpu_model'
            ? { gpu_names: values.gpu_names }
            : {},
        ...schedulePayload,
        timezone: values.timezone || 'UTC'
      });
      setConfirmValues(null);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const targetCapacity =
    confirmValues?.target_scope === 'selected_workers'
      ? getEligibleWorkerUuidRecords(workers)
          .filter((worker) =>
            confirmValues.worker_uuids.includes(worker.worker_uuid)
          )
          .reduce(
            (total, worker) =>
              total +
              (worker.status?.filesystem || []).reduce(
                (available, filesystem) =>
                  available + (filesystem.available || 0),
                0
              ),
            0
          )
      : null;

  return (
    <ScrollerModal
      open={open}
      centered
      width={720}
      maskClosable={false}
      title={intl.formatMessage({
        id: 'resources.storage.distributionPolicy.create'
      })}
      styles={{ body: { maxHeight: '68vh', overflowY: 'auto' } }}
      onCancel={onCancel}
      footer={
        <ModalFooter
          onOk={save}
          onCancel={onCancel}
          loading={saving}
          okText={intl.formatMessage({ id: 'common.button.save' })}
          okBtnProps={{
            disabled:
              loading ||
              dataError ||
              saving ||
              Boolean(confirmValues) ||
              artifactSelection.status !== 'valid'
          }}
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
      {dataError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message={intl.formatMessage({
            id: 'resources.preheat.dependencies.loadFailed'
          })}
          action={
            <Button
              size="small"
              onClick={() => setDependencyRevision((revision) => revision + 1)}
            >
              {intl.formatMessage({ id: 'common.button.retry' })}
            </Button>
          }
        />
      )}
      <Form
        form={form}
        layout="vertical"
        disabled={loading || saving || dataError || Boolean(confirmValues)}
        onValuesChange={(changedValues) => {
          if (
            !Object.prototype.hasOwnProperty.call(changedValues, 'profile_id')
          )
            return;
          artifactSelectionRef.current = { status: 'unresolved' };
          setArtifactSelection(artifactSelectionRef.current);
          form.setFieldValue('artifact_id', undefined);
        }}
      >
        <Form.Item
          name="name"
          label={intl.formatMessage({ id: 'resources.preheat.policy.name' })}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <ScheduleEditor
          allowContinuous
          disabled={loading || saving || dataError || Boolean(confirmValues)}
        />
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
            rules={[
              { required: true },
              {
                validator: async (_, value) => {
                  if (!value) return;
                  const selection = artifactSelectionRef.current;
                  if (selection.status === 'resolving') {
                    throw new Error(
                      intl.formatMessage({
                        id: 'resources.storage.artifact.resolving'
                      })
                    );
                  }
                  if (
                    selection.status !== 'valid' ||
                    selection.artifact?.artifact_id !== value ||
                    selection.artifact?.manifest_state !== 'valid'
                  ) {
                    throw new Error(
                      intl.formatMessage({
                        id: 'resources.storage.artifact.unresolved'
                      })
                    );
                  }
                }
              }
            ]}
          >
            <ArtifactSelect
              profileId={profileId}
              profileName={selectedProfile?.name}
              onSelectionChange={(selection) => {
                artifactSelectionRef.current = selection;
                setArtifactSelection(selection);
                Promise.resolve().then(() => {
                  if (form.getFieldValue('artifact_id'))
                    void form
                      .validateFields(['artifact_id'])
                      .catch(() => undefined);
                });
              }}
            />
          </Form.Item>
        </>
        <Form.Item
          name="target_scope"
          label={intl.formatMessage({
            id: 'resources.preheat.targetScope'
          })}
          rules={[{ required: true }]}
        >
          <Select
            options={['selected_workers', 'same_gpu_model'].map((value) => ({
              value,
              label: intl.formatMessage({
                id: `resources.preheat.scope.${value}`
              })
            }))}
          />
        </Form.Item>
        {targetScope === 'same_gpu_model' ? (
          <Form.Item
            name="gpu_names"
            label={intl.formatMessage({
              id: 'resources.preheat.gpuModel'
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
            <WorkerUuidMultiSelect workers={workers} />
          </Form.Item>
        )}
      </Form>
      <ModelPreheatConfirmModal
        open={Boolean(confirmValues)}
        title={intl.formatMessage({ id: 'resources.preheat.confirm.title' })}
        content={
          <ModelPreheatCreateSummary
            formatMessage={intl.formatMessage}
            flow={intl.formatMessage(
              { id: 'resources.preheat.confirm.flow.artifact' },
              {
                model:
                  selectedArtifact?.model_id ||
                  confirmValues?.artifact_id ||
                  '',
                profile: selectedProfile?.name || ''
              }
            )}
            targetCount={
              confirmValues?.target_scope === 'selected_workers'
                ? getEligibleWorkerUuidRecords(workers).filter((worker) =>
                    confirmValues.worker_uuids.includes(worker.worker_uuid)
                  ).length
                : 0
            }
            targetPending={confirmValues?.target_scope === 'same_gpu_model'}
            capacityBytes={targetCapacity}
            artifactBytes={selectedArtifact?.total_size}
            kind="artifact"
          />
        }
        okText={intl.formatMessage({ id: 'common.button.save' })}
        loading={saving}
        onOk={confirmSave}
        onCancel={() => setConfirmValues(null)}
      />
    </ScrollerModal>
  );
};

export default ModelDistributionPolicyModal;
