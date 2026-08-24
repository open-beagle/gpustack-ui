import {
  DeleteOutlined,
  EditOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { useIntl, useLocation, useNavigate } from '@umijs/max';
import {
  Button,
  Modal,
  Radio,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
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
  deleteModelPreheatPolicy,
  deleteModelPreheatSchedule,
  queryModelPreheatPolicies,
  queryModelPreheatSchedules,
  reconcileModelPreheatPolicy,
  runModelPreheatScheduleNow,
  updateModelPreheatPolicy,
  updateModelPreheatSchedule
} from '../apis';
import {
  IdempotencyKeyLifecycle,
  LatestRequestGate
} from '../config/model-preheat';
import type {
  ModelPreheatCreate,
  ModelPreheatDistributionPolicy,
  ModelPreheatSchedule
} from '../config/types';
import ModelDistributionPolicyModal from './model-distribution-policy-modal';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';
import ModelPreheatScheduleModal from './model-preheat-schedule-modal';

type ContinuousAction = 'enable' | 'disable' | 'reconcile' | 'delete';
type ScheduleAction = 'enable' | 'disable' | 'run' | 'delete';
type StrategyKind = 'continuous' | 'manual' | 'scheduled';

const ModelPreheatPolicies: React.FC = () => {
  const intl = useIntl();
  const location = useLocation();
  const navigate = useNavigate();
  const policyRequests = useRef(new LatestRequestGate());
  const scheduleRequests = useRef(new LatestRequestGate());
  const runIdempotency = useRef(new IdempotencyKeyLifecycle());
  const actionInFlight = useRef(false);
  const [policies, setPolicies] = useState<ModelPreheatDistributionPolicy[]>(
    []
  );
  const [schedules, setSchedules] = useState<ModelPreheatSchedule[]>([]);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [schedulePage, setSchedulePage] = useState(1);
  const [schedulePageSize, setSchedulePageSize] = useState(10);
  const [scheduleTotal, setScheduleTotal] = useState(0);
  const [createChooserOpen, setCreateChooserOpen] = useState(false);
  const [strategyKind, setStrategyKind] = useState<StrategyKind>('continuous');
  const [continuousOpen, setContinuousOpen] = useState(false);
  const [distributionSyncTaskId, setDistributionSyncTaskId] =
    useState<number>();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] =
    useState<ModelPreheatSchedule | null>(null);
  const [prefill, setPrefill] = useState<Partial<ModelPreheatCreate>>({});
  const [policyConfirm, setPolicyConfirm] = useState<{
    policy: ModelPreheatDistributionPolicy;
    action: ContinuousAction;
  } | null>(null);
  const [scheduleConfirm, setScheduleConfirm] = useState<{
    schedule: ModelPreheatSchedule;
    action: ScheduleAction;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadPolicies = useCallback(async () => {
    setPolicyLoading(true);
    return policyRequests.current.run(
      () => queryModelPreheatPolicies({ page, perPage: pageSize }),
      (result) => {
        setPolicies(result.items);
        setTotal(result.pagination.total);
      },
      () => setPolicyLoading(false)
    );
  }, [page, pageSize]);

  const loadSchedules = useCallback(async () => {
    setScheduleLoading(true);
    return scheduleRequests.current.run(
      () =>
        queryModelPreheatSchedules({
          page: schedulePage,
          perPage: schedulePageSize
        }),
      (result) => {
        setSchedules(result.items);
        setScheduleTotal(result.pagination.total);
      },
      () => setScheduleLoading(false)
    );
  }, [schedulePage, schedulePageSize]);

  useEffect(() => {
    void loadPolicies().catch(() => undefined);
  }, [loadPolicies]);

  useEffect(() => {
    void loadSchedules().catch(() => undefined);
  }, [loadSchedules]);

  useEffect(
    () => () => {
      policyRequests.current.invalidate();
      scheduleRequests.current.invalidate();
      runIdempotency.current.abandon();
    },
    []
  );

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get('strategy') !== 'create') return;
    const syncTaskId = Number(query.get('sync_task'));
    if (Number.isInteger(syncTaskId) && syncTaskId > 0) {
      setDistributionSyncTaskId(syncTaskId);
      setContinuousOpen(true);
      navigate(`${location.pathname}?tab=policies`, { replace: true });
      return;
    }
    const source = query.get('source');
    const profileId = Number(query.get('profile'));
    setPrefill({
      source: source === 'huggingface' ? 'huggingface' : 'modelscope',
      model_id: query.get('model') || '',
      revision: query.get('revision') || '',
      ...(Number.isInteger(profileId) && profileId > 0
        ? { s3_profile_id: profileId }
        : {})
    });
    setCreateChooserOpen(true);
    navigate(`${location.pathname}?tab=policies`, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const scheduleInitialValues = useMemo(
    () => ({
      trigger_mode:
        strategyKind === 'manual'
          ? ('manual' as const)
          : ('scheduled' as const),
      ...(prefill.source ? { source: prefill.source } : {}),
      ...(prefill.model_id ? { model_id: prefill.model_id } : {}),
      ...(prefill.revision ? { revision: prefill.revision } : {}),
      ...(prefill.s3_profile_id ? { s3_profile_id: prefill.s3_profile_id } : {})
    }),
    [prefill, strategyKind]
  );

  const handlePolicyAction = async () => {
    if (!policyConfirm) return;
    setActionLoading(true);
    try {
      if (policyConfirm.action === 'delete') {
        await deleteModelPreheatPolicy(policyConfirm.policy.id);
      } else if (policyConfirm.action === 'reconcile') {
        await reconcileModelPreheatPolicy(policyConfirm.policy.id);
      } else {
        await updateModelPreheatPolicy(policyConfirm.policy.id, {
          enabled: policyConfirm.action === 'enable'
        });
      }
      setPolicyConfirm(null);
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      await loadPolicies();
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleAction = async () => {
    if (!scheduleConfirm || actionInFlight.current) return;
    actionInFlight.current = true;
    setActionLoading(true);
    try {
      if (scheduleConfirm.action === 'delete') {
        await deleteModelPreheatSchedule(scheduleConfirm.schedule.id);
      } else if (scheduleConfirm.action === 'run') {
        await runModelPreheatScheduleNow(
          scheduleConfirm.schedule.id,
          runIdempotency.current.current()
        );
        runIdempotency.current.complete();
      } else {
        await updateModelPreheatSchedule(scheduleConfirm.schedule.id, {
          enabled: scheduleConfirm.action === 'enable'
        });
      }
      setScheduleConfirm(null);
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      await loadSchedules();
    } catch {
      return;
    } finally {
      actionInFlight.current = false;
      setActionLoading(false);
    }
  };

  const openScheduleConfirm = (
    schedule: ModelPreheatSchedule,
    action: ScheduleAction
  ) => {
    runIdempotency.current.abandon();
    if (action === 'run') runIdempotency.current.start();
    setScheduleConfirm({ schedule, action });
  };

  const closeScheduleConfirm = () => {
    runIdempotency.current.abandon();
    setScheduleConfirm(null);
  };

  const continuousColumns = useMemo(
    () => [
      {
        title: intl.formatMessage({ id: 'resources.preheat.policy.name' }),
        dataIndex: 'name',
        ellipsis: true
      },
      {
        title: intl.formatMessage({ id: 'common.table.status' }),
        dataIndex: 'enabled',
        width: 100,
        render: (value: boolean) => (
          <Tag color={value ? 'success' : 'default'}>
            {intl.formatMessage({
              id: value
                ? 'resources.preheat.state.enabled'
                : 'resources.preheat.state.disabled'
            })}
          </Tag>
        )
      },
      {
        title: intl.formatMessage({ id: 'resources.preheat.profile.title' }),
        dataIndex: 'profile_id',
        width: 100
      },
      {
        title: intl.formatMessage({ id: 'resources.preheat.targetScope' }),
        dataIndex: 'target_scope',
        width: 150,
        render: (value: string) =>
          intl.formatMessage({ id: `resources.preheat.scope.${value}` })
      },
      {
        title: intl.formatMessage({ id: 'resources.preheat.policy.selector' }),
        key: 'selector',
        ellipsis: true,
        render: (_: unknown, record: ModelPreheatDistributionPolicy) => (
          <Typography.Text ellipsis style={{ maxWidth: 220 }}>
            {JSON.stringify({
              worker: record.worker_selector,
              gpu: record.gpu_selector
            })}
          </Typography.Text>
        )
      },
      {
        title: intl.formatMessage({
          id: 'resources.preheat.policy.lastReconciled'
        }),
        dataIndex: 'last_reconciled_at',
        width: 170,
        render: (value: string | null) =>
          value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'
      },
      {
        title: intl.formatMessage({ id: 'common.table.operation' }),
        key: 'operation',
        width: 140,
        render: (_: unknown, policy: ModelPreheatDistributionPolicy) => (
          <Space size={4}>
            <Tooltip
              title={intl.formatMessage({
                id: policy.enabled
                  ? 'resources.preheat.policy.disable'
                  : 'resources.preheat.policy.enable'
              })}
            >
              <Button
                type="text"
                icon={
                  policy.enabled ? (
                    <PauseCircleOutlined />
                  ) : (
                    <PlayCircleOutlined />
                  )
                }
                aria-label={intl.formatMessage({
                  id: policy.enabled
                    ? 'resources.preheat.policy.disable'
                    : 'resources.preheat.policy.enable'
                })}
                onClick={() =>
                  setPolicyConfirm({
                    policy,
                    action: policy.enabled ? 'disable' : 'enable'
                  })
                }
              />
            </Tooltip>
            <Tooltip
              title={intl.formatMessage({
                id: 'resources.preheat.policy.reconcile'
              })}
            >
              <Button
                type="text"
                icon={<SyncOutlined />}
                aria-label={intl.formatMessage({
                  id: 'resources.preheat.policy.reconcile'
                })}
                disabled={!policy.enabled}
                onClick={() =>
                  setPolicyConfirm({ policy, action: 'reconcile' })
                }
              />
            </Tooltip>
            <Tooltip title={intl.formatMessage({ id: 'common.button.delete' })}>
              <Button
                danger
                type="text"
                icon={<DeleteOutlined />}
                aria-label={intl.formatMessage({ id: 'common.button.delete' })}
                onClick={() => setPolicyConfirm({ policy, action: 'delete' })}
              />
            </Tooltip>
          </Space>
        )
      }
    ],
    [intl]
  );

  const scheduleColumns = useMemo(
    () => [
      {
        title: intl.formatMessage({ id: 'resources.preheat.policy.name' }),
        dataIndex: 'name',
        ellipsis: true
      },
      {
        title: intl.formatMessage({ id: 'common.table.status' }),
        dataIndex: 'enabled',
        width: 100,
        render: (value: boolean) => (
          <Tag color={value ? 'success' : 'default'}>
            {intl.formatMessage({
              id: value
                ? 'resources.preheat.state.enabled'
                : 'resources.preheat.state.disabled'
            })}
          </Tag>
        )
      },
      {
        title: intl.formatMessage({
          id: 'resources.preheat.schedule.triggerMode'
        }),
        dataIndex: 'trigger_mode',
        width: 120,
        render: (value: ModelPreheatSchedule['trigger_mode']) =>
          intl.formatMessage({
            id: `resources.preheat.schedule.triggerMode.${value}`
          })
      },
      {
        title: intl.formatMessage({ id: 'resources.preheat.schedule.cron' }),
        dataIndex: 'cron_expression',
        width: 150,
        render: (value: string | null, record: ModelPreheatSchedule) =>
          record.trigger_mode === 'manual'
            ? intl.formatMessage({
                id: 'resources.preheat.schedule.triggerMode.manual'
              })
            : value
      },
      {
        title: intl.formatMessage({ id: 'resources.preheat.schedule.nextRun' }),
        dataIndex: 'next_window_start_utc',
        width: 180,
        render: (value: string | null, record: ModelPreheatSchedule) =>
          record.trigger_mode === 'scheduled' && value
            ? dayjs(value).format('YYYY-MM-DD HH:mm:ss')
            : '-'
      },
      {
        title: intl.formatMessage({ id: 'resources.preheat.schedule.lastRun' }),
        dataIndex: 'last_window_start_utc',
        width: 180,
        render: (value: string | null, record: ModelPreheatSchedule) =>
          record.trigger_mode === 'scheduled' && value
            ? dayjs(value).format('YYYY-MM-DD HH:mm:ss')
            : '-'
      },
      {
        title: intl.formatMessage({ id: 'common.table.operation' }),
        key: 'operation',
        width: 170,
        render: (_: unknown, schedule: ModelPreheatSchedule) => (
          <Space size={4}>
            <Tooltip title={intl.formatMessage({ id: 'common.button.edit' })}>
              <Button
                type="text"
                icon={<EditOutlined />}
                aria-label={intl.formatMessage({ id: 'common.button.edit' })}
                onClick={() => {
                  setEditingSchedule(schedule);
                  setScheduleOpen(true);
                }}
              />
            </Tooltip>
            <Tooltip
              title={intl.formatMessage({
                id: schedule.enabled
                  ? 'resources.preheat.policy.disable'
                  : 'resources.preheat.policy.enable'
              })}
            >
              <Button
                type="text"
                icon={
                  schedule.enabled ? (
                    <PauseCircleOutlined />
                  ) : (
                    <PlayCircleOutlined />
                  )
                }
                aria-label={intl.formatMessage({
                  id: schedule.enabled
                    ? 'resources.preheat.policy.disable'
                    : 'resources.preheat.policy.enable'
                })}
                onClick={() =>
                  openScheduleConfirm(
                    schedule,
                    schedule.enabled ? 'disable' : 'enable'
                  )
                }
              />
            </Tooltip>
            <Tooltip
              title={intl.formatMessage({
                id: 'resources.preheat.schedule.runNow'
              })}
            >
              <Button
                type="text"
                icon={<SyncOutlined />}
                aria-label={intl.formatMessage({
                  id: 'resources.preheat.schedule.runNow'
                })}
                disabled={!schedule.enabled}
                onClick={() => openScheduleConfirm(schedule, 'run')}
              />
            </Tooltip>
            <Tooltip title={intl.formatMessage({ id: 'common.button.delete' })}>
              <Button
                danger
                type="text"
                icon={<DeleteOutlined />}
                aria-label={intl.formatMessage({ id: 'common.button.delete' })}
                onClick={() => openScheduleConfirm(schedule, 'delete')}
              />
            </Tooltip>
          </Space>
        )
      }
    ],
    [intl]
  );

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            void loadPolicies();
            void loadSchedules();
          }}
          loading={policyLoading || scheduleLoading}
        >
          {intl.formatMessage({ id: 'common.button.refresh' })}
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setPrefill({});
            setCreateChooserOpen(true);
          }}
        >
          {intl.formatMessage({ id: 'resources.preheat.policy.create' })}
        </Button>
      </Space>
      <Tabs
        items={[
          {
            key: 'continuous',
            label: intl.formatMessage({
              id: 'resources.preheat.policy.continuous'
            }),
            children: (
              <Table
                rowKey="id"
                columns={continuousColumns}
                dataSource={policies}
                loading={policyLoading}
                scroll={{ x: 1050 }}
                pagination={{
                  current: page,
                  pageSize,
                  total,
                  showSizeChanger: true,
                  onChange: (nextPage, nextPageSize) => {
                    policyRequests.current.invalidate();
                    setPage(nextPageSize === pageSize ? nextPage : 1);
                    setPageSize(nextPageSize);
                  }
                }}
              />
            )
          },
          {
            key: 'schedule',
            label: intl.formatMessage({
              id: 'resources.preheat.policy.scheduled'
            }),
            children: (
              <Table
                rowKey="id"
                columns={scheduleColumns}
                dataSource={schedules}
                loading={scheduleLoading}
                scroll={{ x: 900 }}
                pagination={{
                  current: schedulePage,
                  pageSize: schedulePageSize,
                  total: scheduleTotal,
                  showSizeChanger: true,
                  onChange: (nextPage, nextPageSize) => {
                    scheduleRequests.current.invalidate();
                    setSchedulePage(
                      nextPageSize === schedulePageSize ? nextPage : 1
                    );
                    setSchedulePageSize(nextPageSize);
                  }
                }}
              />
            )
          }
        ]}
      />
      <Modal
        open={createChooserOpen}
        centered
        maskClosable={false}
        title={intl.formatMessage({ id: 'resources.preheat.policy.create' })}
        onCancel={() => {
          setCreateChooserOpen(false);
          setPrefill({});
        }}
        onOk={() => {
          setCreateChooserOpen(false);
          if (strategyKind === 'continuous') setContinuousOpen(true);
          else setScheduleOpen(true);
        }}
        okText={intl.formatMessage({ id: 'common.button.next' })}
      >
        <Radio.Group
          value={strategyKind}
          onChange={(event) => setStrategyKind(event.target.value)}
        >
          <Space direction="vertical">
            <Radio value="continuous">
              {intl.formatMessage({
                id: 'resources.storage.distributionPolicy.kind'
              })}
            </Radio>
            <Radio value="manual">
              {intl.formatMessage({
                id: 'resources.preheat.schedule.triggerMode.manual'
              })}
            </Radio>
            <Radio value="scheduled">
              {intl.formatMessage({
                id: 'resources.preheat.schedule.triggerMode.scheduled'
              })}
            </Radio>
          </Space>
        </Radio.Group>
      </Modal>
      <ModelDistributionPolicyModal
        open={continuousOpen}
        initialSyncTaskId={distributionSyncTaskId}
        onCancel={() => {
          setContinuousOpen(false);
          setDistributionSyncTaskId(undefined);
          setPrefill({});
        }}
        onSaved={() => {
          setContinuousOpen(false);
          setDistributionSyncTaskId(undefined);
          setPrefill({});
          void loadPolicies();
        }}
      />
      <ModelPreheatScheduleModal
        open={scheduleOpen}
        record={editingSchedule}
        initialValues={scheduleInitialValues}
        onCancel={() => {
          setScheduleOpen(false);
          setEditingSchedule(null);
          setPrefill({});
        }}
        onSaved={() => {
          setScheduleOpen(false);
          setEditingSchedule(null);
          setPrefill({});
          void loadSchedules();
        }}
      />
      <ModelPreheatConfirmModal
        open={Boolean(policyConfirm)}
        title={intl.formatMessage({
          id: `resources.preheat.policy.${policyConfirm?.action || 'disable'}Confirm`
        })}
        content={intl.formatMessage(
          { id: 'resources.preheat.policy.actionContent' },
          { name: policyConfirm?.policy.name || '' }
        )}
        okText={intl.formatMessage({
          id:
            policyConfirm?.action === 'delete'
              ? 'common.button.delete'
              : `resources.preheat.policy.${policyConfirm?.action || 'disable'}`
        })}
        danger={policyConfirm?.action === 'delete'}
        loading={actionLoading}
        onOk={handlePolicyAction}
        onCancel={() => setPolicyConfirm(null)}
      />
      <ModelPreheatConfirmModal
        open={Boolean(scheduleConfirm)}
        title={intl.formatMessage({
          id: `resources.preheat.schedule.${scheduleConfirm?.action || 'disable'}Confirm`
        })}
        content={intl.formatMessage(
          { id: 'resources.preheat.schedule.actionContent' },
          { name: scheduleConfirm?.schedule.name || '' }
        )}
        okText={intl.formatMessage({
          id:
            scheduleConfirm?.action === 'delete'
              ? 'common.button.delete'
              : scheduleConfirm?.action === 'run'
                ? 'resources.preheat.schedule.runNow'
                : `resources.preheat.policy.${scheduleConfirm?.action || 'disable'}`
        })}
        danger={scheduleConfirm?.action === 'delete'}
        loading={actionLoading}
        onOk={handleScheduleAction}
        onCancel={closeScheduleConfirm}
      />
    </>
  );
};

export default ModelPreheatPolicies;
