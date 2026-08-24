import ModalFooter from '@/components/modal-footer';
import ScrollerModal from '@/components/scroller-modal';
import { useIntl } from '@umijs/max';
import { ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Col, Collapse, Form, Input, InputNumber, Radio, Row, Select, Switch } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createModelPreheatConnectivityCheck,
  createModelPreheatSchedule,
  queryModelPreheatConnectivityCheck,
  queryModelPreheatS3Profile,
  queryModelPreheatS3Profiles,
  queryWorkersList,
  updateModelPreheatSchedule
} from '../apis';
import {
  loadAllPaginated,
  prepareModelPreheatWithFreshSnapshot,
  eligibleModelPreheatWorkers,
  IdempotencyKeyLifecycle
} from '../config/model-preheat';
import type {
  ModelPreheatCreate,
  ModelPreheatS3Profile,
  ModelPreheatSchedule,
  ModelPreheatScheduleCreate,
  ModelPreheatWorker
} from '../config/types';
import ModelRepositoryPicker from './model-repository-picker';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';
import ModelPreheatCreateSummary from './model-preheat-create-summary';
import ScheduleEditor, {
  getSchedulePayload,
  getBrowserTimezone,
  parseScheduleCron,
  type ScheduleDraft
} from './model-storage-schedule-editor';

interface Props {
  open: boolean;
  record?: ModelPreheatSchedule | null;
  initialValues?: Partial<ModelPreheatScheduleCreate>;
  onCancel: () => void;
  onSaved: () => void;
}

const defaultValues: ModelPreheatScheduleCreate = {
  name: '',
  trigger_mode: 'scheduled',
  cron_expression: '0 1 * * *',
  timezone: getBrowserTimezone(),
  window_duration_minutes: 60,
  max_concurrency: 1,
  bandwidth_limit_mbps: null,
  source: 'modelscope',
  model_id: '',
  revision: '',
  include_patterns: [],
  exclude_patterns: [],
  target_scope: 'selected_workers',
  target_worker_uuids: [],
  seed_worker_uuid: null,
  s3_profile_id: 0,
  s3_backfill_policy: 'when_missing',
  delivery_mode: 's3_and_workers',
  keep_new_workers_in_sync: false
};

