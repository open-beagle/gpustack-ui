import ModalFooter from '@/components/modal-footer';
import ScrollerModal from '@/components/scroller-modal';
import { ReloadOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Col,
  Collapse,
  Form,
  Input,
  Radio,
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
  createModelPreheatConnectivityCheck,
  createModelPreheatTask,
  queryModelPreheatConnectivityCheck,
  queryModelPreheatS3Profile,
  queryModelPreheatS3Profiles,
  queryWorkersList
} from '../apis';
import { clearOwnedGgufPatterns } from '../config/model-gguf';
import {
  IdempotencyKeyLifecycle,
  LatestRequestGate,
  buildModelPreheatCreatePayload,
  buildModelPreheatPreview,
  eligibleModelPreheatWorkers,
  loadAllPaginated,
  loadModelPreheatConnectivitySnapshot,
  prepareModelPreheatWithFreshSnapshot,
  shouldPollModelPreheatConnectivity
} from '../config/model-preheat';
import type {
  ModelPreheatConnectivityCheck,
  ModelPreheatCreate,
  ModelPreheatS3Profile,
  ModelPreheatTask,
  ModelPreheatWorker
} from '../config/types';
import ModelGgufFileSelect from './model-gguf-file-select';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';
import ModelPreheatCreateSummary from './model-preheat-create-summary';
import ModelRepositoryPicker from './model-repository-picker';

interface Props {
  open: boolean;
  onCancel: () => void;
  onCreated: (task: ModelPreheatTask) => void;
  initialValues?: Partial<ModelPreheatCreate>;
  forceKeepNewWorkersInSync?: boolean;
  titleId?: string;
  submitId?: string;
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
  delivery_mode: 's3_and_workers',
  keep_new_workers_in_sync: false
};

