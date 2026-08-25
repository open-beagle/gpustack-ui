import ModalFooter from '@/components/modal-footer';
import ScrollerModal from '@/components/scroller-modal';
import {
  DeleteOutlined,
  EditOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
  Button,
  Form,
  Input,
  message,
  Select,
  Space,
  Table,
  Tag,
  Tooltip
} from 'antd';
import dayjs from 'dayjs';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  createModelStorageSyncPolicy,
  deleteModelStorageSyncPolicy,
  queryModelFilesList,
  queryModelPreheatS3Profiles,
  queryModelStorageSyncPolicies,
  queryWorkersList,
  runModelStorageSyncPolicyNow,
  updateModelStorageSyncPolicy
} from '../apis';
import { buildSyncPolicyPatch } from '../config/model-policy';
import {
  extractModelStorageErrorCode,
  getModelFileStorageModelId,
  getModelFileSyncActionState,
  IdempotencyKeyLifecycle,
  loadAllPaginated
} from '../config/model-preheat';
import type {
  ListItem,
  ModelFile,
  ModelPreheatS3Profile,
  ModelStorageSyncPolicy,
  ModelStorageSyncPolicyCreate,
  ModelStorageSyncScope
} from '../config/types';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';
import { ModelStorageErrorAlert } from './model-storage-error-details';
import ScheduleEditor, {
  getBrowserTimezone,
  getSchedulePayload,
  parseScheduleCron,
  type ScheduleDraft
} from './model-storage-schedule-editor';

type Action = 'enable' | 'disable' | 'run' | 'delete';

const defaults: ModelStorageSyncPolicyCreate = {
  name: '',
  enabled: true,
  trigger_mode: 'manual',
  cron_expression: null,
  timezone: getBrowserTimezone(),
  profile_id: 0,
  scope: 'all_ready_workers',
  model_file_id: null,
  worker_uuids: []
};

