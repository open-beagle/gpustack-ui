import ModalFooter from '@/components/modal-footer';
import { useIntl } from '@umijs/max';
import { Alert, Button, Col, Descriptions, Form, Input, Modal, Row, Switch } from 'antd';
import React, { useEffect, useState } from 'react';
import {
  createModelPreheatS3Profile,
  queryModelStorageCapabilities,
  testModelStorageConnection,
  updateModelPreheatS3Profile
} from '../apis';
import { buildModelPreheatS3ProfilePayload } from '../config/model-preheat';
import type {
  ModelPreheatS3Profile,
  ModelPreheatS3ProfileWrite,
  ModelStorageConnectionTestRequest,
  ModelStorageConnectionTest
} from '../config/types';

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
  const [testResult, setTestResult] = useState<ModelStorageConnectionTest | null>(null);
  const editing = Boolean(record);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: record?.name || '',
      description: record?.description || '',
      endpoint: record?.endpoint || '',
      bucket: record?.bucket || '',
      prefix: record?.prefix || '',
      region: record?.region || '',
      tls_enabled: record?.tls_enabled ?? true,
      tls_verify: record?.tls_verify ?? true,
      use_virtual_hosted_style: record?.use_virtual_hosted_style ?? true,
      default_slot: record?.default_slot ?? null,
      source_fallback_enabled: record?.source_fallback_enabled ?? true,
      access_key: '',
      secret_key: ''
    });
  }, [form, open, record]);

  useEffect(() => {
    if (!open) return;
    setTestResult(null);
    void queryModelStorageCapabilities()
      .then((result) => setEncryptionAvailable(result?.credential_encryption_available !== false))
      .catch(() => setEncryptionAvailable(true));
  }, [open]);

  const tlsValid = (values: ModelPreheatS3ProfileWrite) => {
    const endpoint = values.endpoint?.trim().toLowerCase();
    return !((endpoint.startsWith('https://') && !values.tls_enabled) ||
      (endpoint.startsWith('http://') && values.tls_enabled));
  };

  const validatePayload = async () => {
    const values = await form.validateFields();
    if (!tlsValid(values)) {
      form.setFields([{ name: 'endpoint', errors: [intl.formatMessage({ id: 'resources.storage.endpointTlsMismatch' })] }]);
      throw new Error('endpoint_tls_mismatch');
    }
    return values;
  };

  const buildConnectionTestPayload = async (): Promise<ModelStorageConnectionTestRequest> => {
    const values = await validatePayload();
    if (!values.access_key?.trim() || !values.secret_key?.trim()) {
      form.setFields([
        { name: 'access_key', errors: [intl.formatMessage({ id: 'resources.storage.testCredentialsRequired' })] },
        { name: 'secret_key', errors: [intl.formatMessage({ id: 'resources.storage.testCredentialsRequired' })] }
      ]);
      throw new Error('test_credentials_required');
    }
    return {
      endpoint: values.endpoint.trim(),
      bucket: values.bucket.trim(),
      prefix: values.prefix?.trim() || '',
      access_key: values.access_key.trim(),
      secret_key: values.secret_key.trim(),
      tls_enabled: values.tls_enabled ?? true,
      tls_verify: values.tls_verify ?? true,
      region: values.region?.trim() || '',
      use_virtual_hosted_style: values.use_virtual_hosted_style ?? true
    };
  };

  const handleSubmit = async () => {
    try {
      const values = await validatePayload();
      setLoading(true);
      const payload = buildModelPreheatS3ProfilePayload(values, editing);
      const result = record
        ? await updateModelPreheatS3Profile(record.id, payload)
        : await createModelPreheatS3Profile(payload);
      onSaved(result);
    } finally {
      setLoading(false);
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

  return (
    <Modal
      open={open}
      centered
      width={720}
      title={intl.formatMessage({
        id: editing
          ? 'resources.preheat.profile.edit'
          : 'resources.preheat.profile.create'
      })}
      destroyOnClose
      maskClosable={false}
      keyboard={false}
      closable={!busy}
      onCancel={busy ? undefined : onCancel}
      footer={
        <ModalFooter
          onOk={handleSubmit}
          onCancel={onCancel}
          loading={loading}
          okBtnProps={{ disabled: busy || !encryptionAvailable }}
          cancelBtnProps={{ disabled: busy }}
          extra={<Button onClick={handleTest} loading={testing} disabled={busy || !encryptionAvailable}>{intl.formatMessage({ id: 'resources.storage.testConnection' })}</Button>}
        />
      }
    >
      {!encryptionAvailable && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={intl.formatMessage({ id: 'resources.storage.encryptionUnavailable' })} />}
      <Alert type="info" showIcon style={{ marginBottom: 16 }} message={intl.formatMessage({ id: 'resources.storage.connectionScope' })} />
      <Form form={form} layout="vertical" requiredMark="optional" disabled={busy} onValuesChange={() => setTestResult(null)}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label={intl.formatMessage({
                id: 'resources.preheat.profile.name'
              })}
              rules={[{ required: true }]}
            >
              <Input maxLength={255} />
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
              <Input placeholder="https://s3.example.com" />
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
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="prefix"
              label={intl.formatMessage({
                id: 'resources.preheat.profile.prefix'
              })}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="access_key"
              label={intl.formatMessage({
                id: 'resources.preheat.profile.accessKey'
              })}
              rules={[{ required: !editing }]}
            >
              <Input.Password
                autoComplete="new-password"
                placeholder={
                  editing
                    ? intl.formatMessage({
                        id: 'resources.preheat.profile.credentialUnchanged'
                      })
                    : undefined
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="secret_key"
              label={intl.formatMessage({
                id: 'resources.preheat.profile.secretKey'
              })}
              rules={[{ required: !editing }]}
            >
              <Input.Password
                autoComplete="new-password"
                placeholder={
                  editing
                    ? intl.formatMessage({
                        id: 'resources.preheat.profile.credentialUnchanged'
                      })
                    : undefined
                }
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="region"
              label={intl.formatMessage({
                id: 'resources.preheat.profile.region'
              })}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="description"
              label={intl.formatMessage({
                id: 'resources.preheat.profile.description'
              })}
            >
              <Input maxLength={500} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={12} md={6}>
            <Form.Item
              name="tls_enabled"
              label={intl.formatMessage({
                id: 'resources.preheat.profile.tlsEnabled'
              })}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item
              name="tls_verify"
              label={intl.formatMessage({
                id: 'resources.preheat.profile.tlsVerify'
              })}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item
              name="use_virtual_hosted_style"
              label={intl.formatMessage({
                id: 'resources.preheat.profile.virtualHosted'
              })}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item
              name="source_fallback_enabled"
              label={intl.formatMessage({
                id: 'resources.storage.sourceFallback'
              })}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>
        <Alert type="info" showIcon message={intl.formatMessage({ id: 'resources.storage.sourceFallbackHint' })} />
      </Form>
      {testResult && <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }} title={intl.formatMessage({ id: 'resources.storage.testResult' })}>
        <Descriptions.Item label="scope">{testResult.scope}</Descriptions.Item>
        <Descriptions.Item label="connection">{testResult.connection.ok ? 'OK' : testResult.connection.error_code || testResult.error_code || '-'}</Descriptions.Item>
        <Descriptions.Item label="bucket">{testResult.bucket.ok ? 'OK' : testResult.bucket.error_code || '-'}</Descriptions.Item>
        <Descriptions.Item label="write">{testResult.write.ok ? 'OK' : testResult.write.error_code || '-'}</Descriptions.Item>
        <Descriptions.Item label="read">{testResult.read.ok ? 'OK' : testResult.read.error_code || '-'}</Descriptions.Item>
        <Descriptions.Item label="delete">{testResult.delete.ok ? 'OK' : testResult.delete.error_code || '-'}</Descriptions.Item>
      </Descriptions>}
    </Modal>
  );
};

export default ModelPreheatS3ProfileModal;
