import ModalFooter from '@/components/modal-footer';
import { useIntl } from '@umijs/max';
import { Col, Form, Input, Modal, Row, Switch } from 'antd';
import React, { useEffect, useState } from 'react';
import {
  createModelPreheatS3Profile,
  updateModelPreheatS3Profile
} from '../apis';
import { buildModelPreheatS3ProfilePayload } from '../config/model-preheat';
import type {
  ModelPreheatS3Profile,
  ModelPreheatS3ProfileWrite
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
      is_default: record?.is_default ?? false,
      access_key: '',
      secret_key: ''
    });
  }, [form, open, record]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
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
      closable={!loading}
      onCancel={loading ? undefined : onCancel}
      footer={
        <ModalFooter
          onOk={handleSubmit}
          onCancel={onCancel}
          loading={loading}
          cancelBtnProps={{ disabled: loading }}
        />
      }
    >
      <Form form={form} layout="vertical" requiredMark="optional">
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
              name="is_default"
              label={intl.formatMessage({
                id: 'resources.preheat.profile.default'
              })}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default ModelPreheatS3ProfileModal;
