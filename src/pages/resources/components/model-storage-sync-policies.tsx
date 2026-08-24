import ModalFooter from '@/components/modal-footer';
import {
  DeleteOutlined,
  EditOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  message
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

type Action = 'enable' | 'disable' | 'run' | 'delete';

const defaults: ModelStorageSyncPolicyCreate = {
  name: '',
  enabled: true,
  trigger_mode: 'manual',
  cron_expression: null,
  timezone: 'UTC',
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
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ModelStorageSyncPolicy | null>(null);
  const [confirm, setConfirm] = useState<{
    policy: ModelStorageSyncPolicy;
    action: Action;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const key = useRef(new IdempotencyKeyLifecycle());
  const scope = Form.useWatch('scope', form);
  const trigger = Form.useWatch('trigger_mode', form);

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
    setWorkers(workerItems.filter((item) => item.state === 'ready'));
    setModels(
      modelItems.filter(
        (item) => item.state === 'ready' && item.worker_available !== false
      )
    );
    const values = record
      ? { ...record }
      : {
          ...defaults,
          profile_id:
            profileItems.find(
              (item) => item.is_default && item.lifecycle_state === 'active'
            )?.id || 0
        };
    form.setFieldsValue(values);
  };

  const save = async () => {
    const values = await form.validateFields();
    const payload: ModelStorageSyncPolicyCreate = {
      ...values,
      cron_expression:
        values.trigger_mode === 'scheduled' ? values.cron_expression : null,
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
    setActionLoading(true);
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
    } finally {
      setActionLoading(false);
    }
  };

  const workerOptions = useMemo(
    () =>
      workers.map((item) => ({ label: item.name, value: item.worker_uuid })),
    [workers]
  );
  const editingProfileMaintenance = Boolean(
    editing &&
    profiles.find((item) => item.id === editing.profile_id)?.lifecycle_state ===
      'maintenance'
  );

  const profileInMaintenance = (policy: ModelStorageSyncPolicy) =>
    profiles.find((item) => item.id === policy.profile_id)?.lifecycle_state ===
    'maintenance';

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
                    onClick={() => void openEditor(record)}
                  />
                </Tooltip>
                <Tooltip
                  title={intl.formatMessage({
                    id: 'resources.preheat.schedule.runNow'
                  })}
                >
                  <Button
                    type="text"
                    disabled={!record.enabled || profileInMaintenance(record)}
                    icon={<SyncOutlined />}
                    onClick={() => {
                      key.current.start();
                      setConfirm({ policy: record, action: 'run' });
                    }}
                  />
                </Tooltip>
                <Tooltip
                  title={intl.formatMessage({
                    id: record.enabled
                      ? 'resources.preheat.policy.disable'
                      : 'resources.preheat.policy.enable'
                  })}
                >
                  <Button
                    type="text"
                    disabled={!record.enabled && profileInMaintenance(record)}
                    icon={
                      record.enabled ? (
                        <PauseCircleOutlined />
                      ) : (
                        <PlayCircleOutlined />
                      )
                    }
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
                    icon={<DeleteOutlined />}
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
      <Modal
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
        footer={
          <ModalFooter
            onOk={save}
            onCancel={() => setOpen(false)}
            loading={saving}
            okText={intl.formatMessage({ id: 'common.button.save' })}
          />
        }
      >
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
          <Space align="start" style={{ width: '100%' }}>
            <Form.Item
              name="trigger_mode"
              label={intl.formatMessage({
                id: 'resources.preheat.schedule.triggerMode'
              })}
              rules={[{ required: true }]}
            >
              <Select
                disabled={editingProfileMaintenance}
                style={{ width: 180 }}
                options={['manual', 'scheduled'].map((value) => ({
                  value,
                  label: intl.formatMessage({
                    id: `resources.preheat.schedule.triggerMode.${value}`
                  })
                }))}
              />
            </Form.Item>
            {trigger === 'scheduled' && (
              <>
                <Form.Item
                  name="cron_expression"
                  label={intl.formatMessage({
                    id: 'resources.preheat.schedule.cron'
                  })}
                  rules={[{ required: true }]}
                >
                  <Input
                    disabled={editingProfileMaintenance}
                    style={{ width: 180 }}
                  />
                </Form.Item>
                <Form.Item
                  name="timezone"
                  label={intl.formatMessage({
                    id: 'resources.preheat.schedule.timezone'
                  })}
                  rules={[{ required: true }]}
                >
                  <Input
                    disabled={editingProfileMaintenance}
                    style={{ width: 160 }}
                  />
                </Form.Item>
              </>
            )}
          </Space>
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
                options={models.map((item) => ({
                  value: item.id,
                  label:
                    item.model_scope_model_id ||
                    item.huggingface_repo_id ||
                    item.local_path
                }))}
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
      </Modal>
      <ModelPreheatConfirmModal
        open={Boolean(confirm)}
        title={intl.formatMessage({
          id: 'resources.storage.syncPolicy.confirmTitle'
        })}
        content={intl.formatMessage(
          { id: 'resources.storage.syncPolicy.confirmContent' },
          { name: confirm?.policy.name || '' }
        )}
        okText={intl.formatMessage({
          id:
            confirm?.action === 'delete'
              ? 'common.button.delete'
              : 'common.button.confirm'
        })}
        danger={confirm?.action === 'delete'}
        loading={actionLoading}
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
