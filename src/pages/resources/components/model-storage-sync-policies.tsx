import ModalFooter from '@/components/modal-footer';
import ScrollerModal from '@/components/scroller-modal';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  Form,
  Input,
  message,
  Modal,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography
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
  queryModelStorageSyncPolicyRun,
  queryWorkersList,
  runModelStorageSyncPolicyNow,
  updateModelStorageSyncPolicy
} from '../apis';
import { buildSyncPolicyPatch } from '../config/model-policy';
import {
  extractModelStorageErrorCode,
  getModelFileStorageModelId,
  getModelFileSyncActionState,
  getModelStorageErrorPresentation,
  getModelStorageTaskStatusPresentation,
  IdempotencyKeyLifecycle,
  LatestRequestGate,
  loadAllPaginated
} from '../config/model-preheat';
import type {
  ListItem,
  ModelFile,
  ModelPreheatS3Profile,
  ModelStorageSyncPolicy,
  ModelStorageSyncPolicyCreate,
  ModelStorageSyncPolicyRun,
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

const ACTIVE_RUN_STATES = new Set(['waiting', 'running', 'paused']);
const FAILED_RUN_STATES = new Set(['error', 'partial_error']);

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
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
  const policyRequests = useRef(new LatestRequestGate());
  const runDetailRequests = useRef(new LatestRequestGate());
  const editorRequestId = useRef(0);
  const scope = Form.useWatch('scope', form);
  const [runDetail, setRunDetail] = useState<ModelStorageSyncPolicyRun | null>(
    null
  );
  const [runDetailOpen, setRunDetailOpen] = useState(false);
  const [runDetailLoading, setRunDetailLoading] = useState(false);
  const [runDetailError, setRunDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (confirm) setActionError(null);
  }, [confirm?.action, confirm?.policy.id]);

  useEffect(
    () => () => {
      policyRequests.current.invalidate();
      runDetailRequests.current.invalidate();
      key.current.abandon();
    },
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    let hasActiveRuns = false;
    const accepted = await policyRequests.current.run(
      () =>
        Promise.all([
          queryModelStorageSyncPolicies({
            page,
            perPage: pageSize,
            ...(search ? { search } : {})
          }),
          loadAllPaginated<ModelPreheatS3Profile>((page, perPage) =>
            queryModelPreheatS3Profiles({ page, perPage })
          )
        ]),
      ([result, profileItems]) => {
        setItems(result.items);
        setTotal(result.pagination.total);
        setProfiles(profileItems);
        hasActiveRuns = result.items.some((policy) =>
          ['waiting', 'running'].includes(
            policy.latest_run?.execution_state || ''
          )
        );
      },
      () => setLoading(false)
    );
    return accepted ? hasActiveRuns : false;
  }, [page, pageSize, search]);

  useEffect(() => {
    void load();
    return () => policyRequests.current.invalidate();
  }, [load]);

  const hasActiveRuns = items.some((policy) =>
    ['waiting', 'running'].includes(policy.latest_run?.execution_state || '')
  );

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;
    const schedule = () => {
      if (stopped) return;
      timer = window.setTimeout(async () => {
        try {
          await load();
        } catch {
          undefined;
        }
        if (!stopped) schedule();
      }, hasActiveRuns ? 2000 : 15000);
    };
    schedule();
    return () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [hasActiveRuns, load]);

  const openEditor = async (record?: ModelStorageSyncPolicy) => {
    const requestId = ++editorRequestId.current;
    if (!open || !dependencyError) setDependencyError(false);
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
          queryModelFilesList({ page, perPage, state: 'ready' })
        )
      ]);
      if (requestId !== editorRequestId.current) return;
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
      form.resetFields();
      form.setFieldsValue(values);
      setEditing(record || null);
      setDependencyError(false);
      setOpen(true);
    } catch {
      if (requestId === editorRequestId.current) {
        const values = record
          ? { ...record, ...parseScheduleCron(record.cron_expression) }
          : { ...defaults, ...parseScheduleCron(defaults.cron_expression) };
        form.resetFields();
        form.setFieldsValue(values);
        setEditing(record || null);
        setDependencyError(true);
        setOpen(true);
      }
    } finally {
      if (requestId === editorRequestId.current) setDependencyLoading(false);
    }
  };

  const closeEditor = () => {
    editorRequestId.current += 1;
    setDependencyLoading(false);
    setOpen(false);
  };

  const openRunDetail = async (policyId: number, runId: number) => {
    setRunDetailOpen(true);
    setRunDetail(null);
    setRunDetailError(null);
    setRunDetailLoading(true);
    try {
      await runDetailRequests.current.run(
        () => queryModelStorageSyncPolicyRun(policyId, runId),
        setRunDetail,
        () => setRunDetailLoading(false)
      );
    } catch (error) {
      setRunDetailError(extractModelStorageErrorCode(error) || 'unknown');
      setRunDetailLoading(false);
    }
  };

  const closeRunDetail = () => {
    runDetailRequests.current.invalidate();
    setRunDetailOpen(false);
    setRunDetail(null);
    setRunDetailError(null);
    setRunDetailLoading(false);
  };

  useEffect(() => {
    if (!runDetailOpen || !runDetail) return;
    if (!ACTIVE_RUN_STATES.has(runDetail.execution_state)) return;
    let stopped = false;
    const timer = window.setTimeout(async () => {
      if (stopped) return;
      try {
        await runDetailRequests.current.run(
          () =>
            queryModelStorageSyncPolicyRun(runDetail.policy_id, runDetail.id),
          setRunDetail
        );
      } catch (error) {
        setRunDetailError(extractModelStorageErrorCode(error) || 'unknown');
      }
    }, 2000);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [runDetail, runDetailOpen]);

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
        const run = await runModelStorageSyncPolicyNow(
          confirm.policy.id,
          key.current.current()
        );
        key.current.complete();
        void openRunDetail(confirm.policy.id, run.id);
        if (FAILED_RUN_STATES.has(run.execution_state)) {
          setConfirm(null);
          await load();
          return;
        }
      } else
        await updateModelStorageSyncPolicy(confirm.policy.id, {
          enabled: confirm.action === 'enable'
        });
      setConfirm(null);
      await load();
      message.success(intl.formatMessage({ id: 'common.message.success' }));
    } catch (error) {
      setActionError(extractModelStorageErrorCode(error) || 'unknown');
      if (confirm.action === 'run') key.current.start();
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
        <Input.Search
          allowClear
          value={searchDraft}
          aria-label={intl.formatMessage({
            id: 'common.search.name.placeholder'
          })}
          placeholder={intl.formatMessage({
            id: 'common.search.name.placeholder'
          })}
          onChange={(event) => {
            const value = event.target.value;
            setSearchDraft(value);
            if (!value) {
              setPage(1);
              setSearch('');
            }
          }}
          onSearch={(value) => {
            setPage(1);
            setSearch(value.trim());
          }}
        />
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
          loading={dependencyLoading}
          disabled={dependencyLoading}
          onClick={() => void openEditor()}
        >
          {intl.formatMessage({ id: 'resources.storage.syncPolicy.create' })}
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        scroll={{ x: 1050 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (value) =>
            intl.formatMessage(
              { id: 'resources.storage.pagination.total' },
              { total: value }
            ),
          onChange: (nextPage, nextPageSize) => {
            setPage(nextPageSize === pageSize ? nextPage : 1);
            setPageSize(nextPageSize);
          }
        }}
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
              id: 'resources.storage.distributionPolicy.latestRun'
            }),
            key: 'latest_run',
            width: 140,
            render: (_, record) =>
              record.latest_run ? (
                <Tag
                  color={
                    ['error', 'partial_error'].includes(
                      record.latest_run.execution_state
                    )
                      ? 'error'
                      : ['waiting', 'running', 'paused'].includes(
                            record.latest_run.execution_state
                          )
                        ? 'processing'
                        : 'success'
                  }
                >
                  {intl.formatMessage({
                    id: `resources.storage.distributionPolicy.execution.${record.latest_run.execution_state}`
                  })}
                </Tag>
              ) : (
                intl.formatMessage({
                  id: 'resources.storage.distributionPolicy.notExecuted'
                })
              )
          },
          {
            title: intl.formatMessage({
              id: 'resources.storage.distributionPolicy.progress'
            }),
            key: 'progress',
            width: 190,
            render: (_, record) => {
              const summary = record.latest_run?.summary;
              if (!summary) return '-';
              const completed = summary.ready + summary.error + summary.skipped;
              return (
                <Space direction="vertical" size={0} style={{ width: 150 }}>
                  <Typography.Text type="secondary">
                    {intl.formatMessage(
                      {
                        id: 'resources.storage.distributionPolicy.progressCount'
                      },
                      { completed, total: summary.total }
                    )}
                  </Typography.Text>
                  <Progress
                    percent={Math.max(
                      0,
                      Math.min(100, Math.round(summary.progress))
                    )}
                    size="small"
                    showInfo={false}
                  />
                </Space>
              );
            }
          },
          {
            title: intl.formatMessage({
              id: 'resources.storage.distributionPolicy.latestError'
            }),
            key: 'latest_error',
            width: 210,
            render: (_, record) => {
              const errorCode = record.latest_run?.error_code;
              if (!errorCode) return '-';
              const presentation = getModelStorageErrorPresentation(errorCode);
              return (
                <Typography.Text
                  type="danger"
                  copyable={{ text: presentation.value }}
                  ellipsis={{
                    tooltip: intl.formatMessage({ id: presentation.messageId })
                  }}
                >
                  {intl.formatMessage({ id: presentation.messageId })}
                </Typography.Text>
              );
            }
          },
          {
            title: intl.formatMessage({
              id: 'resources.storage.distributionPolicy.runTimes'
            }),
            key: 'run_times',
            width: 180,
            render: (_, record) => (
              <Space direction="vertical" size={0}>
                <Typography.Text type="secondary">
                  {intl.formatMessage({
                    id: 'resources.storage.distributionPolicy.lastRunAt'
                  })}
                  :{' '}
                  {record.last_run_at
                    ? dayjs(record.last_run_at).format('YYYY-MM-DD HH:mm:ss')
                    : '-'}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {intl.formatMessage({
                    id: 'resources.storage.distributionPolicy.nextRunAt'
                  })}
                  :{' '}
                  {record.next_run_at
                    ? dayjs(record.next_run_at).format('YYYY-MM-DD HH:mm:ss')
                    : '-'}
                </Typography.Text>
              </Space>
            )
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
            width: 230,
            render: (_, record) => (
              <Space size={4}>
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
                    id: record.latest_run
                      ? 'resources.storage.distributionPolicy.runDetail'
                      : 'resources.storage.distributionPolicy.notExecuted'
                  })}
                >
                  <Button
                    type="text"
                    icon={<EyeOutlined />}
                    disabled={
                      actionLoadingId === record.id || !record.latest_run
                    }
                    aria-label={intl.formatMessage({
                      id: 'resources.storage.distributionPolicy.runDetail'
                    })}
                    onClick={() =>
                      record.latest_run &&
                      void openRunDetail(record.id, record.latest_run.id)
                    }
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
        onCancel={closeEditor}
        styles={{ body: { maxHeight: '68vh', overflowY: 'auto' } }}
        footer={
          <ModalFooter
            onOk={save}
            onCancel={closeEditor}
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
                loading={dependencyLoading}
                disabled={dependencyLoading}
                onClick={() => void openEditor(editing || undefined)}
              >
                {intl.formatMessage({ id: 'resources.storage.retry' })}
              </Button>
            }
          />
        )}
        <Form form={form} layout="vertical" disabled={dependencyLoading}>
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
      <Modal
        open={runDetailOpen}
        centered
        width={860}
        title={intl.formatMessage({
          id: 'resources.storage.distributionPolicy.runDetail'
        })}
        footer={null}
        loading={runDetailLoading}
        styles={{ body: { maxHeight: '68vh', overflowY: 'auto' } }}
        onCancel={closeRunDetail}
      >
        {runDetailError && (
          <ModelStorageErrorAlert
            errorCode={runDetailError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        {runDetail && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'resources.storage.distributionPolicy.executionState'
                })}
              >
                {intl.formatMessage({
                  id: `resources.storage.distributionPolicy.execution.${runDetail.execution_state}`
                })}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'resources.storage.distributionPolicy.progress'
                })}
              >
                {Math.round(runDetail.summary.progress)}%
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'resources.preheat.schedule.triggerMode'
                })}
              >
                {intl.formatMessage({
                  id: `resources.preheat.schedule.triggerMode.${runDetail.trigger}`
                })}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'resources.preheat.attempt' })}
              >
                {runDetail.attempt}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'resources.storage.syncPolicy.windowStart'
                })}
              >
                {runDetail.window_start_utc
                  ? dayjs(runDetail.window_start_utc).format(
                      'YYYY-MM-DD HH:mm:ss'
                    )
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'resources.storage.distributionPolicy.startedAt'
                })}
              >
                {runDetail.started_at
                  ? dayjs(runDetail.started_at).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'resources.storage.distributionPolicy.finishedAt'
                })}
              >
                {runDetail.finished_at
                  ? dayjs(runDetail.finished_at).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}
              </Descriptions.Item>
            </Descriptions>
            {runDetail.error_code && (
              <ModelStorageErrorAlert
                errorCode={runDetail.error_code}
                type="error"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
            <Table
              rowKey={(task) =>
                `${task.id || 'task'}:${task.model_file_id || ''}:${task.worker_uuid || task.worker_id || ''}:${task.error_code || ''}`
              }
              style={{ marginTop: 16 }}
              size="small"
              pagination={false}
              dataSource={runDetail.tasks}
              scroll={{ x: 760 }}
              columns={[
                {
                  title: intl.formatMessage({
                    id: 'resources.storage.syncPolicy.modelFile'
                  }),
                  dataIndex: 'model_file_id',
                  width: 120,
                  render: (_value: number | null, task) =>
                    task.model_id || task.model_file_id || '-'
                },
                {
                  title: intl.formatMessage({
                    id: 'resources.storage.distributionPolicy.worker'
                  }),
                  key: 'worker',
                  ellipsis: true,
                  render: (_, task) => {
                    const primary =
                      task.worker_name ||
                      task.worker_ip ||
                      task.worker_id ||
                      task.worker_uuid ||
                      '-';
                    const secondary =
                      task.worker_name && task.worker_ip
                        ? task.worker_ip
                        : task.worker_uuid || '';
                    return (
                      <Tooltip title={task.worker_uuid || String(primary)}>
                        <Space direction="vertical" size={0}>
                          <Typography.Text>{primary}</Typography.Text>
                          {secondary && secondary !== primary && (
                            <Typography.Text type="secondary">
                              {secondary}
                            </Typography.Text>
                          )}
                        </Space>
                      </Tooltip>
                    );
                  }
                },
                {
                  title: intl.formatMessage({ id: 'common.table.status' }),
                  dataIndex: 'state',
                  width: 120,
                  render: (value: string) =>
                    intl.formatMessage({
                      id:
                        value === 'skipped'
                          ? 'resources.storage.distributionPolicy.taskState.skipped'
                          : getModelStorageTaskStatusPresentation(value)
                              .messageId
                    })
                },
                {
                  title: intl.formatMessage({
                    id: 'resources.storage.distributionPolicy.progress'
                  }),
                  dataIndex: 'progress',
                  width: 150,
                  render: (value: number) => (
                    <Progress percent={Math.round(value)} size="small" />
                  )
                },
                {
                  title: intl.formatMessage({
                    id: 'resources.storage.distributionPolicy.failureReason'
                  }),
                  key: 'error',
                  width: 240,
                  render: (_, task) => {
                    if (!task.error_code) return '-';
                    const presentation = getModelStorageErrorPresentation(
                      task.error_code
                    );
                    return (
                      <Space direction="vertical" size={0}>
                        <Typography.Text
                          type={task.state === 'error' ? 'danger' : 'secondary'}
                        >
                          {intl.formatMessage({ id: presentation.messageId })}
                        </Typography.Text>
                        <Typography.Text
                          code
                          copyable={{ text: presentation.value }}
                        >
                          {presentation.value}
                        </Typography.Text>
                      </Space>
                    );
                  }
                }
              ]}
            />
          </>
        )}
      </Modal>
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