const ModelPreheatModal: React.FC<Props> = ({
  open,
  onCancel,
  onCreated,
  initialValues,
  forceKeepNewWorkersInSync = false,
  titleId = 'resources.preheat.task.create',
  submitId = 'resources.preheat.task.submit'
}) => {
  const intl = useIntl();
  const [form] = Form.useForm<ModelPreheatCreate>();
  const modelId = Form.useWatch('model_id', form);
  const revision = Form.useWatch('revision', form);
  const includePatterns = Form.useWatch('include_patterns', form);
  const ggufSelectorPatterns = useRef<string[]>();
  const idempotency = useRef(new IdempotencyKeyLifecycle());
  const connectivityIdempotency = useRef(new IdempotencyKeyLifecycle());
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
  const [confirmCheck, setConfirmCheck] = useState(false);
  const [confirmCreate, setConfirmCreate] = useState<{
    values: ModelPreheatCreate;
    profileName: string;
    targetCount: number;
    connectivityFailure: boolean;
  } | null>(null);

  const clearStaleGgufSelection = () => {
    const current = form.getFieldValue('include_patterns');
    const next = clearOwnedGgufPatterns(current, ggufSelectorPatterns.current);
    ggufSelectorPatterns.current = undefined;
    if (next !== current) form.setFieldValue('include_patterns', next);
  };

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
          const readyWorkerIds = eligibleModelPreheatWorkers(nextWorkers).map(
            (worker) => worker.id
          );
          const activeProfileItems = profileItems.filter(
            (item) => item.lifecycle_state === 'active'
          );
          const selectedProfile =
            activeProfileItems.find((item) => item.is_default) ||
            activeProfileItems[0];
          const values = {
            ...defaultValues,
            ...initialValues,
            target_worker_ids: readyWorkerIds,
            s3_profile_id:
              initialValues?.s3_profile_id || selectedProfile?.id || 0,
            keep_new_workers_in_sync:
              forceKeepNewWorkersInSync ||
              Boolean(initialValues?.keep_new_workers_in_sync)
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
  }, [forceKeepNewWorkersInSync, form, initialValues]);

  useEffect(() => {
    if (!open) {
      dependencyRequests.current.invalidate();
      return;
    }
    idempotency.current.start();
    connectivityIdempotency.current.abandon();
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
                .map((item) =>
                  item.id === snapshot.profile.id ? snapshot.profile : item
                )
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
    connectivityIdempotency.current.abandon();
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
      const result = await prepareModelPreheatWithFreshSnapshot({
        values,
        loadWorkers: async () =>
          (await loadAllPaginated((page, perPage) =>
            queryWorkersList({ page, perPage })
          )) as ModelPreheatWorker[],
        loadSnapshot: () =>
          loadModelPreheatConnectivitySnapshot(
            values.s3_profile_id,
            queryModelPreheatS3Profile,
            queryModelPreheatConnectivityCheck
          )
      });
      setWorkers(result.workers);
      setProfiles((current) =>
        current.map((item) =>
          item.id === result.profile.id ? result.profile : item
        )
      );
      setConnectivity(result.check);
      const connectivityFailure =
        result.preview.blockingReasons.length > 0 &&
        result.preview.blockingReasons.every((reason) =>
          [
            'worker_connectivity_missing',
            'worker_connectivity_unavailable'
          ].includes(reason.code)
        );
      if (result.preview.canSubmit || connectivityFailure) {
        setConfirmCreate({
          values,
          profileName: result.profile.name,
          targetCount: result.preview.rows.length,
          connectivityFailure
        });
      }
    } finally {
      setSubmitting(false);
      setSnapshotRevision((current) => current + 1);
    }
  };

  const submitDespiteConnectivityFailure = async () => {
    if (!confirmCreate) return;
    setSubmitting(true);
    try {
      const payload = {
        ...buildModelPreheatCreatePayload(confirmCreate.values),
        ...(confirmCreate.connectivityFailure
          ? { connectivity_failure_override: true }
          : {})
      };
      const task = await createModelPreheatTask(
        payload,
        idempotency.current.keyForRequest(JSON.stringify(payload))
      );
      idempotency.current.complete();
      setConfirmCreate(null);
      onCreated(task);
    } finally {
      setSubmitting(false);
    }
  };

  const runConnectivityCheck = async () => {
    if (!selectedProfile || checkLoading) return;
    setCheckLoading(true);
    try {
      await createModelPreheatConnectivityCheck(
        selectedProfile.id,
        connectivityIdempotency.current.current()
      );
      connectivityIdempotency.current.complete();
      setConfirmCheck(false);
      setSnapshotRevision((current) => current + 1);
    } catch {
      return;
    } finally {
      setCheckLoading(false);
    }
  };

  const readyWorkers = eligibleModelPreheatWorkers(workers);
  const workerOptions = readyWorkers.map((worker) => ({
    label: `${worker.name} (${intl.formatMessage({
      id: `resources.preheat.state.${worker.state}`
    })})`,
    value: worker.id
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
      title={intl.formatMessage({ id: titleId })}
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
          okText={intl.formatMessage({ id: submitId })}
          okBtnProps={{
            disabled:
              submitting ||
              dataLoading ||
              dataError ||
              checkLoading ||
              preview.blockingReasons.some(
                (reason) =>
                  ![
                    'worker_connectivity_missing',
                    'worker_connectivity_unavailable'
                  ].includes(reason.code)
              )
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
                onChange={clearStaleGgufSelection}
                options={[
                  { label: 'Hugging Face', value: 'huggingface' },
                  { label: 'ModelScope', value: 'modelscope' },
                  { label: 'Ollama Library', value: 'ollama_library' }
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item
              name="model_id"
              label={intl.formatMessage({ id: 'resources.preheat.model' })}
              rules={[{ required: true }]}
            >
              <ModelRepositoryPicker
                source={
                  draft.source === 'modelscope' ? 'model_scope' : draft.source
                }
                value={modelId || undefined}
                onChange={(value) => {
                  clearStaleGgufSelection();
                  form.setFieldValue('model_id', value);
                }}
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
              {
                value: 's3_only',
                label: intl.formatMessage({
                  id: 'resources.preheat.delivery.s3_only'
                })
              },
              {
                value: 's3_and_workers',
                label: intl.formatMessage({
                  id: 'resources.preheat.delivery.s3_and_workers'
                })
              }
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
          {draft.delivery_mode !== 's3_only' && (
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
          )}
          {draft.delivery_mode !== 's3_only' && (
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
          )}
        </Row>
        {draft.delivery_mode !== 's3_only' &&
          draft.target_scope === 'selected_workers' && (
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
        {draft.delivery_mode !== 's3_only' && (
          <Form.Item
            name="keep_new_workers_in_sync"
            label={intl.formatMessage({ id: 'resources.preheat.keepInSync' })}
            valuePropName="checked"
          >
            <Switch disabled={forceKeepNewWorkersInSync} />
          </Form.Item>
        )}
        <Collapse
          items={[
            {
              key: 'advanced',
              label: intl.formatMessage({ id: 'resources.form.advanced' }),
              forceRender: true,
              children: (
                <>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="revision"
                        label={intl.formatMessage({
                          id: 'resources.preheat.revision'
                        })}
                        extra={intl.formatMessage({
                          id: 'resources.preheat.revision.help'
                        })}
                      >
                        <Input
                          placeholder="main, v1.0.0, a1b2c3d4"
                          onChange={clearStaleGgufSelection}
                        />
                      </Form.Item>
                    </Col>
                    {draft.delivery_mode !== 's3_only' && (
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="seed_worker_id"
                          label={intl.formatMessage({
                            id: 'resources.preheat.seedWorker'
                          })}
                          extra={intl.formatMessage({
                            id: 'resources.preheat.seedWorker.help'
                          })}
                          rules={[
                            {
                              required:
                                draft.target_scope !== 'selected_workers'
                            }
                          ]}
                        >
                          <Select allowClear options={workerOptions} />
                        </Form.Item>
                      </Col>
                    )}
                  </Row>
                  {draft.source !== 'ollama_library' && (
                    <Row gutter={16}>
                      <Col xs={24}>
                        <Form.Item
                          label={intl.formatMessage({
                            id: 'resources.preheat.gguf.quantization'
                          })}
                          extra={intl.formatMessage({
                            id: 'resources.preheat.gguf.quantization.help'
                          })}
                        >
                          <ModelGgufFileSelect
                            source={draft.source}
                            modelId={modelId}
                            revision={revision}
                            value={includePatterns}
                            onChange={(patterns) => {
                              ggufSelectorPatterns.current = [...patterns];
                              form.setFieldValue('include_patterns', patterns);
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="include_patterns"
                          label={intl.formatMessage({
                            id: 'resources.preheat.includePatterns'
                          })}
                          extra={intl.formatMessage({
                            id: 'resources.preheat.includePatterns.help'
                          })}
                        >
                          <Select
                            mode="tags"
                            tokenSeparators={[',']}
                            placeholder={intl.formatMessage({
                              id: 'resources.preheat.includePatterns.placeholder'
                            })}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="exclude_patterns"
                          label={intl.formatMessage({
                            id: 'resources.preheat.excludePatterns'
                          })}
                          extra={intl.formatMessage({
                            id: 'resources.preheat.excludePatterns.help'
                          })}
                        >
                          <Select
                            mode="tags"
                            tokenSeparators={[',']}
                            placeholder={intl.formatMessage({
                              id: 'resources.preheat.excludePatterns.placeholder'
                            })}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  )}
                </>
              )
            }
          ]}
        />
      </Form>

      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {!readyWorkers.length ? (
          <Alert
            type="info"
            showIcon
            message={intl.formatMessage({
              id: 'resources.preheat.noReadyWorkers'
            })}
          />
        ) : (
          <Button
            icon={<ReloadOutlined />}
            loading={checkLoading}
            disabled={!selectedProfile || submitting}
            onClick={() => {
              connectivityIdempotency.current.start();
              setConfirmCheck(true);
            }}
          >
            {intl.formatMessage({ id: 'resources.storage.checkWorkers' })}
          </Button>
        )}
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
      <ModelPreheatConfirmModal
        open={confirmCheck}
        title={intl.formatMessage({
          id: 'resources.storage.checkWorkersConfirm'
        })}
        content={intl.formatMessage(
          { id: 'resources.storage.checkWorkersContent' },
          { name: selectedProfile?.name || '' }
        )}
        okText={intl.formatMessage({ id: 'resources.storage.checkWorkers' })}
        loading={checkLoading}
        onOk={runConnectivityCheck}
        onCancel={() => {
          connectivityIdempotency.current.abandon();
          setConfirmCheck(false);
        }}
      />
      <ModelPreheatConfirmModal
        open={Boolean(confirmCreate)}
        title={intl.formatMessage({ id: 'resources.preheat.confirm.title' })}
        content={
          <ModelPreheatCreateSummary
            formatMessage={intl.formatMessage}
            flow={intl.formatMessage(
              {
                id:
                  confirmCreate?.values.delivery_mode === 's3_only'
                    ? 'resources.preheat.confirm.flow.s3Only'
                    : 'resources.preheat.confirm.flow.workers'
              },
              {
                model: confirmCreate?.values.model_id || '',
                profile: confirmCreate?.profileName || ''
              }
            )}
            targetCount={
              confirmCreate?.values.delivery_mode === 's3_only'
                ? 0
                : confirmCreate?.targetCount
            }
            kind={
              confirmCreate?.values.delivery_mode === 's3_only'
                ? 's3_only'
                : 'workers'
            }
          />
        }
        okText={intl.formatMessage({
          id: confirmCreate?.connectivityFailure
            ? 'resources.preheat.connectivity.createAnyway'
            : submitId
        })}
        loading={submitting}
        extra={
          confirmCreate?.connectivityFailure ? (
            <Button
              disabled={submitting || checkLoading}
              onClick={() => {
                setConfirmCreate(null);
                connectivityIdempotency.current.start();
                setConfirmCheck(true);
              }}
            >
              {intl.formatMessage({
                id: 'resources.preheat.connectivity.recheck'
              })}
            </Button>
          ) : undefined
        }
        onOk={submitDespiteConnectivityFailure}
        onCancel={() => setConfirmCreate(null)}
      />
    </ScrollerModal>
  );
};

export default ModelPreheatModal;
