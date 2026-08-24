import ModalFooter from '@/components/modal-footer';
import { useIntl } from '@umijs/max';
import { Alert, Descriptions, Modal, Select, Tooltip, Typography } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createModelStorageSyncTask } from '../apis';
import {
  getModelFileStorageModelId,
  getModelStorageRevisionPresentation,
  IdempotencyKeyLifecycle
} from '../config/model-preheat';
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

const activeProfiles = (profiles: ModelPreheatS3Profile[]) =>
  profiles.filter((profile) => profile.lifecycle_state === 'active');

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
    () => activeProfiles(profiles).find((profile) => profile.id === profileId),
    [profileId, profiles]
  );
  const defaultProfile = useMemo(
    () => activeProfiles(profiles).find((profile) => profile.is_default),
    [profiles]
  );
  const alreadyFromDefault =
    selected?.id === model?.transfer_profile_id &&
    ['s3', 'peer_via_s3'].includes(model?.transfer_source || '');
  const revision = model?.resolved_revision || model?.requested_revision;
  const revisionPresentation = revision
    ? getModelStorageRevisionPresentation(revision)
    : null;

  useEffect(() => {
    if (!open) return;
    key.current.start();
    const selectableProfiles = activeProfiles(profiles);
    setProfileId(selectableProfiles.find((profile) => profile.is_default)?.id);
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
          okBtnProps={{ disabled: loading || !selected || alreadyFromDefault }}
          cancelBtnProps={{ disabled: loading }}
        />
      }
    >
      {!defaultProfile && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={intl.formatMessage({
            id: 'resources.storage.sync.noDefault'
          })}
        />
      )}
      {alreadyFromDefault && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={intl.formatMessage({
            id: 'resources.storage.sync.alreadyFromDefault'
          })}
        />
      )}
      <Descriptions column={1} size="small">
        <Descriptions.Item
          label={intl.formatMessage({ id: 'resources.storage.model' })}
        >
          {model ? getModelFileStorageModelId(model) : '-'}
        </Descriptions.Item>
        <Descriptions.Item
          label={intl.formatMessage({ id: 'resources.storage.sourceWorker' })}
        >
          {model?.worker_id || '-'}
        </Descriptions.Item>
        <Descriptions.Item
          label={intl.formatMessage({ id: 'resources.storage.version' })}
        >
          {revisionPresentation ? (
            <Tooltip title={revisionPresentation.full}>
              <Typography.Text copyable={{ text: revisionPresentation.full }}>
                {revisionPresentation.kind === 'modelscope_filelist'
                  ? intl.formatMessage(
                      { id: 'resources.storage.revision.modelscopeFilelist' },
                      { fingerprint: revisionPresentation.short }
                    )
                  : revisionPresentation.short}
              </Typography.Text>
            </Tooltip>
          ) : (
            '-'
          )}
        </Descriptions.Item>
        <Descriptions.Item
          label={intl.formatMessage({ id: 'resources.storage.fileCount' })}
        >
          {model?.resolved_paths?.length || 0}
        </Descriptions.Item>
        <Descriptions.Item
          label={intl.formatMessage({ id: 'resources.storage.capacity' })}
        >
          {model?.size || 0}
        </Descriptions.Item>
        <Descriptions.Item
          label={intl.formatMessage({ id: 'resources.storage.targetProfile' })}
        >
          <Select
            style={{ width: '100%' }}
            value={profileId}
            disabled={loading}
            onChange={setProfileId}
            options={activeProfiles(profiles).map((profile) => ({
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
