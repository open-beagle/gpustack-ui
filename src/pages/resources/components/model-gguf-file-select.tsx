import {
  queryHuggingfaceModelFiles,
  queryModelScopeModelFiles
} from '@/pages/llmodels/apis';
import { convertFileSize } from '@/utils';
import { useIntl } from '@umijs/max';
import { Alert, Select } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { groupGgufFiles, type GgufFile } from '../config/model-gguf';

type Source = 'modelscope' | 'huggingface';

interface Props {
  source: Source;
  modelId?: string;
  revision?: string | null;
  value?: string[];
  disabled?: boolean;
  onChange?: (patterns: string[]) => void;
}

const ModelGgufFileSelect: React.FC<Props> = ({
  source,
  modelId,
  revision,
  value,
  disabled,
  onChange
}) => {
  const intl = useIntl();
  const [files, setFiles] = useState<GgufFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!modelId) {
      setFiles([]);
      setError(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const load = async () => {
      if (source === 'huggingface') {
        const result = await queryHuggingfaceModelFiles(
          {
            repo: modelId,
            ...(revision?.trim() ? { revision: revision.trim() } : {})
          },
          { signal: controller.signal }
        );
        return result
          .filter(
            (file: any) =>
              file.type === 'file' &&
              /\.gguf$/i.test(file.path) &&
              !/(?:mmproj|imatrix)/i.test(file.path)
          )
          .map((file: any) => ({ path: file.path, size: file.size || 0 }));
      }
      const result = await queryModelScopeModelFiles(
        { name: modelId, revision: revision?.trim() || 'master' },
        { signal: controller.signal }
      );
      return (result?.Data?.Files || [])
        .filter(
          (file: any) =>
            file.Type === 'blob' &&
            /\.gguf$/i.test(file.Path) &&
            !/(?:mmproj|imatrix)/i.test(file.Path)
        )
        .map((file: any) => ({ path: file.Path, size: file.Size || 0 }));
    };
    void load()
      .then((items) => {
        if (!controller.signal.aborted) setFiles(items);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFiles([]);
          setError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [modelId, revision, source]);

  const options = useMemo(
    () =>
      groupGgufFiles(files).map((file) => ({
        value: file.pattern,
        label: `${file.quantization} · ${file.pattern} · ${convertFileSize(file.size, 1, true)}`
      })),
    [files]
  );

  return (
    <>
      <Select
        allowClear
        showSearch
        loading={loading}
        disabled={disabled || !modelId}
        value={value?.length === 1 ? value[0] : undefined}
        placeholder={intl.formatMessage({
          id: 'resources.preheat.gguf.select'
        })}
        options={options}
        onChange={(pattern) => onChange?.(pattern ? [pattern] : [])}
      />
      {!loading && modelId && !error && options.length === 0 && (
        <div style={{ marginTop: 6, color: 'var(--ant-color-text-secondary)' }}>
          {intl.formatMessage({ id: 'resources.preheat.gguf.empty' })}
        </div>
      )}
      {error && (
        <Alert
          type="error"
          showIcon
          style={{ marginTop: 8 }}
          message={intl.formatMessage({
            id: 'resources.preheat.gguf.loadFailed'
          })}
        />
      )}
    </>
  );
};

export default ModelGgufFileSelect;
