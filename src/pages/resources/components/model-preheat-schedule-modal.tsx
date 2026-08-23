import ModalFooter from '@/components/modal-footer';
import ScrollerModal from '@/components/scroller-modal';
import { useIntl } from '@umijs/max';
import { Alert, Col, Form, Input, InputNumber, Row, Select, Switch } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import {
  createModelPreheatSchedule,
  queryModelPreheatS3Profiles,
  queryWorkersList,
  updateModelPreheatSchedule
} from '../apis';
import { loadAllPaginated } from '../config/model-preheat';
import type {
  ModelPreheatS3Profile,
  ModelPreheatSchedule,
  ModelPreheatScheduleCreate,
  ModelPreheatWorker
} from '../config/types';

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
  timezone: 'UTC',
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
        const readyWorkers = workerItems.filter(
          (worker) => worker.state === 'ready'
        );
        const activeProfiles = profileItems.filter(
          (profile) => profile.lifecycle_state === 'active'
        );
        const selectedProfile =
          activeProfiles.find((profile) => profile.is_default) ||
          activeProfiles[0];
        const values = record
          ? { ...record }
          : {
              ...defaultValues,
              ...initialValues,
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
  }, [form, initialValues, open, record]);

  const workerOptions = useMemo(
    () =>
      workers.map((worker) => ({
        label: worker.name,
        value: worker.worker_uuid
      })),
    [workers]
  );

  const save = async () => {
    const values = await form.validateFields();
    const payload = {
      ...values,
      revision: values.revision?.trim() || null,
      cron_expression:
        values.trigger_mode === 'scheduled' ? values.cron_expression : null
    };
    setSubmitting(true);
    try {
      if (record) {
        await updateModelPreheatSchedule(record.id, payload);
      } else {
        await createModelPreheatSchedule(payload);
      }
      onSaved();
    } finally {
      setSubmitting(false);
    }
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
      onCancel={onCancel}
      footer={
        <ModalFooter
          onOk={save}
          onCancel={onCancel}
          loading={submitting}
          okText={intl.formatMessage({ id: 'common.button.save' })}
          okBtnProps={{ disabled: loading || dataError || submitting }}
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
          style={{ marginBottom: 16 }}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        disabled={loading || dataError || submitting}
        onValuesChange={(_, values) =>
          setDraft(values as ModelPreheatScheduleCreate)
        }
      >
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="name"
              label={intl.formatMessage({
                id: 'resources.preheat.policy.name'
              })}
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="trigger_mode"
              label={intl.formatMessage({
                id: 'resources.preheat.schedule.triggerMode'
              })}
              rules={[{ required: true }]}
            >
              <Select
                options={['manual', 'scheduled'].map((value) => ({
                  value,
                  label: intl.formatMessage({
                    id: `resources.preheat.schedule.triggerMode.${value}`
                  })
                }))}
              />
            </Form.Item>
          </Col>
          {draft.trigger_mode === 'scheduled' && (
            <>
              <Col xs={24} md={8}>
                <Form.Item
                  name="cron_expression"
                  label={intl.formatMessage({
                    id: 'resources.preheat.schedule.cron'
                  })}
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="timezone"
                  label={intl.formatMessage({
                    id: 'resources.preheat.schedule.timezone'
                  })}
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </>
          )}
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="window_duration_minutes"
              label={intl.formatMessage({
                id: 'resources.preheat.schedule.window'
              })}
              rules={[{ required: true }]}
            >
              <InputNumber min={1} max={10080} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="max_concurrency"
              label={intl.formatMessage({
                id: 'resources.preheat.schedule.concurrency'
              })}
              rules={[{ required: true }]}
            >
              <InputNumber min={1} max={32} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="bandwidth_limit_mbps"
              label={intl.formatMessage({
                id: 'resources.preheat.schedule.bandwidth'
              })}
            >
              <InputNumber min={1} max={100000} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
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
                  { label: 'ModelScope', value: 'modelscope' }
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item
              name="model_id"
              label={intl.formatMessage({ id: 'resources.preheat.model' })}
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="revision"
              label={intl.formatMessage({ id: 'resources.preheat.revision' })}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="include_patterns"
              label={intl.formatMessage({
                id: 'resources.preheat.includePatterns'
              })}
            >
              <Select mode="tags" tokenSeparators={[',']} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="exclude_patterns"
              label={intl.formatMessage({
                id: 'resources.preheat.excludePatterns'
              })}
            >
              <Select mode="tags" tokenSeparators={[',']} />
            </Form.Item>
          </Col>
        </Row>
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
          <Col xs={24} md={8}>
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
          </Col>
          <Col xs={24} md={8}>
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
          </Col>
        </Row>
        {draft.target_scope === 'selected_workers' ? (
          <Form.Item
            name="target_worker_uuids"
            label={intl.formatMessage({
              id: 'resources.preheat.targetWorkers'
            })}
            rules={[{ required: true, type: 'array', min: 1 }]}
          >
            <Select mode="multiple" options={workerOptions} />
          </Form.Item>
        ) : (
          <Form.Item
            name="seed_worker_uuid"
            label={intl.formatMessage({ id: 'resources.preheat.seedWorker' })}
            rules={[{ required: true }]}
          >
            <Select options={workerOptions} />
          </Form.Item>
        )}
        <Form.Item
          name="keep_new_workers_in_sync"
          label={intl.formatMessage({ id: 'resources.preheat.keepInSync' })}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Form>
    </ScrollerModal>
  );
};

export default ModelPreheatScheduleModal;
