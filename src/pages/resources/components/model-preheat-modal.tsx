import ModalFooter from '@/components/modal-footer';
import ScrollerModal from '@/components/scroller-modal';
import { ReloadOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag
} from 'antd';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  createModelPreheatTask,
  queryModelPreheatConnectivityCheck,
  queryModelPreheatS3Profile,
  queryModelPreheatS3Profiles,
  queryWorkersList
} from '../apis';
import {
  IdempotencyKeyLifecycle,
  LatestRequestGate,
  buildModelPreheatPreview,
  loadAllPaginated,
  loadModelPreheatConnectivitySnapshot,
  shouldPollModelPreheatConnectivity,
  submitModelPreheatWithFreshSnapshot
} from '../config/model-preheat';
import type {
  ModelPreheatConnectivityCheck,
  ModelPreheatCreate,
  ModelPreheatS3Profile,
  ModelPreheatTask,
  ModelPreheatWorker
} from '../config/types';

interface Props {
  open: boolean;
  onCancel: () => void;
  onCreated: (task: ModelPreheatTask) => void;
}

const defaultValues: ModelPreheatCreate = {
  source: 'modelscope',
  model_id: '',
  revision: '',
  include_patterns: [],
  exclude_patterns: [],
  target_scope: 'selected_workers',
  target_worker_ids: [],
  seed_worker_id: null,
  s3_profile_id: 0,
  s3_backfill_policy: 'when_missing',
  keep_new_workers_in_sync: false
};

