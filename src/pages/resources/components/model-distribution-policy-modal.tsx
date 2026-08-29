import ModalFooter from '@/components/modal-footer';
import ScrollerModal from '@/components/scroller-modal';
import { useIntl } from '@umijs/max';
import { Alert, Button, Form, Input, Segmented, Select } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createModelPreheatPolicy,
  queryModelPreheatS3Profiles,
  queryModelStorageArtifacts,
  queryModelStorageSyncTask,
  queryWorkersList,
  updateModelPreheatPolicy
} from '../apis';
import {
  extractModelStorageErrorCode,
  loadAllPaginated
} from '../config/model-preheat';
import type {
  ListItem,
  ModelPreheatDistributionPolicy,
  ModelPreheatDistributionPolicyCreate,
  ModelPreheatDistributionPolicyUpdate,
  ModelPreheatS3Profile,
  ModelStorageArtifact
} from '../config/types';
import ArtifactSelect, { type ArtifactSelectionState } from './artifact-select';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';
import ModelPreheatCreateSummary from './model-preheat-create-summary';
import { ModelStorageErrorAlert } from './model-storage-error-details';
import ScheduleEditor, {
  getBrowserTimezone,
  getSchedulePayload,
  parseScheduleCron,
  type ScheduleDraft
} from './model-storage-schedule-editor';
import WorkerUuidMultiSelect, {
  getEligibleWorkerUuidRecords
} from './worker-uuid-multi-select';

interface FormValues extends ScheduleDraft {
  name: string;
  profile_id: number;
  selection_mode: 'fixed' | 'selected' | 'all_current';
  artifact_id?: string;
  artifact_ids: string[];
  target_scope: 'selected_workers' | 'same_gpu_model';
  worker_uuids: string[];
  gpu_names: string[];
}

interface Props {
  open: boolean;
  record?: ModelPreheatDistributionPolicy | null;
  initialSyncTaskId?: number;
  initialProfileId?: number;
  initialArtifactId?: string;
  initialArtifacts?: ModelStorageArtifact[];
  initialSelectionMode?: FormValues['selection_mode'];
  onCancel: () => void;
  onSaved: () => void;
}

const EMPTY_ARTIFACTS: ModelStorageArtifact[] = [];

const getRecordSchedule = (record?: ModelPreheatDistributionPolicy | null) => {
  if (!record)
    return {
      trigger_mode: 'manual' as const,
      schedule_preset: 'manual' as const,
      timezone: getBrowserTimezone()
    };
  if (record.trigger_mode === 'continuous')
    return {
      trigger_mode: 'continuous' as const,
      schedule_preset: 'continuous' as const,
      cron_expression: null,
      timezone: record.timezone
    };
  return {
    trigger_mode: record.trigger_mode,
    cron_expression: record.cron_expression,
    timezone: record.timezone,
    ...parseScheduleCron(record.cron_expression)
  };
};