const ModelStorageSyncPolicies: React.FC = () => {
  const intl = useIntl();
  const [form] = Form.useForm<ModelStorageSyncPolicyCreate>();
  const [items, setItems] = useState<ModelStorageSyncPolicy[]>([]);
  const [profiles, setProfiles] = useState<ModelPreheatS3Profile[]>([]);
  const [workers, setWorkers] = useState<ListItem[]>([]);
  const [models, setModels] = useState<ModelFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [dependencyLoading, setDependencyLoading] = useState(false);
  const [dependencyError, setDependencyError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ModelStorageSyncPolicy | null>(null);
  const [confirm, setConfirm] = useState<{
    policy: ModelStorageSyncPolicy;
    action: Action;
  } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number>();
  const [actionError, setActionError] = useState<string | null>(null);
  const key = useRef(new IdempotencyKeyLifecycle());
  const scope = Form.useWatch('scope', form);

  useEffect(() => {
    if (confirm) setActionError(null);
  }, [confirm?.action, confirm?.policy.id]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [result, profileItems] = await Promise.all([
        queryModelStorageSyncPolicies({ page: 1, perPage: 100 }),
        loadAllPaginated<ModelPreheatS3Profile>((page, perPage) =>
          queryModelPreheatS3Profiles({ page, perPage })
        )
      ]);
      setItems(result.items);
      setProfiles(profileItems);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEditor = async (record?: ModelStorageSyncPolicy) => {
    setEditing(record || null);
    setOpen(true);
    setDependencyError(false);
    setDependencyLoading(true);
    try {
      const [profileItems, workerItems, modelItems] = await Promise.all([
        loadAllPaginated<ModelPreheatS3Profile>((page, perPage) =>
          queryModelPreheatS3Profiles({ page, perPage })
        ),
        loadAllPaginated<ListItem>((page, perPage) =>
          queryWorkersList({ page, perPage })
        ),
        loadAllPaginated<ModelFile>((page, perPage) =>
          queryModelFilesList({ page, perPage })
        )
      ]);
      setProfiles(profileItems);
      setWorkers(workerItems);
      setModels(modelItems);
      const values = record
        ? { ...record, ...parseScheduleCron(record.cron_expression) }
        : {
            ...defaults,
            ...parseScheduleCron(defaults.cron_expression),
            profile_id:
              profileItems.find(
                (item) => item.is_default && item.lifecycle_state === 'active'
              )?.id || 0
          };
      form.setFieldsValue(values);
    } catch {
      setDependencyError(true);
    } finally {
      setDependencyLoading(false);
    }
  };

  const profileInMaintenance = (policy: ModelStorageSyncPolicy) =>
    profiles.find((item) => item.id === policy.profile_id)?.lifecycle_state ===
    'maintenance';
  const editingProfileMaintenance = Boolean(
    editing && profileInMaintenance(editing)
  );
  const actionDisabledReason = (
    policy: ModelStorageSyncPolicy,
    action: 'run' | 'enable'
  ) => {
    if (profileInMaintenance(policy)) {
      return 'resources.storage.syncPolicy.disabled.profileMaintenance';
    }
    if (action === 'run' && !policy.enabled) {
      return 'resources.storage.syncPolicy.disabled.policyDisabled';
    }
    return undefined;
  };

  const save = async () => {
    const values =
      (await form.validateFields()) as ModelStorageSyncPolicyCreate &
        ScheduleDraft;
    const {
      schedule_preset: _schedulePreset,
      schedule_time: _scheduleTime,
      schedule_weekday: _scheduleWeekday,
      ...formValues
    } = values;
    const schedulePayload = getSchedulePayload(values);
    const payload: ModelStorageSyncPolicyCreate = {
      ...formValues,
      ...schedulePayload,
      model_file_id:
        values.scope === 'single_model' ? values.model_file_id : null,
      worker_uuids:
        values.scope === 'selected_workers' ? values.worker_uuids : []
    };
    setSaving(true);
    try {
      if (editing) {
        const patch = editingProfileMaintenance
          ? buildSyncPolicyPatch(editing, payload).name === undefined
            ? {}
            : { name: payload.name }
          : buildSyncPolicyPatch(editing, payload);
        if (Object.keys(patch).length) {
          await updateModelStorageSyncPolicy(editing.id, patch);
        }
      } else await createModelStorageSyncPolicy(payload);
      setOpen(false);
      await load();
      message.success(intl.formatMessage({ id: 'common.message.success' }));
    } finally {
      setSaving(false);
    }
  };

  const act = async () => {
    if (!confirm) return;
    if (
      profileInMaintenance(confirm.policy) &&
      (confirm.action === 'run' || confirm.action === 'enable')
    )
      return;
    setActionLoadingId(confirm.policy.id);
    try {
      if (confirm.action === 'delete')
        await deleteModelStorageSyncPolicy(confirm.policy.id);
      else if (confirm.action === 'run') {
        await runModelStorageSyncPolicyNow(
          confirm.policy.id,
          key.current.current()
        );
        key.current.complete();
      } else
        await updateModelStorageSyncPolicy(confirm.policy.id, {
          enabled: confirm.action === 'enable'
        });
      setConfirm(null);
      await load();
      message.success(intl.formatMessage({ id: 'common.message.success' }));
    } catch (error) {
      setActionError(extractModelStorageErrorCode(error) || 'unknown');
    } finally {
      setActionLoadingId(undefined);
    }
  };

  const workerOptions = useMemo(
    () =>
      workers.map((item) => {
        const latest = workers
          .filter((candidate) => candidate.worker_uuid === item.worker_uuid)
          .sort((left, right) => right.id - left.id)[0];
        const reason =
          latest?.id !== item.id
            ? intl.formatMessage({ id: 'resources.storage.workerNotCurrent' })
            : item.state !== 'ready'
              ? intl.formatMessage({
                  id: 'resources.storage.workerUnavailable'
                })
              : item.model_storage_protocol_version !== 1
                ? intl.formatMessage({
                    id: 'resources.storage.workerProtocolIncompatible'
                  })
                : undefined;
        return {
          label: `${item.name} · ${item.state === 'ready' ? 'Ready' : item.state}${reason ? ` · ${reason}` : ''}`,
          value: item.worker_uuid,
          disabled: Boolean(reason)
        };
      }),
    [intl, workers]
  );

  const modelOptions = useMemo(
    () =>
      models.map((item) => {
        const action = getModelFileSyncActionState(item, undefined, false);
        const reason =
          action.reason === 'unsupported'
            ? intl.formatMessage({
                id: 'resources.storage.sync.unsupportedSource'
              })
            : action.reason === 'worker_unavailable'
              ? intl.formatMessage({
                  id: 'resources.storage.workerUnavailable'
                })
              : action.reason === 'model_not_ready'
                ? intl.formatMessage({
                    id: 'resources.storage.sync.modelNotReady'
                  })
                : undefined;
        return {
          value: item.id,
          label: `${getModelFileStorageModelId(item)}${reason ? ` · ${reason}` : ''}`,
          disabled: action.disabled
        };
      }),
    [intl, models]
  );

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
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => void openEditor()}
        >
          {intl.formatMessage({ id: 'resources.storage.syncPolicy.create' })}
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        pagination={false}
        columns={[
          {
            title: intl.formatMessage({ id: 'resources.preheat.policy.name' }),
            dataIndex: 'name'
          },
          {
            title: intl.formatMessage({
              id: 'resources.preheat.schedule.triggerMode'
            }),
            dataIndex: 'trigger_mode',
            render: (value) =>
              intl.formatMessage({
                id: `resources.preheat.schedule.triggerMode.${value}`
              })
          },
          {
            title: intl.formatMessage({
              id: 'resources.storage.syncBatch.scope'
            }),
            dataIndex: 'scope',
            render: (value) =>
              intl.formatMessage({
                id: `resources.storage.syncBatch.scope.${value}`
              })
          },
          {
            title: intl.formatMessage({
              id: 'resources.preheat.schedule.nextRun'
            }),
            dataIndex: 'next_run_at',
            render: (value) =>
              value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'
          },
          {
            title: intl.formatMessage({ id: 'common.table.status' }),
            dataIndex: 'enabled',
            render: (value) => (
              <Tag color={value ? 'success' : 'default'}>
                {value
                  ? intl.formatMessage({
                      id: 'resources.preheat.policy.enable'
                    })
                  : intl.formatMessage({
                      id: 'resources.preheat.policy.disable'
                    })}
              </Tag>
            )
          },
          {
            title: intl.formatMessage({ id: 'common.table.operation' }),
            width: 190,
            render: (_, record) => (
              <Space size={2}>
                <Tooltip
                  title={intl.formatMessage({ id: 'common.button.edit' })}
                >
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    aria-label={intl.formatMessage({
                      id: 'common.button.edit'
                    })}
                    onClick={() => void openEditor(record)}
                  />
                </Tooltip>
                <Tooltip
                  title={intl.formatMessage({
                    id:
                      actionDisabledReason(record, 'run') ||
                      'resources.preheat.schedule.runNow'
                  })}
                >
                  <Button
                    type="text"
                    disabled={
                      actionLoadingId === record.id ||
                      !record.enabled ||
                      profileInMaintenance(record)
                    }
                    loading={
                      actionLoadingId === record.id && confirm?.action === 'run'
                    }
                    icon={<ThunderboltOutlined />}
                    aria-label={intl.formatMessage({
                      id: 'resources.preheat.schedule.runNow'
                    })}
                    onClick={() => {
                      key.current.start();
                      setConfirm({ policy: record, action: 'run' });
                    }}
                  />
                </Tooltip>
                <Tooltip
                  title={intl.formatMessage({
                    id:
                      actionDisabledReason(record, 'enable') ||
                      (record.enabled
                        ? 'resources.preheat.policy.disable'
                        : 'resources.preheat.policy.enable')
                  })}
                >
                  <Button
                    type="text"
                    disabled={
                      actionLoadingId === record.id ||
                      (!record.enabled && profileInMaintenance(record))
                    }
                    loading={
                      actionLoadingId === record.id &&
                      (confirm?.action === 'enable' ||
                        confirm?.action === 'disable')
                    }
                    icon={
                      record.enabled ? (
                        <PauseCircleOutlined />
                      ) : (
                        <PlayCircleOutlined />
                      )
                    }
                    aria-label={intl.formatMessage({
                      id: record.enabled
                        ? 'resources.preheat.policy.disable'
                        : 'resources.preheat.policy.enable'
                    })}
                    onClick={() =>
                      setConfirm({
                        policy: record,
                        action: record.enabled ? 'disable' : 'enable'
                      })
                    }
                  />
                </Tooltip>
                <Tooltip
                  title={intl.formatMessage({ id: 'common.button.delete' })}
                >
                  <Button
                    type="text"
                    danger
                    disabled={actionLoadingId === record.id}
                    loading={
                      actionLoadingId === record.id &&
                      confirm?.action === 'delete'
                    }
                    icon={<DeleteOutlined />}
                    aria-label={intl.formatMessage({
                      id: 'common.button.delete'
                    })}
                    onClick={() =>
                      setConfirm({ policy: record, action: 'delete' })
                    }
                  />
                </Tooltip>
              </Space>
            )
          }
        ]}
      />
      <ScrollerModal
        open={open}
        centered
        width={720}
        maskClosable={false}
        title={intl.formatMessage({
          id: editing
            ? 'resources.storage.syncPolicy.edit'
            : 'resources.storage.syncPolicy.create'
        })}
        onCancel={() => setOpen(false)}
        styles={{ body: { maxHeight: '68vh', overflowY: 'auto' } }}
        footer={
          <ModalFooter
            onOk={save}
            onCancel={() => setOpen(false)}
            loading={saving}
            okText={intl.formatMessage({ id: 'common.button.save' })}
            okBtnProps={{ disabled: dependencyLoading || dependencyError }}
            cancelBtnProps={{ disabled: saving }}
          />
        }
      >
        {dependencyError && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={intl.formatMessage({
              id: 'resources.storage.state.error'
            })}
            action={
              <Button
                type="link"
                onClick={() => void openEditor(editing || undefined)}
              >
                {intl.formatMessage({ id: 'resources.storage.retry' })}
              </Button>
            }
          />
        )}
        <Form form={form} layout="vertical">
          {editingProfileMaintenance && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={intl.formatMessage({
                id: 'resources.storage.syncPolicy.maintenanceReadonly'
              })}
            />
          )}
          <Form.Item
            name="name"
            label={intl.formatMessage({ id: 'resources.preheat.policy.name' })}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <ScheduleEditor disabled={editingProfileMaintenance} />
          <Form.Item
            name="profile_id"
            label={intl.formatMessage({
              id: 'resources.storage.targetProfile'
            })}
            rules={[{ required: true }]}
          >
            <Select
              disabled={editingProfileMaintenance}
              options={profiles.map((item) => ({
                label:
                  item.lifecycle_state === 'maintenance'
                    ? `${item.name} (${intl.formatMessage({ id: 'resources.preheat.profile.maintenance' })})`
                    : item.name,
                value: item.id,
                disabled: item.lifecycle_state === 'maintenance'
              }))}
            />
          </Form.Item>
          <Form.Item
            name="scope"
            label={intl.formatMessage({
              id: 'resources.storage.syncBatch.scope'
            })}
            rules={[{ required: true }]}
          >
            <Select
              disabled={editingProfileMaintenance}
              options={(
                [
                  'single_model',
                  'selected_workers',
                  'all_ready_workers'
                ] as ModelStorageSyncScope[]
              ).map((value) => ({
                value,
                label: intl.formatMessage({
                  id: `resources.storage.syncBatch.scope.${value}`
                })
              }))}
            />
          </Form.Item>
          {scope === 'single_model' && (
            <Form.Item
              name="model_file_id"
              label={intl.formatMessage({
                id: 'resources.storage.syncBatch.selectModel'
              })}
              rules={[{ required: true }]}
            >
              <Select
                disabled={editingProfileMaintenance}
                showSearch
                optionFilterProp="label"
                options={modelOptions}
              />
            </Form.Item>
          )}
          {scope === 'selected_workers' && (
            <Form.Item
              name="worker_uuids"
              label={intl.formatMessage({
                id: 'resources.storage.syncBatch.selectWorker'
              })}
              rules={[{ required: true }]}
            >
              <Select
                disabled={editingProfileMaintenance}
                mode="multiple"
                showSearch
                optionFilterProp="label"
                options={workerOptions}
              />
            </Form.Item>
          )}
        </Form>
      </ScrollerModal>
      <ModelPreheatConfirmModal
        open={Boolean(confirm)}
        title={intl.formatMessage({
          id: 'resources.storage.syncPolicy.confirmTitle'
        })}
        content={
          <>
            {intl.formatMessage(
              { id: 'resources.storage.syncPolicy.confirmContent' },
              { name: confirm?.policy.name || '' }
            )}
            {actionError && (
              <ModelStorageErrorAlert
                errorCode={actionError}
                type="error"
                showIcon
                style={{ marginTop: 12 }}
              />
            )}
          </>
        }
        okText={intl.formatMessage({
          id:
            confirm?.action === 'delete'
              ? 'common.button.delete'
              : 'common.button.confirm'
        })}
        danger={confirm?.action === 'delete'}
        loading={Boolean(actionLoadingId)}
        onOk={act}
        onCancel={() => {
          key.current.abandon();
          setConfirm(null);
        }}
      />
    </>
  );
};

export default ModelStorageSyncPolicies;
