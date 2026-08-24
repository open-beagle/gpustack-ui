import ModalFooter from '@/components/modal-footer';
import { ExclamationCircleFilled } from '@ant-design/icons';
import { Modal, Space } from 'antd';
import React from 'react';

interface Props {
  open: boolean;
  title: React.ReactNode;
  content: React.ReactNode;
  okText: string;
  loading?: boolean;
  danger?: boolean;
  extra?: React.ReactNode;
  onOk: () => void;
  onCancel: () => void;
}

const ModelPreheatConfirmModal: React.FC<Props> = ({
  open,
  title,
  content,
  okText,
  loading = false,
  danger = false,
  extra,
  onOk,
  onCancel
}) => (
  <Modal
    open={open}
    centered
    width={480}
    title={
      <Space>
        <ExclamationCircleFilled
          style={{
            color: danger
              ? 'var(--ant-color-error)'
              : 'var(--ant-color-warning)'
          }}
        />
        <span>{title}</span>
      </Space>
    }
    closable={!loading}
    maskClosable={false}
    keyboard={false}
    onCancel={loading ? undefined : onCancel}
    footer={
      <ModalFooter
        onOk={onOk}
        onCancel={onCancel}
        okText={okText}
        loading={loading}
        okBtnProps={{ danger, disabled: loading }}
        cancelBtnProps={{ disabled: loading }}
        extra={extra}
      />
    }
  >
    <div style={{ margin: '8px 0 0 28px' }}>
      {content}
    </div>
  </Modal>
);

export default ModelPreheatConfirmModal;