const ModelDistributionPolicyModal: React.FC<Props> = ({
  open,
  record,
  initialSyncTaskId,
  initialProfileId,
  initialArtifactId,
  initialArtifacts = EMPTY_ARTIFACTS,
  initialSelectionMode = 'fixed',
  onCancel,
  onSaved
}) => {
  const intl = useIntl();
  const [form] = Form.useForm<FormValues>();
  const [profiles, setProfiles] = useState<ModelPreheatS3Profile[]>([]);
  const [workers, setWorkers] = useState<ListItem[]>([]);
  const [artifacts, setArtifacts] = useState<ModelStorageArtifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [artifactLoading, setArtifactLoading] = useState(false);
  const [dependencyRevision, setDependencyRevision] = useState(0);
  const [dataError, setDataError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const artifactSelectionRef = useRef<ArtifactSelectionState>({
    status: 'unresolved'
  });
  const [artifactSelection, setArtifactSelection] =
    useState<ArtifactSelectionState>(artifactSelectionRef.current);
  const [confirmValues, setConfirmValues] = useState<FormValues | null>(null);
  const profileId = Form.useWatch('profile_id', form);
  const targetScope = Form.useWatch('target_scope', form);
  const selectionMode = Form.useWatch('selection_mode', form) || 'fixed';
  const selectedProfile = profiles.find((item) => item.id === profileId);
  const structuralLocked = Boolean(record && !record.structural_editable);
  const formBusy = loading || saving || dataError || Boolean(confirmValues);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setDataError(false);
    setSaveError(null);
    setConfirmValues(null);
    artifactSelectionRef.current = { status: 'unresolved' };
    setArtifactSelection(artifactSelectionRef.current);
    const load = async () => {
      const [profileItems, workerItems, syncTask] = await Promise.all([
        loadAllPaginated<ModelPreheatS3Profile>((page, perPage) =>
          queryModelPreheatS3Profiles({ page, perPage })
        ),
        loadAllPaginated<ListItem>((page, perPage) =>
          queryWorkersList({ page, perPage })
        ),
        initialSyncTaskId
          ? queryModelStorageSyncTask(initialSyncTaskId)
          : Promise.resolve(null)
      ]);
      if (!active) return;
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
      const nextProfileId =
        record?.profile_id ||
        syncTask?.profile?.id ||
        initialProfileId ||
        activeProfiles.find((item) => item.is_default)?.id ||
        activeProfiles[0]?.id;
      const nextSelectionMode =
        record?.selection_mode || initialSelectionMode || 'fixed';
      const matchingInitialArtifacts =
        initialProfileId === nextProfileId ? initialArtifacts : [];
      setProfiles(activeProfiles);
      setWorkers(workerItems);
      setArtifacts(matchingInitialArtifacts);
      form.setFieldsValue({
        name: record?.name,
        profile_id: nextProfileId,
        selection_mode: nextSelectionMode,
        artifact_id:
          record?.source_artifact || syncTask?.artifact_id || initialArtifactId,
        artifact_ids:
          record?.artifact_ids ||
          matchingInitialArtifacts.map((item) => item.artifact_id),
        target_scope:
          (record?.target_scope as FormValues['target_scope']) ||
          'selected_workers',
        worker_uuids:
          (record?.worker_selector?.worker_uuids as string[] | undefined) || [],
        gpu_names:
          (record?.gpu_selector?.gpu_names as string[] | undefined) || [],
        ...getRecordSchedule(record)
      });
    };
    void load()
      .catch(() => {
        if (active) setDataError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    dependencyRevision,
    form,
    initialArtifactId,
    initialArtifacts,
    initialProfileId,
    initialSelectionMode,
    initialSyncTaskId,
    open,
    record
  ]);

  useEffect(() => {
    if (!open || !profileId) return;
    let active = true;
    setArtifactLoading(true);
    void loadAllPaginated<ModelStorageArtifact>((page, perPage) =>
      queryModelStorageArtifacts(profileId, { page, perPage })
    )
      .then((items) => {
        if (!active) return;
        setArtifacts(items);
        if (!structuralLocked) {
          const validIds = new Set(
            items
              .filter((item) => item.manifest_state === 'valid')
              .map((item) => item.artifact_id)
          );
          const selectedIds: string[] =
            form.getFieldValue('artifact_ids') || [];
          form.setFieldValue(
            'artifact_ids',
            selectedIds.filter((id) => validIds.has(id))
          );
        }
      })
      .catch(() => {
        if (active) setDataError(true);
      })
      .finally(() => {
        if (active) setArtifactLoading(false);
      });
    return () => {
      active = false;
    };
  }, [form, open, profileId, structuralLocked]);

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
  const validArtifacts = useMemo(
    () => artifacts.filter((item) => item.manifest_state === 'valid'),
    [artifacts]
  );

  const save = async () => {
    setSaveError(null);
    const values = await form.validateFields();
    setConfirmValues(values);
  };

  const buildStructuralPayload = (
    values: FormValues
  ): ModelPreheatDistributionPolicyCreate => {
    const schedulePayload = getSchedulePayload(values, true);
    return {
      name: values.name,
      profile_id: values.profile_id,
      selection_mode: values.selection_mode,
      ...(values.selection_mode === 'fixed'
        ? { artifact_id: values.artifact_id }
        : values.selection_mode === 'selected'
          ? { artifact_ids: [...new Set(values.artifact_ids)].sort() }
          : {}),
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
    };
  };

  const confirmSave = async () => {
    if (!confirmValues) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = buildStructuralPayload(confirmValues);
      if (record) {
        const update: ModelPreheatDistributionPolicyUpdate = structuralLocked
          ? {
              name: payload.name,
              trigger_mode: payload.trigger_mode,
              cron_expression: payload.cron_expression,
              timezone: payload.timezone
            }
          : payload;
        await updateModelPreheatPolicy(record.id, update);
      } else {
        await createModelPreheatPolicy(payload);
      }
      setConfirmValues(null);
      onSaved();
    } catch (error) {
      setSaveError(extractModelStorageErrorCode(error) || 'unknown');
      setConfirmValues(null);
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
  const selectedArtifact =
    artifactSelection.artifact ||
    validArtifacts.find(
      (item) => item.artifact_id === confirmValues?.artifact_id
    );
  const selectedArtifactBytes = validArtifacts
    .filter((item) => confirmValues?.artifact_ids?.includes(item.artifact_id))
    .reduce((total, item) => total + item.total_size, 0);

  return (
    <ScrollerModal
      open={open}
      centered
      width={760}
      maskClosable={false}
      title={intl.formatMessage({
        id: record
          ? 'resources.storage.distributionPolicy.edit'
          : 'resources.storage.distributionPolicy.create'
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
              formBusy ||
              artifactLoading ||
              (selectionMode === 'fixed' &&
                artifactSelection.status !== 'valid' &&
                !structuralLocked)
          }}
        />
      }
    >
      <Form
        form={form}
        layout="vertical"
        disabled={formBusy}
        onValuesChange={(changedValues) => {
          if (
            Object.prototype.hasOwnProperty.call(changedValues, 'profile_id')
          ) {
            setArtifacts([]);
            artifactSelectionRef.current = { status: 'unresolved' };
            setArtifactSelection(artifactSelectionRef.current);
            form.setFieldsValue({ artifact_id: undefined, artifact_ids: [] });
          }
          if (
            Object.prototype.hasOwnProperty.call(
              changedValues,
              'selection_mode'
            )
          ) {
            artifactSelectionRef.current = { status: 'unresolved' };
            setArtifactSelection(artifactSelectionRef.current);
            form.setFieldsValue({ artifact_id: undefined, artifact_ids: [] });
          }
        }}
      >
        <Form.Item
          name="name"
          label={intl.formatMessage({ id: 'resources.preheat.policy.name' })}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={intl.formatMessage({
            id: structuralLocked
              ? 'resources.storage.distributionPolicy.structureLocked'
              : 'resources.storage.distributionPolicy.hint'
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
                onClick={() => setDependencyRevision((value) => value + 1)}
              >
                {intl.formatMessage({ id: 'common.button.retry' })}
              </Button>
            }
          />
        )}
        {saveError && (
          <ModelStorageErrorAlert
            errorCode={saveError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <ScheduleEditor allowContinuous disabled={formBusy} />
        <Form.Item
          name="selection_mode"
          label={intl.formatMessage({
            id: 'resources.storage.distributionPolicy.selectionMode'
          })}
          rules={[{ required: true }]}
        >
          <Segmented
            block
            disabled={formBusy || structuralLocked}
            options={['fixed', 'selected', 'all_current'].map((value) => ({
              value,
              label: intl.formatMessage({
                id: `resources.storage.distributionPolicy.selectionMode.${value}`
              })
            }))}
          />
        </Form.Item>
        <Form.Item
          name="profile_id"
          label={intl.formatMessage({ id: 'resources.storage.targetProfile' })}
          rules={[{ required: true }]}
        >
          <Select
            disabled={formBusy || structuralLocked}
            options={profiles.map((item) => ({
              value: item.id,
              label: item.name
            }))}
          />
        </Form.Item>
        {selectionMode === 'fixed' && (
          <Form.Item
            name="artifact_id"
            label={intl.formatMessage({
              id: 'resources.storage.distributionPolicy.artifact'
            })}
            rules={[
              { required: true },
              {
                validator: async (_, value) => {
                  if (!value || structuralLocked) return;
                  const selection = artifactSelectionRef.current;
                  if (selection.status === 'resolving')
                    throw new Error(
                      intl.formatMessage({
                        id: 'resources.storage.artifact.resolving'
                      })
                    );
                  if (
                    selection.status !== 'valid' ||
                    selection.artifact?.artifact_id !== value ||
                    selection.artifact?.manifest_state !== 'valid'
                  )
                    throw new Error(
                      intl.formatMessage({
                        id: 'resources.storage.artifact.unresolved'
                      })
                    );
                }
              }
            ]}
          >
            <ArtifactSelect
              profileId={profileId}
              profileName={selectedProfile?.name}
              disabled={structuralLocked}
              onSelectionChange={(selection) => {
                artifactSelectionRef.current = selection;
                setArtifactSelection(selection);
              }}
            />
          </Form.Item>
        )}
        {selectionMode === 'selected' && (
          <Form.Item
            name="artifact_ids"
            label={intl.formatMessage({
              id: 'resources.storage.distributionPolicy.artifacts'
            })}
            rules={[
              { required: true },
              {
                validator: async (_, values: string[] = []) => {
                  if (structuralLocked) return;
                  const validIds = new Set(
                    validArtifacts.map((item) => item.artifact_id)
                  );
                  if (
                    !values.length ||
                    values.some((value) => !validIds.has(value))
                  )
                    throw new Error(
                      intl.formatMessage({
                        id: 'resources.storage.artifact.unresolved'
                      })
                    );
                }
              }
            ]}
          >
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              loading={artifactLoading}
              disabled={formBusy || structuralLocked}
              options={validArtifacts.map((item) => ({
                value: item.artifact_id,
                label: `${item.model_id} · ${item.resolved_revision}`
              }))}
            />
          </Form.Item>
        )}
        <Form.Item
          name="target_scope"
          label={intl.formatMessage({ id: 'resources.preheat.targetScope' })}
          rules={[{ required: true }]}
        >
          <Select
            disabled={formBusy || structuralLocked}
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
            label={intl.formatMessage({ id: 'resources.preheat.gpuModel' })}
            rules={[{ required: true }]}
          >
            <Select
              mode="multiple"
              disabled={formBusy || structuralLocked}
              options={gpuNames}
            />
          </Form.Item>
        ) : (
          <Form.Item
            name="worker_uuids"
            label={intl.formatMessage({
              id: 'resources.storage.syncBatch.selectWorker'
            })}
            rules={[{ required: true }]}
          >
            <WorkerUuidMultiSelect
              workers={workers}
              disabled={formBusy || structuralLocked}
            />
          </Form.Item>
        )}
      </Form>
      <ModelPreheatConfirmModal
        open={Boolean(confirmValues)}
        getContainer={false}
        title={intl.formatMessage({ id: 'resources.preheat.confirm.title' })}
        content={
          <ModelPreheatCreateSummary
            formatMessage={intl.formatMessage}
            flow={intl.formatMessage(
              {
                id:
                  confirmValues?.selection_mode === 'all_current'
                    ? 'resources.storage.distributionPolicy.confirm.allCurrent'
                    : confirmValues?.selection_mode === 'selected'
                      ? 'resources.storage.distributionPolicy.confirm.selected'
                      : 'resources.preheat.confirm.flow.artifact'
              },
              {
                count: confirmValues?.artifact_ids?.length || 0,
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
            artifactBytes={
              confirmValues?.selection_mode === 'selected'
                ? selectedArtifactBytes
                : selectedArtifact?.total_size
            }
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