const ModelPreheatScheduleModal: React.FC<Props> = ({
  open,
  record,
  initialValues,
  onCancel,
  onSaved
}) => {
  const intl = useIntl();
  const [form] = Form.useForm<ModelPreheatScheduleCreate>();
  const [workers, setWorkers] = useState<ModelPreheatWorker[]>([]);
  const [profiles, setProfiles] = useState<ModelPreheatS3Profile[]>([]);
  const [draft, setDraft] = useState<ModelPreheatScheduleCreate>(defaultValues);
  const [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dependencyRevision, setDependencyRevision] = useState(0);
  const connectivityIdempotency = useRef(new IdempotencyKeyLifecycle());
  const connectivityRecheckStarted = useRef(false);
  const [confirmValues, setConfirmValues] = useState<{
    values: ModelPreheatScheduleCreate;
    profileName: string;
    targetCount: number;
    targetPending: boolean;
    connectivityFailure: boolean;
  } | null>(null);

  useEffect(() => {
    connectivityIdempotency.current.abandon();
    connectivityRecheckStarted.current = false;
    if (!open) setConfirmValues(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setDataError(false);
    void Promise.all([
      loadAllPaginated<ModelPreheatWorker>((page, perPage) =>
        queryWorkersList({ page, perPage })
      ),
      loadAllPaginated<ModelPreheatS3Profile>((page, perPage) =>
        queryModelPreheatS3Profiles({ page, perPage })
      )
    ])
      .then(([workerItems, profileItems]) => {
        if (!active) return;
        const readyWorkers = eligibleModelPreheatWorkers(workerItems);
        const activeProfiles = profileItems.filter(
          (profile) => profile.lifecycle_state === 'active'
        );
        const selectedProfile =
          activeProfiles.find((profile) => profile.is_default) ||
          activeProfiles[0];
        const values = record
          ? {
              ...defaultValues,
              ...record,
              ...parseScheduleCron(record.cron_expression),
              trigger_mode: record.trigger_mode
            }
          : {
              ...defaultValues,
              ...initialValues,
              ...parseScheduleCron(
                initialValues?.trigger_mode === 'manual'
                  ? null
                  : initialValues?.cron_expression ?? defaultValues.cron_expression
              ),
              target_worker_uuids:
                initialValues?.target_worker_uuids ||
                readyWorkers.map((worker) => worker.worker_uuid),
              s3_profile_id:
                initialValues?.s3_profile_id || selectedProfile?.id || 0
            };
        setWorkers(readyWorkers);
        setProfiles(activeProfiles);
        setDraft(values);
        form.setFieldsValue(values);
      })
      .catch(() => {
        if (!active) return;
        setWorkers([]);
        setProfiles([]);
        setDataError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [dependencyRevision, form, initialValues, open, record]);

  const workerOptions = useMemo(
    () =>
      workers.map((worker) => ({
        label: worker.name,
        value: worker.worker_uuid
      })),
    [workers]
  );

  const getTargetCount = (values: ModelPreheatScheduleCreate) => {
    if (values.delivery_mode === 's3_only') return 0;
    if (values.target_scope === 'selected_workers') {
      const selected = new Set(values.target_worker_uuids || []);
      return workers.filter((worker) => selected.has(worker.worker_uuid)).length;
    }
    if (values.target_scope === 'seed_worker') {
      return workers.some((worker) => worker.worker_uuid === values.seed_worker_uuid)
        ? 1
        : 0;
    }
    return 0;
  };

  const save = async () => {
    const values = await form.validateFields();
    const targetWorkerIds = (values.target_worker_uuids || []).flatMap(
      (workerUuid) =>
        workers
          .filter((worker) => worker.worker_uuid === workerUuid)
          .map((worker) => worker.id)
    );
    const seedWorkerId = workers.find(
      (worker) => worker.worker_uuid === values.seed_worker_uuid
    )?.id;
    const taskValues: ModelPreheatCreate = {
      ...values,
      target_worker_ids: targetWorkerIds,
      seed_worker_id: seedWorkerId || null
    };
    setSubmitting(true);
    try {
      const snapshot = await prepareModelPreheatWithFreshSnapshot({
        values: taskValues,
        loadWorkers: async () =>
          (await loadAllPaginated((page, perPage) =>
            queryWorkersList({ page, perPage })
          )) as ModelPreheatWorker[],
        loadSnapshot: async () => {
          const profile =
            (await queryModelPreheatS3Profile(values.s3_profile_id)) ||
            profiles.find((item) => item.id === values.s3_profile_id);
          if (!profile) throw new Error('profile_not_found');
          const check = profile.last_connectivity_check_id
            ? await queryModelPreheatConnectivityCheck(
                profile.id,
                profile.last_connectivity_check_id
              )
            : null;
          return { profile, check };
        }
      });
      const connectivityFailure = snapshot.preview.blockingReasons.some(
        (reason) => reason.code === 'worker_connectivity_unavailable'
      );
      const onlyConnectivityFailure =
        connectivityFailure &&
        snapshot.preview.blockingReasons.every(
          (reason) => reason.code === 'worker_connectivity_unavailable'
        );
      if (!snapshot.preview.canSubmit && !onlyConnectivityFailure) return;
      setConfirmValues({
        values,
        profileName: snapshot.profile.name,
        targetCount: getTargetCount(values),
        targetPending: values.target_scope === 'same_gpu_model',
        connectivityFailure
      });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmSave = async () => {
    if (!confirmValues) return;
    const values = confirmValues.values;
    const scheduleValues = values as ModelPreheatScheduleCreate & ScheduleDraft;
    const {
      schedule_preset: _schedulePreset,
      schedule_time: _scheduleTime,
      schedule_weekday: _scheduleWeekday,
      ...payloadValues
    } = scheduleValues;
    const schedulePayload = getSchedulePayload(scheduleValues);
    const payload = {
      ...payloadValues,
      revision: values.revision?.trim() || null,
      ...schedulePayload,
      include_patterns:
        values.source === 'ollama_library' ? [] : values.include_patterns,
      exclude_patterns:
        values.source === 'ollama_library' ? [] : values.exclude_patterns,
      connectivity_failure_override: confirmValues.connectivityFailure
    };
    setSubmitting(true);
    try {
      if (record) {
        await updateModelPreheatSchedule(record.id, payload);
      } else {
        await createModelPreheatSchedule(payload);
      }
      connectivityIdempotency.current.complete();
      connectivityRecheckStarted.current = false;
      setConfirmValues(null);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  const recheckConnectivity = async () => {
    if (!confirmValues || submitting) return;
    const profileId = confirmValues.values.s3_profile_id;
    setSubmitting(true);
    try {
      await createModelPreheatConnectivityCheck(
        profileId,
        connectivityIdempotency.current.current()
      );
      connectivityIdempotency.current.complete();
      connectivityRecheckStarted.current = false;
      setConfirmValues(null);
      setDependencyRevision((revision) => revision + 1);
    } catch {
      return;
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    if (submitting) return;
    connectivityIdempotency.current.abandon();
    connectivityRecheckStarted.current = false;
    onCancel();
  };

  return (
    <ScrollerModal
      open={open}
      centered
      width={920}
      destroyOnClose
      maskClosable={false}
      keyboard={false}
      title={intl.formatMessage({
        id: record
          ? 'resources.preheat.schedule.edit'
          : 'resources.preheat.schedule.create'
      })}
      onCancel={close}
      footer={
        <ModalFooter
          onOk={save}
          onCancel={close}
          loading={submitting}
          okText={intl.formatMessage({ id: 'common.button.save' })}
          okBtnProps={{
            disabled: loading || dataError || submitting || Boolean(confirmValues)
          }}
        />
      }
    >
      {dataError && (
        <Alert
          type="error"
          showIcon
          message={intl.formatMessage({
            id: 'resources.preheat.dependencies.loadFailed'
          })}
          action={<Button
            size="small"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => setDependencyRevision((revision) => revision + 1)}
          >
            {intl.formatMessage({ id: 'common.button.retry' })}
          </Button>}
          style={{ marginBottom: 16 }}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        disabled={loading || dataError || submitting || Boolean(confirmValues)}
        onValuesChange={(_, values) =>
          {
            const nextValues = values;
            if (nextValues.source === 'ollama_library') {
              form.setFieldsValue({ include_patterns: [], exclude_patterns: [] });
              setDraft({
                ...(nextValues as ModelPreheatScheduleCreate),
                include_patterns: [],
                exclude_patterns: []
              });
              return;
            }
            setDraft(nextValues as ModelPreheatScheduleCreate);
          }
        }
      >
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="source"
              label={intl.formatMessage({ id: 'models.form.source' })}
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { label: 'Hugging Face', value: 'huggingface' },
                  { label: 'ModelScope', value: 'modelscope' },
                  { label: 'Ollama Library', value: 'ollama_library' }
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item name="model_id" label={intl.formatMessage({ id: 'resources.preheat.model' })} rules={[{ required: true }]}>
              <ModelRepositoryPicker
                source={draft.source === 'modelscope' ? 'model_scope' : draft.source}
                onChange={(value) => form.setFieldValue('model_id', value)}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name="delivery_mode"
          label={intl.formatMessage({ id: 'resources.preheat.deliveryMode' })}
          rules={[{ required: true }]}
        >
          <Radio.Group
            options={[
              { value: 's3_only', label: intl.formatMessage({ id: 'resources.preheat.delivery.s3_only' }) },
              { value: 's3_and_workers', label: intl.formatMessage({ id: 'resources.preheat.delivery.s3_and_workers' }) }
            ]}
          />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="s3_profile_id"
              label={intl.formatMessage({
                id: 'resources.preheat.profile.title'
              })}
              rules={[{ required: true, type: 'number', min: 1 }]}
            >
              <Select
                options={profiles.map((profile) => ({
                  label: profile.name,
                  value: profile.id
                }))}
              />
            </Form.Item>
          </Col>
          {draft.delivery_mode !== 's3_only' && <Col xs={24} md={8}>
            <Form.Item
              name="target_scope"
              label={intl.formatMessage({
                id: 'resources.preheat.targetScope'
              })}
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  'selected_workers',
                  'seed_worker',
                  'same_gpu_model'
                ].map((value) => ({
                  value,
                  label: intl.formatMessage({
                    id: `resources.preheat.scope.${value}`
                  })
                }))}
              />
            </Form.Item>
          </Col>}
          {draft.delivery_mode !== 's3_only' && <Col xs={24} md={8}>
            <Form.Item
              name="s3_backfill_policy"
              label={intl.formatMessage({
                id: 'resources.preheat.backfillPolicy'
              })}
              rules={[{ required: true }]}
            >
              <Select
                options={['always', 'when_missing', 'never'].map((value) => ({
                  value,
                  label: intl.formatMessage({
                    id: `resources.preheat.backfill.${value}`
                  })
                }))}
              />
            </Form.Item>
          </Col>}
        </Row>
        {draft.delivery_mode !== 's3_only' && draft.target_scope === 'selected_workers' ? (
          <Form.Item
            name="target_worker_uuids"
            label={intl.formatMessage({
              id: 'resources.preheat.targetWorkers'
            })}
            rules={[{ required: true, type: 'array', min: 1 }]}
          >
            <Select mode="multiple" options={workerOptions} />
          </Form.Item>
        ) : null}
        {draft.delivery_mode !== 's3_only' && <Form.Item
          name="keep_new_workers_in_sync"
          label={intl.formatMessage({ id: 'resources.preheat.keepInSync' })}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>}
        <Form.Item name="name" label={intl.formatMessage({ id: 'resources.preheat.policy.name' })} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <ScheduleEditor disabled={loading || dataError || submitting || Boolean(confirmValues)} />
        <Collapse
          items={[
            {
              key: 'advanced',
              label: intl.formatMessage({ id: 'resources.form.advanced' }),
              forceRender: true,
              children: <>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="revision" label={intl.formatMessage({ id: 'resources.preheat.revision' })}>
                      <Input />
                    </Form.Item>
                  </Col>
                  {draft.delivery_mode !== 's3_only' && <Col xs={24} md={12}>
                    <Form.Item
                      name="seed_worker_uuid"
                      label={intl.formatMessage({ id: 'resources.preheat.seedWorker' })}
                      rules={[{ required: draft.target_scope !== 'selected_workers' }]}
                    >
                      <Select allowClear options={workerOptions} />
                    </Form.Item>
                  </Col>}
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item name="window_duration_minutes" label={intl.formatMessage({ id: 'resources.preheat.schedule.window' })} rules={[{ required: true }]}>
                      <InputNumber min={1} max={10080} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="max_concurrency" label={intl.formatMessage({ id: 'resources.preheat.schedule.concurrency' })} rules={[{ required: true }]}>
                      <InputNumber min={1} max={32} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="bandwidth_limit_mbps" label={intl.formatMessage({ id: 'resources.preheat.schedule.bandwidth' })}>
                      <InputNumber min={1} max={100000} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
                {draft.source !== 'ollama_library' && <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="include_patterns" label={intl.formatMessage({ id: 'resources.preheat.includePatterns' })}>
                      <Select mode="tags" tokenSeparators={[',']} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="exclude_patterns" label={intl.formatMessage({ id: 'resources.preheat.excludePatterns' })}>
                      <Select mode="tags" tokenSeparators={[',']} />
                    </Form.Item>
                  </Col>
                </Row>}
              </>
            }
          ]}
        />
      </Form>
      <ModelPreheatConfirmModal
        open={Boolean(confirmValues)}
        title={intl.formatMessage({ id: 'resources.preheat.confirm.title' })}
        content={<ModelPreheatCreateSummary
          formatMessage={intl.formatMessage}
          flow={intl.formatMessage(
            {
              id: confirmValues?.values.delivery_mode === 's3_only'
                ? 'resources.preheat.confirm.flow.s3Only'
                : 'resources.preheat.confirm.flow.workers'
            },
            {
              model: confirmValues?.values.model_id || '',
              profile: confirmValues?.profileName || ''
            }
          )}
          targetCount={
            confirmValues?.values.delivery_mode === 's3_only'
              ? 0
              : confirmValues?.targetCount
          }
          targetPending={confirmValues?.targetPending}
          kind={
            confirmValues?.values.delivery_mode === 's3_only'
              ? 's3_only'
              : 'workers'
          }
        />}
        okText={intl.formatMessage({
          id: confirmValues?.connectivityFailure
            ? 'resources.preheat.connectivity.createAnyway'
            : 'common.button.save'
        })}
        loading={submitting}
        onOk={confirmSave}
        extra={confirmValues?.connectivityFailure ? <Button
          disabled={submitting}
          onClick={() => {
            if (!connectivityRecheckStarted.current) {
              connectivityIdempotency.current.start();
              connectivityRecheckStarted.current = true;
            }
            void recheckConnectivity();
          }}
        >
          {intl.formatMessage({ id: 'resources.preheat.connectivity.recheck' })}
        </Button> : undefined}
        onCancel={() => {
          connectivityIdempotency.current.abandon();
          connectivityRecheckStarted.current = false;
          setConfirmValues(null);
        }}
      />
    </ScrollerModal>
  );
};

export default ModelPreheatScheduleModal;
