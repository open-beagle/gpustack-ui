import ModalFooter from '@/components/modal-footer';
import { useIntl } from '@umijs/max';
import { Descriptions, Modal, Select } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createModelStorageSyncTask } from '../apis';
import { IdempotencyKeyLifecycle } from '../config/model-preheat';
import type {
  ModelFile,
  ModelPreheatS3Profile,
  ModelStorageSyncTask
} from '../config/types';

interface Props {
  open: boolean;
  model: ModelFile | null;
  profiles: ModelPreheatS3Profile[];
  onCancel: () => void;
  onCreated: (task: ModelStorageSyncTask) => void;
}

const modelName = (model: ModelFile) =>
  model.model_scope_model_id || model.huggingface_repo_id || model.local_path;

const ModelStorageSyncModal: React.FC<Props> = ({
  open,
  model,
  profiles,
  onCancel,
  onCreated
}) => {
  const intl = useIntl();
  const key = useRef(new IdempotencyKeyLifecycle());
  const [profileId, setProfileId] = useState<number>();
  const [loading, setLoading] = useState(false);
  const selected = useMemo(
    () => profiles.find((profile) => profile.id === profileId),
    [profileId, profiles]
  );

  useEffect(() => {
    if (!open) return;
    key.current.start();
    setProfileId(profiles.find((profile) => profile.is_default)?.id || profiles[0]?.id);
  }, [open, profiles]);

  const close = () => {
    if (loading) return;
    key.current.abandon();
    onCancel();
  };

  const submit = async () => {
    if (!model || !selected || loading) return;
    setLoading(true);
    try {
      const task = await createModelStorageSyncTask(
        { model_file_id: model.id, profile_id: selected.id },
        key.current.current()
      );
      key.current.complete();
      onCreated(task);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      centered
      width={560}
      title={intl.formatMessage({ id: 'resources.storage.sync.confirmTitle' })}
      closable={!loading}
      maskClosable={false}
      keyboard={false}
      onCancel={loading ? undefined : close}
      footer={
        <ModalFooter
          onOk={submit}
          onCancel={close}
          okText={intl.formatMessage({ id: 'resources.storage.sync.submit' })}
          loading={loading}
          okBtnProps={{ disabled: loading || !selected }}
          cancelBtnProps={{ disabled: loading }}
        />
      }
    >
      <Descriptions column={1} size="small">
        <Descriptions.Item label={intl.formatMessage({ id: 'resources.storage.model' })}>
          {model ? modelName(model) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'resources.storage.sourceWorker' })}>
          {model?.worker_id || '-'}
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'resources.storage.version' })}>
          {model?.resolved_revision || model?.requested_revision || '-'}
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'resources.storage.fileCount' })}>
          {model?.resolved_paths?.length || 0}
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'resources.storage.capacity' })}>
          {model?.size || 0}
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'resources.storage.targetProfile' })}>
          <Select
            style={{ width: '100%' }}
            value={profileId}
            disabled={loading}
            onChange={setProfileId}
            options={profiles.map((profile) => ({
              value: profile.id,
              label: profile.name
            }))}
          />
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};

export default ModelStorageSyncModal;
