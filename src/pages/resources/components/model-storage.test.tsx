import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ModelFile, ModelPreheatS3Profile } from '../config/types';
import ModelStorageSyncModal from './model-storage-sync-modal';

vi.mock('@umijs/max', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id })
}));

const model: ModelFile = {
  id: 7,
  source: 'modelscope',
  model_scope_model_id: 'team/model-a',
  model_scope_file_path: 'weights/model.gguf',
  huggingface_repo_id: '',
  huggingface_filename: '',
  ollama_library_model_name: '',
  local_path: '',
  local_dir: '',
  worker_id: 2,
  size: 1024,
  download_progress: 100,
  resolved_paths: ['/models/model.gguf'],
  state: 'ready',
  state_message: '',
  created_at: '',
  updated_at: ''
};

const profile: ModelPreheatS3Profile = {
  id: 3,
  name: '默认模型库',
  endpoint: 'https://s3.example.com',
  bucket: 'models',
  prefix: '',
  tls_enabled: true,
  tls_verify: true,
  use_virtual_hosted_style: true,
  credential_configured: true,
  provisioning_source: 'manual',
  provisioning_key: null,
  system_managed: false,
  default_slot: 'global',
  source_fallback_enabled: true,
  is_default: true,
  config_version: 1,
  connectivity_state: 'available',
  last_connectivity_check_id: null,
  last_connectivity_checked_at: null,
  created_at: '',
  updated_at: ''
};

describe('S3 模型库同步确认', () => {
  it('使用居中业务弹窗展示同步对象和目标配置', async () => {
    render(
      <ModelStorageSyncModal
        open
        model={model}
        profiles={[profile]}
        onCancel={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    const dialog = await screen.findByRole('dialog');
    expect(dialog.closest('.ant-modal-wrap')).toHaveClass('ant-modal-centered');
    expect(dialog).toHaveTextContent('team/model-a');
    expect(dialog).toHaveTextContent('默认模型库');
    expect(dialog).toHaveTextContent('1024');
  });
});
