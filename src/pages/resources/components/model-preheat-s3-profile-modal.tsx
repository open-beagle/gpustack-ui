import ModalFooter from '@/components/modal-footer';
import ScrollerModal from '@/components/scroller-modal';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Col,
  Collapse,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
  Switch,
  Tooltip,
  Typography
} from 'antd';
import React, { useEffect, useState } from 'react';
import {
  createModelPreheatS3Profile,
  queryModelStorageCapabilities,
  testModelStorageConnection,
  updateModelPreheatS3Profile
} from '../apis';
import {
  buildModelPreheatS3ProfilePayload,
  buildSystemManagedModelPreheatS3ProfilePayload,
  getModelStorageErrorPresentation
} from '../config/model-preheat';
import type {
  ModelPreheatS3Profile,
  ModelPreheatS3ProfileWrite,
  ModelStorageConnectionTest,
  ModelStorageConnectionTestRequest
} from '../config/types';
import ModelPreheatConfirmModal from './model-preheat-confirm-modal';

interface Props {
  open: boolean;
  record?: ModelPreheatS3Profile | null;
  onCancel: () => void;
  onSaved: (profile: ModelPreheatS3Profile) => void;
}

const ModelPreheatS3ProfileModal: React.FC<Props> = ({
  open,
  record,
  onCancel,
  onSaved
}) => {
  const intl = useIntl();
  const [form] = Form.useForm<ModelPreheatS3ProfileWrite>();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [encryptionAvailable, setEncryptionAvailable] = useState(true);
  const [testResult, setTestResult] =
    useState<ModelStorageConnectionTest | null>(null);
  const [updatingCredentials, setUpdatingCredentials] = useState(false);
  const [credentialConfirmOpen, setCredentialConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] =
    useState<ModelPreheatS3ProfileWrite | null>(null);
  const editing = Boolean(record);
  const systemManaged = record?.system_managed === true;

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: record?.name || '',
      description: record?.description || '',
      endpoint: record?.endpoint || '',
      bucket: record?.bucket || '',
      prefix: record?.prefix || '',
      region: record?.region || '',
      inventory_refresh_interval_seconds:
        record?.inventory_refresh_interval_seconds ?? null,
      tls_enabled: record?.tls_enabled ?? true,
      tls_verify: record?.tls_verify ?? true,
      use_virtual_hosted_style: record?.use_virtual_hosted_style ?? true,
      default_slot: record?.default_slot ?? null,
      source_fallback_enabled: record?.source_fallback_enabled ?? true,
      access_key: '',
      secret_key: ''
    });
    setUpdatingCredentials(!record);
    setCredentialConfirmOpen(false);
    setPendingValues(null);
  }, [form, open, record]);

  useEffect(() => {
    if (!open) return;
    setTestResult(null);
    void queryModelStorageCapabilities()
      .then((result) =>
        setEncryptionAvailable(
          result?.credential_encryption_available !== false
        )
      )
      .catch(() => setEncryptionAvailable(true));
  }, [open]);

  const tlsValid = (values: ModelPreheatS3ProfileWrite) => {
    const endpoint = values.endpoint?.trim().toLowerCase();
    return !(
      (endpoint.startsWith('https://') && !values.tls_enabled) ||
      (endpoint.startsWith('http://') && values.tls_enabled)
    );
  };

  const validatePayload = async () => {
    const values = await form.validateFields();
    // 系统配置的 endpoint 固定，由后端按 tls_enabled 选择 HTTP 或 HTTPS。
    if (!systemManaged && !tlsValid(values)) {
      form.setFields([
        {
          name: 'endpoint',
          errors: [
            intl.formatMessage({ id: 'resources.storage.endpointTlsMismatch' })
          ]
        }
      ]);
      throw new Error('endpoint_tls_mismatch');
    }
    return values;
  };

  const buildConnectionTestPayload =
    async (): Promise<ModelStorageConnectionTestRequest> => {
      const values = await validatePayload();
      if (!values.access_key?.trim() || !values.secret_key?.trim()) {
        form.setFields([
          {
            name: 'access_key',
            errors: [
              intl.formatMessage({
                id: 'resources.storage.testCredentialsRequired'
              })
            ]
          },
          {
            name: 'secret_key',
            errors: [
              intl.formatMessage({
                id: 'resources.storage.testCredentialsRequired'
              })
            ]
          }
        ]);
        throw new Error('test_credentials_required');
      }
      return {
        endpoint: values.endpoint.trim(),
        bucket: values.bucket.trim(),
        prefix: systemManaged
          ? values.prefix?.trim() || ''
          : editing
            ? record?.prefix || ''
            : '',
        access_key: values.access_key.trim(),
        secret_key: values.secret_key.trim(),
        tls_enabled: values.tls_enabled ?? true,
        tls_verify: values.tls_verify ?? true,
        region: values.region?.trim() || '',
        use_virtual_hosted_style: values.use_virtual_hosted_style ?? true
      };
    };

  const save = async (values: ModelPreheatS3ProfileWrite) => {
    try {
      setLoading(true);
      const payload = systemManaged
        ? buildSystemManagedModelPreheatS3ProfilePayload({
            ...values,
            default_slot: record?.default_slot ?? null
          })
        : buildModelPreheatS3ProfilePayload(values, editing);
      const result = record
        ? await updateModelPreheatS3Profile(record.id, payload)
        : await createModelPreheatS3Profile(payload);
      onSaved(result);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await validatePayload();
      if (editing && !systemManaged && updatingCredentials) {
        setPendingValues(values);
        setCredentialConfirmOpen(true);
        return;
      }
      await save(values);
    } catch {
      // 校验错误已由表单展示，避免业务 Modal Footer 产生未处理拒绝。
    }
  };

  const handleTest = async () => {
    try {
      const values = await buildConnectionTestPayload();
      setTesting(true);
      setTestResult(await testModelStorageConnection(values));
    } catch {
      // 表单错误已显示在字段上，避免产生未处理的测试连接拒绝。
    } finally {
      setTesting(false);
    }
  };

  const busy = loading || testing;
  const credentialsRequiredForTest = editing && !updatingCredentials;
  const switchLabel = (labelId: string, hintId: string) => (
    <span>
      {intl.formatMessage({ id: labelId })}
      <Tooltip title={intl.formatMessage({ id: hintId })}>
        <span
          aria-label={intl.formatMessage({ id: hintId })}
          style={{
            marginLeft: 6,
            color: 'rgba(0, 0, 0, 0.45)',
            cursor: 'help'
          }}
          tabIndex={0}
        >
          <QuestionCircleOutlined />
        </span>
      </Tooltip>
    </span>
  );
  const connectionStageContent = (
    stage: ModelStorageConnectionTest['connection']
  ) => {
    if (stage.ok) {
      return intl.formatMessage({ id: 'resources.storage.connectionTest.ok' });
    }
    const presentation = getModelStorageErrorPresentation(
      stage.error_code || testResult?.error_code
    );
    return (
      <Space direction="vertical" size={0}>
        <span>{intl.formatMessage({ id: presentation.messageId })}</span>
        <Typography.Text type="secondary">
          {intl.formatMessage({ id: presentation.actionHintId })}
        </Typography.Text>
      </Space>
    );
  };

  return (
    <ScrollerModal
      open={open}
      centered
      width={720}
      title={intl.formatMessage({
        id: editing
          ? 'resources.preheat.profile.edit'
          : 'resources.preheat.profile.create'
      })}
      styles={{ body: { maxHeight: '68vh', overflowY: 'auto' } }}
      destroyOnHidden
      maskClosable={false}
      keyboard={false}
      closable={!busy}
      onCancel={() => {
        if (!busy) onCancel();
      }}
      footer={
        <ModalFooter
          onOk={handleSubmit}
          onCancel={onCancel}
          loading={loading}
          okBtnProps={{ disabled: busy || !encryptionAvailable }}
          cancelBtnProps={{ disabled: busy }}
          extra={
            !systemManaged && (
              <Tooltip
                title={
                  credentialsRequiredForTest
                    ? intl.formatMessage({
                        id: 'resources.storage.testCredentialsRequiredHint'
                      })
                    : undefined
                }
              >
                <Button
                  onClick={handleTest}
                  loading={testing}
                  disabled={
                    busy || !encryptionAvailable || credentialsRequiredForTest
                  }
                >
                  {intl.formatMessage({
                    id: 'resources.storage.testConnection'
                  })}
                </Button>
              </Tooltip>
            )
          }
        />
      }
    >
      {!encryptionAvailable && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message={intl.formatMessage({
            id: 'resources.storage.encryptionUnavailable'
          })}
        />
      )}
      {!systemManaged && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={intl.formatMessage({
            id: 'resources.storage.connectionScope'
          })}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        disabled={busy}
        onValuesChange={() => setTestResult(null)}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label={intl.formatMessage({
                id: 'resources.preheat.profile.name'
              })}
              rules={[{ required: true }]}
            >
              <Input disabled={systemManaged} maxLength={255} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="endpoint"
              label={intl.formatMessage({
                id: 'resources.preheat.profile.endpoint'
              })}
              rules={[{ required: true, type: 'url' }]}
            >
              <Input
                disabled={systemManaged}
                placeholder="https://s3.example.com"
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="bucket"
              label={intl.formatMessage({
                id: 'resources.preheat.profile.bucket'
              })}
              rules={[{ required: true }]}
            >
              <Input disabled={systemManaged} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="prefix"
              label={intl.formatMessage({
                id: 'resources.preheat.profile.prefix'
              })}
            >
              <Input disabled />
            </Form.Item>
          </Col>
        </Row>
        {!systemManaged && (updatingCredentials || !editing) ? (
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="access_key"
                label={intl.formatMessage({
                  id: 'resources.preheat.profile.accessKey'
                })}
                rules={[{ required: true }]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="secret_key"
                label={intl.formatMessage({
                  id: 'resources.preheat.profile.secretKey'
                })}
                rules={[{ required: true }]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
            </Col>
          </Row>
        ) : !systemManaged ? (
          <Button type="link" onClick={() => setUpdatingCredentials(true)}>
            {intl.formatMessage({ id: 'resources.storage.updateCredentials' })}
          </Button>
        ) : null}
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
                        name="region"
                        label={intl.formatMessage({
                          id: 'resources.preheat.profile.region'
                        })}
                      >
                        <Input disabled={systemManaged} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="description"
                        label={intl.formatMessage({
                          id: 'resources.preheat.profile.description'
                        })}
                      >
                        <Input disabled={systemManaged} maxLength={500} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="tls_enabled"
                        label={switchLabel(
                          'resources.preheat.profile.tlsEnabled',
                          'resources.storage.tlsEnabledHint'
                        )}
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="tls_verify"
                        label={switchLabel(
                          'resources.preheat.profile.tlsVerify',
                          'resources.storage.tlsVerifyHint'
                        )}
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="use_virtual_hosted_style"
                        label={switchLabel(
                          'resources.preheat.profile.virtualHosted',
                          'resources.storage.virtualHostedHint'
                        )}
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="source_fallback_enabled"
                        label={switchLabel(
                          'resources.storage.sourceFallback',
                          'resources.storage.sourceFallbackDetail'
                        )}
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="inventory_refresh_interval_seconds"
                        label={intl.formatMessage({
                          id: 'resources.storage.inventoryRefreshInterval'
                        })}
                      >
                        <InputNumber
                          min={60}
                          precision={0}
                          disabled={systemManaged}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              )
            }
          ]}
        />
      </Form>
      {testResult && (
        <Descriptions
          bordered
          size="small"
          column={2}
          style={{ marginTop: 16 }}
          title={intl.formatMessage({ id: 'resources.storage.testResult' })}
        >
          <Descriptions.Item
            label={intl.formatMessage({
              id: 'resources.storage.connectionTest.scope'
            })}
          >
            {intl.formatMessage({
              id: `resources.storage.connectionTest.scope.${testResult.scope}`
            })}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({
              id: 'resources.storage.connectionTest.stage.connection'
            })}
          >
            {connectionStageContent(testResult.connection)}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({
              id: 'resources.storage.connectionTest.stage.bucket'
            })}
          >
            {connectionStageContent(testResult.bucket)}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({
              id: 'resources.storage.connectionTest.stage.write'
            })}
          >
            {connectionStageContent(testResult.write)}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({
              id: 'resources.storage.connectionTest.stage.read'
            })}
          >
            {connectionStageContent(testResult.read)}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({
              id: 'resources.storage.connectionTest.stage.delete'
            })}
          >
            {connectionStageContent(testResult.delete)}
          </Descriptions.Item>
        </Descriptions>
      )}
      <ModelPreheatConfirmModal
        open={credentialConfirmOpen}
        title={intl.formatMessage({
          id: 'resources.storage.updateCredentials'
        })}
        content={intl.formatMessage({
          id: 'resources.storage.updateCredentialsContent'
        })}
        okText={intl.formatMessage({
          id: 'resources.storage.updateCredentials'
        })}
        loading={loading}
        onCancel={loading ? undefined : () => setCredentialConfirmOpen(false)}
        onOk={async () => {
          if (!pendingValues) return;
          try {
            await save(pendingValues);
            setCredentialConfirmOpen(false);
            setPendingValues(null);
          } catch {
            // 保留确认框与输入值，用户可在失败后直接重试。
          }
        }}
      />
    </ScrollerModal>
  );
};

export default ModelPreheatS3ProfileModal;