const ModelPreheatModal: React.FC<Props> = ({ open, onCancel, onCreated }) => {
  const intl = useIntl();
  const [form] = Form.useForm<ModelPreheatCreate>();
  const idempotency = useRef(new IdempotencyKeyLifecycle());
  const dependencyRequests = useRef(new LatestRequestGate());
  const snapshotRequests = useRef(new LatestRequestGate());
  const [workers, setWorkers] = useState<ModelPreheatWorker[]>([]);
  const [profiles, setProfiles] = useState<ModelPreheatS3Profile[]>([]);
  const [draft, setDraft] = useState<ModelPreheatCreate>(defaultValues);
  const [connectivity, setConnectivity] =
    useState<ModelPreheatConnectivityCheck | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snapshotRevision, setSnapshotRevision] = useState(0);

  const loadDependencies = useCallback(async () => {
    setDataLoading(true);
    setDataError(false);
    try {
      await dependencyRequests.current.run(
        () =>
          Promise.all([
            loadAllPaginated((page, perPage) =>
              queryWorkersList({ page, perPage })
            ),
            loadAllPaginated((page, perPage) =>
              queryModelPreheatS3Profiles({ page, perPage })
            )
          ]),
        ([workerItems, profileItems]) => {
          const nextWorkers = workerItems as ModelPreheatWorker[];
          const readyWorkerIds = nextWorkers
            .filter((worker) => worker.state === 'ready')
            .map((worker) => worker.id);
          const activeProfileItems = profileItems.filter(
            (item) => item.lifecycle_state === 'active'
          );
          const selectedProfile =
            activeProfileItems.find((item) => item.is_default) || activeProfileItems[0];
          const values = {
            ...defaultValues,
            target_worker_ids: readyWorkerIds,
            s3_profile_id: selectedProfile?.id || 0
          };
          setWorkers(nextWorkers);
          setProfiles(activeProfileItems);
          setDraft(values);
          form.setFieldsValue(values);
        },
        () => setDataLoading(false)
      );
    } catch {
      setDataError(true);
    }
  }, [form]);

  useEffect(() => {
    if (!open) {
      dependencyRequests.current.invalidate();
      return;
    }
    idempotency.current.start();
    setWorkers([]);
    setProfiles([]);
    setDraft(defaultValues);
    setConnectivity(null);
    setDataError(false);
    form.resetFields();
    void loadDependencies();
    return () => {
      dependencyRequests.current.invalidate();
    };
  }, [form, loadDependencies, open]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === draft.s3_profile_id),
    [draft.s3_profile_id, profiles]
  );

  useEffect(() => {
    if (!open || !selectedProfile?.id) {
      snapshotRequests.current.invalidate();
      setConnectivity(null);
      return;
    }
    let active = true;
    let timer: number | undefined;
    let refresh: () => Promise<void>;
    setConnectivity(null);
    setCheckLoading(true);
    const scheduleRefresh = () => {
      timer = window.setTimeout(() => {
        void refresh();
      }, 2000);
    };
    refresh = async () => {
      let currentSnapshot:
        | {
            profile: ModelPreheatS3Profile;
            check: ModelPreheatConnectivityCheck | null;
          }
        | undefined;
      let applied = false;
      try {
        applied = await snapshotRequests.current.run(
          () =>
            loadModelPreheatConnectivitySnapshot(
              selectedProfile.id,
              queryModelPreheatS3Profile,
              queryModelPreheatConnectivityCheck
            ),
          (snapshot) => {
            currentSnapshot = snapshot;
            setProfiles((current) =>
              current
                .map((item) => item.id === snapshot.profile.id ? snapshot.profile : item)
                .filter((item) => item.lifecycle_state === 'active')
            );
            setConnectivity(snapshot.check);
          },
          () => setCheckLoading(false)
        );
      } catch {
        if (active) scheduleRefresh();
        return;
      }
      if (
        active &&
        applied &&
        currentSnapshot &&
        shouldPollModelPreheatConnectivity(
          currentSnapshot.profile,
          currentSnapshot.check
        )
      ) {
        scheduleRefresh();
      }
    };
    void refresh();
    return () => {
      active = false;
      snapshotRequests.current.invalidate();
      if (timer) window.clearTimeout(timer);
    };
  }, [open, selectedProfile?.id, snapshotRevision]);

  const preview = useMemo(
    () =>
      buildModelPreheatPreview(draft, workers, selectedProfile, connectivity),
    [connectivity, draft, selectedProfile, workers]
  );

  const close = () => {
    if (submitting) return;
    idempotency.current.abandon();
    dependencyRequests.current.invalidate();
    snapshotRequests.current.invalidate();
    setConnectivity(null);
    form.resetFields();
    onCancel();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      snapshotRequests.current.invalidate();
      const result = await submitModelPreheatWithFreshSnapshot({
        values,
        workers,
        idempotency: idempotency.current,
        loadWorkers: async () =>
          (await loadAllPaginated((page, perPage) =>
            queryWorkersList({ page, perPage })
          )) as ModelPreheatWorker[],
        loadSnapshot: () =>
          loadModelPreheatConnectivitySnapshot(
            values.s3_profile_id,
            queryModelPreheatS3Profile,
            queryModelPreheatConnectivityCheck
          ),
        createTask: createModelPreheatTask
      });
      setWorkers(result.workers);
      setProfiles((current) =>
        current.map((item) =>
          item.id === result.profile.id ? result.profile : item
        )
      );
      setConnectivity(result.check);
      if (result.submitted && result.task) onCreated(result.task);
    } finally {
      setSubmitting(false);
      setSnapshotRevision((current) => current + 1);
    }
  };

  const workerOptions = workers.map((worker) => ({
    label: `${worker.name} (${intl.formatMessage({
      id: `resources.preheat.state.${worker.state}`
    })})`,
    value: worker.id,
    disabled: worker.state !== 'ready'
  }));

  const previewColumns = [
    {
      title: intl.formatMessage({ id: 'resources.preheat.worker' }),
      dataIndex: ['worker', 'name']
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.connectivity.read' }),
      dataIndex: ['connectivity', 'readable'],
      render: (value: boolean | undefined) => (value ? '✓' : '-')
    },
    {
      title: intl.formatMessage({ id: 'resources.preheat.connectivity.write' }),
      dataIndex: ['connectivity', 'writable'],
      render: (value: boolean | undefined) => (value ? '✓' : '-')
    },
    {
      title: intl.formatMessage({
        id: 'resources.preheat.connectivity.delete'
      }),
      dataIndex: ['connectivity', 'deletable'],
      render: (value: boolean | undefined) => (value ? '✓' : '-')
    },
    {
      title: intl.formatMessage({
        id: 'resources.preheat.connectivity.result'
      }),
      dataIndex: ['connectivity', 'state'],
      render: (value: string | undefined) => (
        <Tag color={value === 'ready' ? 'success' : 'warning'}>
          {value
            ? intl.formatMessage({ id: `resources.preheat.state.${value}` })
            : '-'}
        </Tag>
      )
    }
  ];

  return (
    <ScrollerModal
      open={open}
      centered
      width={920}
      title={intl.formatMessage({ id: 'resources.preheat.task.create' })}
      destroyOnClose
      maskClosable={false}
      keyboard={false}
      closable={!submitting}
      onCancel={close}
      styles={{ body: { maxHeight: '68vh', overflowY: 'auto' } }}
      footer={
        <ModalFooter
          onOk={handleSubmit}
          onCancel={close}
          loading={submitting}
          okText={intl.formatMessage({ id: 'resources.preheat.task.submit' })}
          okBtnProps={{
            disabled:
              submitting ||
              dataLoading ||
              dataError ||
              checkLoading ||
              !preview.canSubmit
          }}
          cancelBtnProps={{ disabled: submitting }}
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
          action={
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={dataLoading}
              onClick={() => {
                void loadDependencies();
              }}
            >
              {intl.formatMessage({ id: 'common.button.retry' })}
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        disabled={dataLoading || dataError || submitting}
        onValuesChange={(_, values) => setDraft(values as ModelPreheatCreate)}
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
              <Input placeholder="Qwen/Qwen-Image" />
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
              rules={[{ required: true, min: 1, type: 'number' }]}
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
        {draft.target_scope === 'selected_workers' && (
          <Form.Item
            name="target_worker_ids"
            label={intl.formatMessage({
              id: 'resources.preheat.targetWorkers'
            })}
            rules={[{ required: true, type: 'array', min: 1 }]}
          >
            <Select mode="multiple" options={workerOptions} />
          </Form.Item>
        )}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="seed_worker_id"
              label={intl.formatMessage({ id: 'resources.preheat.seedWorker' })}
              rules={[{ required: draft.target_scope !== 'selected_workers' }]}
            >
              <Select allowClear options={workerOptions} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="keep_new_workers_in_sync"
              label={intl.formatMessage({ id: 'resources.preheat.keepInSync' })}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {preview.singleWorker && (
          <Alert
            type="info"
            showIcon
            message={intl.formatMessage({
              id: 'resources.preheat.singleWorker'
            })}
          />
        )}
        {preview.blockingReasons.map((reason, index) => (
          <Alert
            key={`${reason.code}-${reason.workerName || index}`}
            type="error"
            showIcon
            message={intl.formatMessage(
              { id: `resources.preheat.block.${reason.code}` },
              { worker: reason.workerName || '' }
            )}
          />
        ))}
        <Table
          rowKey={(row) => row.worker.worker_uuid}
          size="small"
          loading={checkLoading}
          columns={previewColumns}
          dataSource={preview.rows}
          pagination={false}
        />
      </Space>
    </ScrollerModal>
  );
};

export default ModelPreheatModal;
