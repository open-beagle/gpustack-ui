import { modelsExpandKeysAtom } from '@/atoms/models';
import AutoTooltip from '@/components/auto-tooltip';
import DeleteModal from '@/components/delete-modal';
import DropdownButtons from '@/components/drop-down-buttons';
import { TooltipOverlayScroller } from '@/components/overlay-scroller';
import { FilterBar } from '@/components/page-tools';
import StatusTag from '@/components/status-tag';
import { PageAction } from '@/config';
import useAppUtils from '@/hooks/use-app-utils';
import useBodyScroll from '@/hooks/use-body-scroll';
import useTableFetch from '@/hooks/use-table-fetch';
import { createModel } from '@/pages/llmodels/apis';
import DeployModal from '@/pages/llmodels/components/deploy-modal';
import { backendOptionsMap, modelSourceMap } from '@/pages/llmodels/config';
import { identifyModelTask } from '@/pages/llmodels/config/audio-catalog';
import {
  modalConfig,
  modelFileActions,
  onLineSourceOptions
} from '@/pages/llmodels/config/button-actions';
import { SourceType } from '@/pages/llmodels/config/types';
import DownloadModal from '@/pages/llmodels/download';
import { convertFileSize } from '@/utils';
import {
  CheckCircleFilled,
  CloudUploadOutlined,
  CopyOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl, useLocation, useNavigate } from '@umijs/max';
import {
  Button,
  ConfigProvider,
  Empty,
  Modal,
  Select,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message
} from 'antd';
import dayjs from 'dayjs';
import { useAtom } from 'jotai';
import _ from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  checkCurrentbackend,
  useGenerateFormEditInitialValues,
  useGenerateModelFileOptions
} from '../../llmodels/hooks';
import {
  MODEL_FILES_API,
  deleteModelFile,
  downloadModelFile,
  queryModelFilesList,
  queryModelPreheatS3Profiles,
  queryModelStorageSyncTasks,
  queryWorkersList,
  retryDownloadModelFile
} from '../apis';
import {
  ModelfileState,
  ModelfileStateMap,
  ModelfileStateMapValue,
  WorkerStatusMap
} from '../config';
import { modelManagementSearchForTab } from '../config/model-policy';
import {
  MAX_SELECTED_MODEL_FILES,
  MODEL_FILE_WATCH_EVENTS,
  getModelFileDeletePreflight,
  getModelFileSyncActionState,
  getModelStorageRevisionPresentation,
  getModelStorageTransferPresentation,
  limitSelectedModelFileIds,
  mergeSelectedModelFileRecords,
  retryModelFileDeletePreflight
} from '../config/model-preheat';
import {
  ModelFile as ListItem,
  ModelPreheatS3Profile,
  ListItem as WorkerListItem
} from '../config/types';
import ModelStorage from './model-storage';
import ModelStorageSyncBatchModal from './model-storage-sync-batch-modal';
import ModelStorageSyncModal from './model-storage-sync-modal';
import ModelTaskPolicies from './model-task-policies';
import ModelTaskRecords from './model-task-records';
import WorkerFuzzySelect from './worker-fuzzy-select';

const { Paragraph } = Typography;

const filterPattern = /^(.*?)(?:-\d+-of-\d+)?(\.gguf)?$/;

const PathWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: 100%;
  &::after {
    content: '';
    display: block;
    width: 20px;
    height: 100%;
    position: absolute;
    top: 0;
    right: 0;
    z-index: 1;
  }
  .btn-wrapper {
    display: flex;
    opacity: 0;
    width: 0;
    align-items: center;
  }
  &:hover {
    .btn-wrapper {
      width: auto;
      opacity: 1;
    }
  }
`;

const ItemWrapper = styled.ul`
  max-width: 300px;
  margin: 0;
  padding-inline: 13px 0;
  word-break: break-word;
  li {
    line-height: 1.6;
  }
`;

const FilesTag = styled(Tag)`
  cursor: pointer;
  display: flex;
  align-items: center;
  margin-inline: 4px 0;
  height: 22px;
  border-radius: var(--border-radius-base);
`;

const TextWrapper = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
  height: 100%;
`;

const TypographyPara = styled(Paragraph)`
  background: transparent;
  color: inherit;
  margin-bottom: 0;
  font-size: 13px;
`;

const ModelManagementWrapper = styled.div`
  .ant-table-thead > tr > .ant-table-cell-fix-right {
    z-index: 3;
    background-color: var(--ant-color-bg-container, #fff) !important;
    background-image: linear-gradient(
      var(--ant-color-fill-tertiary),
      var(--ant-color-fill-tertiary)
    ) !important;
    background-clip: padding-box;
  }

  .ant-table-tbody > tr > .ant-table-cell-fix-right {
    z-index: 2;
    background-color: var(--ant-color-bg-container, #fff) !important;
    background-image: none !important;
    background-clip: padding-box;
  }

  .ant-table-tbody > tr:hover > .ant-table-cell-fix-right {
    background-color: var(--ant-color-bg-container, #fff) !important;
    background-image: linear-gradient(
      var(--ant-table-row-hover-bg, rgb(249 249 249)),
      var(--ant-table-row-hover-bg, rgb(249 249 249))
    ) !important;
  }

  .ant-table-cell-fix-right-first::after {
    box-shadow: inset -10px 0 8px -8px var(--ant-color-split);
  }
`;

const TooltipTitle: React.FC<{ path: string }> = ({ path }) => {
  const intl = useIntl();
  return (
    <TypographyPara
      style={{ margin: 0 }}
      copyable={{
        icon: [
          <CopyOutlined key="copy-icon" />,
          <CheckCircleFilled key="copied-icon" />
        ],
        text: path,
        tooltips: [
          intl.formatMessage({ id: 'common.button.copy' }),
          intl.formatMessage({ id: 'common.button.copied' })
        ]
      }}
    >
      {path}
    </TypographyPara>
  );
};

const getWorkerName = (
  id: number,
  workersList: Global.BaseOption<number>[]
) => {
  const worker = workersList.find((item) => item.value === id);
  return worker?.label || '';
};

const getModelInfo = (record: ListItem) => {
  const source = _.get(modelSourceMap, record.source, '');
  if (record.source === modelSourceMap.huggingface_value) {
    return {
      source: `${source}/${record.huggingface_repo_id}`,
      repo_id: record.huggingface_repo_id,
      title: `${record.huggingface_repo_id}/${record.huggingface_filename}`,
      filename: record.huggingface_filename || record.huggingface_repo_id
    };
  }
  if (record.source === modelSourceMap.modelscope_value) {
    return {
      source: `${source}/${record.model_scope_model_id}`,
      repo_id: record.model_scope_model_id,
      title: `${record.model_scope_model_id}/${record.model_scope_file_path}`,
      filename: record.model_scope_file_path || record.model_scope_model_id
    };
  }
  if (record.source === modelSourceMap.ollama_library_value) {
    return {
      source: `${source}/${record.ollama_library_model_name}`,
      repo_id: record.ollama_library_model_name,
      title: record.ollama_library_model_name,
      filename: record.ollama_library_model_name
    };
  }
  return {
    source: `${source}${record.local_path}`,
    repo_id: record.local_path,
    title: record.local_path,
    filename: _.split(record.local_path, /[\\/]/).pop()
  };
};

const getResolvedPath = (pathList: string[]) => {
  return _.split(pathList?.[0], /[\\/]/).pop();
};

const InstanceStatusTag = (props: { data: ListItem }) => {
  const { data } = props;
  if (!data.state) {
    return null;
  }
  return (
    <StatusTag
      download={
        data.state === ModelfileStateMap.Downloading
          ? { percent: data.download_progress }
          : undefined
      }
      statusValue={{
        status:
          data.state === ModelfileStateMap.Downloading &&
          data.download_progress === 100
            ? ModelfileState[ModelfileStateMap.Ready]
            : ModelfileState[data.state],
        text: ModelfileStateMapValue[data.state],
        message:
          data.state === ModelfileStateMap.Downloading &&
          data.download_progress === 100
            ? ''
            : data.state_message
      }}
    />
  );
};

const RenderParts = (props: { record: ListItem }) => {
  const { record } = props;
  const intl = useIntl();
  const parts = record.resolved_paths || [];
  if (parts.length <= 1) {
    return null;
  }

  const renderItem = () => {
    return (
      <ItemWrapper>
        {parts.map((item: string, index: number) => {
          return <li key={index}>{_.split(item, /[\\/]/).pop()}</li>;
        })}
      </ItemWrapper>
    );
  };

  return (
    <TooltipOverlayScroller title={renderItem()}>
      <FilesTag color="purple" icon={<InfoCircleOutlined />}>
        <span style={{ opacity: 1 }}>
          {record.resolved_paths?.length}{' '}
          {intl.formatMessage({ id: 'models.form.files' })}
        </span>
      </FilesTag>
    </TooltipOverlayScroller>
  );
};

const ResolvedPathColumn = (props: { record: ListItem }) => {
  const { record } = props;
  const intl = useIntl();
  if (
    !record.resolved_paths.length &&
    record.state === ModelfileStateMap.Downloading
  ) {
    return (
      <span>
        {intl.formatMessage({
          id: 'resources.modelfiles.storagePath.holder'
        })}
      </span>
    );
  }
  return (
    record.resolved_paths?.length > 0 && (
      <PathWrapper>
        <TextWrapper>
          <AutoTooltip
            ghost
            showTitle
            title={
              <TooltipTitle path={record.resolved_paths?.[0]}></TooltipTitle>
            }
          >
            <span>{getResolvedPath(record.resolved_paths)}</span>
          </AutoTooltip>
        </TextWrapper>
        <RenderParts record={record}></RenderParts>
      </PathWrapper>
    )
  );
};

const LocalModelFiles = () => {
  const { getGPUList } = useGenerateFormEditInitialValues();
  const { saveScrollHeight, restoreScrollHeight } = useBodyScroll();
  const [modelsExpandKeys, setModelsExpandKeys] = useAtom(modelsExpandKeysAtom);
  const navigate = useNavigate();
  const {
    dataSource,
    rowSelection,
    queryParams,
    modalRef,
    fetchData,
    handleDelete,
    handleDeleteBatch,
    handlePageChange,
    handleTableChange,
    handleSearch,
    handleNameChange,
    handleQueryChange
  } = useTableFetch<ListItem>({
    fetchAPI: queryModelFilesList,
    deleteAPI: deleteModelFile,
    API: MODEL_FILES_API,
    watch: true,
    events: MODEL_FILE_WATCH_EVENTS,
    contentForDelete: 'resources.modelfiles.modelfile'
  });
  const { getModelFileList, generateModelFileOptions } =
    useGenerateModelFileOptions();
  const intl = useIntl();
  const { showSuccess } = useAppUtils();
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [downloadModalStatus, setDownlaodMoalStatus] = useState<{
    show: boolean;
    width: number | string;
    source: string;
    hasLinuxWorker: boolean;
    gpuOptions: any[];
  }>({
    show: false,
    width: 600,
    hasLinuxWorker: false,
    source: modelSourceMap.huggingface_value,
    gpuOptions: []
  });
  const [openDeployModal, setOpenDeployModal] = useState<{
    show: boolean;
    width: number | string;
    source: SourceType;
    gpuOptions: any[];
    modelFileOptions?: any[];
    initialValues: any;
    isGGUF?: boolean;
  }>({
    show: false,
    width: 600,
    source: modelSourceMap.local_path_value as SourceType,
    gpuOptions: [],
    modelFileOptions: [],
    initialValues: {},
    isGGUF: false
  });
  const [syncRecord, setSyncRecord] = useState<ListItem | null>(null);
  const [syncBatchOpen, setSyncBatchOpen] = useState(false);
  const [blockedDeleteRecord, setBlockedDeleteRecord] =
    useState<ListItem | null>(null);
  const [deletePreflightError, setDeletePreflightError] = useState('');
  const [deletePreflightFailure, setDeletePreflightFailure] = useState<{
    retry: () => void;
  } | null>(null);
  const [profiles, setProfiles] = useState<ModelPreheatS3Profile[]>([]);
  const defaultSyncProfileId = useMemo(
    () => profiles.find((profile) => profile.is_default)?.id,
    [profiles]
  );
  const syncRowSelection = {
    ...rowSelection,
    preserveSelectedRowKeys: true,
    getCheckboxProps: (record: ListItem) => {
      const action = getModelFileSyncActionState(record, defaultSyncProfileId);
      const selectionLimitReached =
        rowSelection.selectedRowKeys.length >= MAX_SELECTED_MODEL_FILES &&
        !rowSelection.selectedRowKeys.includes(record.id);
      return {
        disabled: !action.visible || action.disabled || selectionLimitReached
      };
    },
    onChange: (keys: React.Key[], rows: ListItem[]) => {
      const limited = limitSelectedModelFileIds(keys);
      if (limited.exceeded) {
        message.warning(
          intl.formatMessage({
            id: 'resources.storage.syncBatch.selectionLimit'
          })
        );
      }
      rowSelection.onChange(
        limited.ids,
        mergeSelectedModelFileRecords(
          limited.ids,
          rowSelection.selectedRows as ListItem[],
          rows
        )
      );
    }
  };

  useEffect(() => {
    const invalidCurrentIds = dataSource.dataList
      .filter(
        (item) =>
          rowSelection.selectedRowKeys.includes(item.id) &&
          getModelFileSyncActionState(item, defaultSyncProfileId).disabled
      )
      .map((item) => item.id);
    if (invalidCurrentIds.length)
      rowSelection.removeSelectedKeys(invalidCurrentIds);
  }, [dataSource.dataList, defaultSyncProfileId]);

  useEffect(() => {
    void queryWorkersList({ page: 1, perPage: 100 })
      .then((result) =>
        setWorkersList(
          result.items.map((item: WorkerListItem) => ({
            ...item,
            value: item.id,
            label: item.name
          }))
        )
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void queryModelPreheatS3Profiles({ page: 1, perPage: 100 })
      .then((result) => {
        setProfiles(
          result.items.filter((profile) => profile.lifecycle_state === 'active')
        );
      })
      .catch(() => undefined);
  }, []);

  const extractFileName = (name: string) => {
    return name.replace(filterPattern, '$1');
  };

  const handleWorkerChange = (value: number | undefined) => {
    handleQueryChange({
      page: 1,
      worker_id: value
    });
  };
  const generateInitialValues = (record: ListItem, gpuOptions: any[]) => {
    const isGGUF = _.includes(record.resolved_paths?.[0], 'gguf');
    const isOllama = !!record.ollama_library_model_name;
    const audioModelTag = identifyModelTask(
      record.source,
      record.resolved_paths?.[0]
    );

    let name = _.toLower(
      _.split(
        record.huggingface_repo_id ||
          record.ollama_library_model_name ||
          record.model_scope_model_id ||
          record.local_path,
        /[\\/]/
      ).pop()
    );

    const targetWorker = _.find(workersList, { value: record.worker_id })
      ?.labels?.['worker-name'];

    return {
      source: modelSourceMap.local_path_value,
      local_path: record.resolved_paths?.[0],
      worker_selector: targetWorker
        ? {
            'worker-name': targetWorker
          }
        : {},
      name: extractFileName(name),
      backend: checkCurrentbackend({
        isGGUF: !audioModelTag && (isGGUF || isOllama),
        isAudio: !!audioModelTag,
        gpuOptions: gpuOptions,
        defaultBackend: backendOptionsMap.vllm
      }),
      isGGUF: !audioModelTag && (isGGUF || isOllama)
    };
  };

  const hasActiveSyncTasks = async (modelFileIds: number[]) => {
    const result = await getModelFileDeletePreflight(
      modelFileIds,
      queryModelStorageSyncTasks
    );
    if (result === 'error') {
      setDeletePreflightError(
        intl.formatMessage({ id: 'resources.storage.state.error' })
      );
      return undefined;
    }
    return result === 'active';
  };

  const requestDelete = async (record: ListItem) => {
    setDeletePreflightError('');
    const active = await hasActiveSyncTasks([record.id]);
    if (active === undefined) {
      setDeletePreflightFailure({ retry: () => void requestDelete(record) });
      return;
    }
    if (active) {
      setBlockedDeleteRecord(record);
      return;
    }
    handleDelete(
      { ...record, name: record.resolved_paths?.[0] },
      {
        getErrorMessage: (error: any) =>
          (error?.response?.data?.message || error?.message) ===
          'model_file_has_active_sync_task'
            ? intl.formatMessage(
                {
                  id: 'resources.storage.deleteModelBlockedContent'
                },
                { name: record.resolved_paths?.[0] || '' }
              )
            : intl.formatMessage({ id: 'resources.storage.state.error' }),
        beforeDelete: async () => {
          setDeletePreflightError('');
          const activeNow = await hasActiveSyncTasks([record.id]);
          if (activeNow === undefined) return false;
          if (activeNow) setBlockedDeleteRecord(record);
          return !activeNow;
        },
        checkConfig: {
          checkText: 'resources.modelfiles.delete.tips',
          defautlChecked: record.source !== modelSourceMap.local_path_value
        }
      }
    );
  };

  const handleSelect = async (val: any, record: ListItem) => {
    try {
      if (val === 'delete') {
        await requestDelete(record);
      } else if (val === 'retry') {
        await retryDownloadModelFile(record.id);
        showSuccess();
      } else if (val === 'deploy') {
        saveScrollHeight();
        const [modelFileList, gpuList] = await Promise.all([
          getModelFileList(),
          getGPUList()
        ]);
        const dataList = generateModelFileOptions(modelFileList, workersList);
        const initialValues = generateInitialValues(record, gpuList);
        setOpenDeployModal({
          ...openDeployModal,
          modelFileOptions: dataList,
          gpuOptions: gpuList,
          initialValues: initialValues,
          isGGUF: initialValues.isGGUF,
          show: true
        });
      }
    } catch {
      setDeletePreflightError(
        intl.formatMessage({ id: 'resources.storage.state.error' })
      );
    }
  };

  const openSync = async (record: ListItem) => {
    const result = await queryModelPreheatS3Profiles({ page: 1, perPage: 100 });
    setProfiles(
      result.items.filter((profile) => profile.lifecycle_state === 'active')
    );
    setSyncRecord(record);
  };

  const renderEmpty = (type?: string) => {
    if (type !== 'Table') return;
    if (
      !dataSource.loading &&
      dataSource.loadend &&
      !dataSource.dataList.length
    ) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}></Empty>;
    }
    return <div></div>;
  };

  const handleClickDropdown = useCallback(
    (item: any) => {
      const config = modalConfig[item.key];
      const hasLinuxWorker = workersList.some(
        (worker) => _.toLower(worker.labels?.os) === 'linux'
      );
      if (config) {
        setDownlaodMoalStatus({ ...config, hasLinuxWorker, gpuOptions: [] });
      }
    },
    [workersList]
  );

  const handleDownloadCancel = () => {
    setDownlaodMoalStatus({
      ...downloadModalStatus,
      show: false
    });
  };

  const handleDownload = async (data: any) => {
    try {
      await downloadModelFile(data);
      setDownlaodMoalStatus({
        ...downloadModalStatus,
        show: false
      });
      fetchData();
      showSuccess();
    } catch (error) {
      // console.log('error', error);
    }
  };

  const setActionList = (record: ListItem) => {
    const actions = _.filter(modelFileActions, (item: { key: string }) => {
      if (record.state === ModelfileStateMap.Ready) {
        return ['deploy', 'delete'].includes(item.key);
      }
      return ['retry', 'delete'].includes(item.key);
    });
    return actions.map((item) =>
      item.key === 'deploy' && record.worker_available === false
        ? { ...item, disabled: true }
        : item
    );
  };

  const handleDeployModalCancel = () => {
    setOpenDeployModal({
      ...openDeployModal,
      show: false
    });
    restoreScrollHeight();
  };

  const handleDeleteByBatch = async () => {
    const selectedIds = rowSelection.selectedRowKeys as number[];
    setDeletePreflightError('');
    const active = await hasActiveSyncTasks(selectedIds);
    if (active === undefined) {
      setDeletePreflightFailure({ retry: () => void handleDeleteByBatch() });
      return;
    }
    if (active) {
      setBlockedDeleteRecord({
        resolved_paths: [
          intl.formatMessage(
            { id: 'resources.storage.deleteModelBlockedBatchName' },
            { count: selectedIds.length }
          )
        ]
      } as ListItem);
      return;
    }
    handleDeleteBatch({
      getErrorMessage: (error: any) => {
        const rejected = Array.isArray(error) ? error : [error];
        const firstError = rejected[0]?.reason || rejected[0];
        return (firstError?.response?.data?.message || firstError?.message) ===
          'model_file_has_active_sync_task'
          ? intl.formatMessage(
              {
                id: 'resources.storage.deleteModelBlockedContent'
              },
              {
                name: intl.formatMessage(
                  { id: 'resources.storage.deleteModelBlockedBatchName' },
                  { count: selectedIds.length }
                )
              }
            )
          : intl.formatMessage({ id: 'resources.storage.state.error' });
      },
      beforeDelete: async () => {
        setDeletePreflightError('');
        const activeNow = await hasActiveSyncTasks(selectedIds);
        if (activeNow === undefined) return false;
        if (activeNow) {
          setBlockedDeleteRecord({
            resolved_paths: [
              intl.formatMessage(
                { id: 'resources.storage.deleteModelBlockedBatchName' },
                { count: selectedIds.length }
              )
            ]
          } as ListItem);
        }
        return !activeNow;
      },
      checkConfig: {
        checkText: 'resources.modelfiles.delete.tips',
        defautlChecked: false
      }
    });
  };

  const handleCreateModel = async (data: any) => {
    try {
      const modelData = await createModel({
        data
      });
      setOpenDeployModal({
        ...openDeployModal,
        show: false
      });
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      setModelsExpandKeys([modelData.id]);
      navigate('/models/deployments');
    } catch (error) {
      // console.log('error', error);
    }
  };

  const columns: any[] = [
    {
      title: intl.formatMessage({ id: 'models.form.source' }),
      dataIndex: 'source',
      ellipsis: {
        showTitle: false
      },
      render: (text: string, record: ListItem) => {
        const { source } = getModelInfo(record);
        const transfer = getModelStorageTransferPresentation(
          record.transfer_source || null
        );
        const transferText = record.transfer_source
          ? intl.formatMessage(
              { id: transfer.messageId },
              {
                worker: transfer.includeWorker
                  ? record.source_worker_name ||
                    `Worker #${record.source_worker_id || '-'}`
                  : '',
                profile: transfer.includeProfile
                  ? record.transfer_profile_name ||
                    `Profile #${record.transfer_profile_id || '-'}`
                  : ''
              }
            )
          : null;
        return (
          <TextWrapper style={{ paddingRight: 8 }}>
            <AutoTooltip
              ghost
              showTitle={Boolean(transferText)}
              title={
                transferText ? (
                  <div>
                    <div>{source}</div>
                    <div>{transferText}</div>
                  </div>
                ) : (
                  source
                )
              }
            >
              {source}
            </AutoTooltip>
          </TextWrapper>
        );
      }
    },
    {
      title: 'Worker',
      dataIndex: 'worker_name',
      ellipsis: {
        showTitle: false
      },
      render: (text: string, record: ListItem) => {
        const workerName =
          record.worker_name ||
          record.worker_name_snapshot ||
          (record.worker_available === false
            ? intl.formatMessage(
                { id: 'resources.storage.deletedWorker' },
                { id: record.worker_id }
              )
            : getWorkerName(record.worker_id, workersList));
        return (
          <AutoTooltip ghost>
            <span>{workerName}</span>
          </AutoTooltip>
        );
      }
    },
    {
      title: intl.formatMessage({ id: 'common.table.status' }),
      dataIndex: 'state',
      width: 132,
      render: (text: string, record: ListItem) => {
        return <InstanceStatusTag data={record} />;
      }
    },
    {
      title: intl.formatMessage({ id: 'resources.storage.version' }),
      dataIndex: 'resolved_revision',
      width: 130,
      render: (revision: string | null | undefined) => {
        if (!revision) return '-';
        const presentation = getModelStorageRevisionPresentation(revision);
        return (
          <Tooltip title={presentation.full}>
            <span>{presentation.short}</span>
          </Tooltip>
        );
      }
    },
    {
      title: intl.formatMessage({ id: 'resources.modelfiles.form.path' }),
      dataIndex: 'resolved_paths',
      width: '30%',
      ellipsis: {
        showTitle: false
      },
      render: (text: string, record: ListItem) => (
        <ResolvedPathColumn record={record} />
      )
    },
    {
      title: intl.formatMessage({ id: 'resources.modelfiles.size' }),
      dataIndex: 'size',
      width: 110,
      align: 'right',
      ellipsis: {
        showTitle: false
      },
      render: (text: string, record: ListItem) => {
        return (
          <AutoTooltip ghost>
            <span>{convertFileSize(record.size, 1, true)}</span>
          </AutoTooltip>
        );
      }
    },
    {
      title: intl.formatMessage({ id: 'common.table.createTime' }),
      dataIndex: 'created_at',
      sorter: false,
      width: 180,
      ellipsis: {
        showTitle: false
      },
      render: (text: number) => (
        <AutoTooltip ghost minWidth={20}>
          {dayjs(text).format('YYYY-MM-DD HH:mm:ss')}
        </AutoTooltip>
      )
    },
    {
      title: intl.formatMessage({ id: 'common.table.operation' }),
      dataIndex: 'operation',
      width: 180,
      render: (text: string, record: ListItem) => {
        const syncAction = getModelFileSyncActionState(
          record,
          defaultSyncProfileId
        );
        const syncTooltip =
          syncAction.reason === 'unsupported'
            ? intl.formatMessage({
                id: 'resources.storage.sync.unsupportedSource'
              })
            : syncAction.reason === 'model_not_ready'
              ? intl.formatMessage({
                  id: 'resources.storage.sync.modelNotReady'
                })
              : syncAction.reason === 'worker_unavailable'
                ? intl.formatMessage({
                    id: 'resources.storage.workerUnavailable'
                  })
                : syncAction.reason === 'no_default_profile'
                  ? intl.formatMessage({
                      id: 'resources.storage.sync.noDefault'
                    })
                  : syncAction.reason === 'already_from_default'
                    ? intl.formatMessage({
                        id: 'resources.storage.sync.alreadyFromDefault'
                      })
                    : intl.formatMessage({ id: 'resources.storage.sync' });
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              whiteSpace: 'nowrap'
            }}
          >
            {syncAction.visible && (
              <Tooltip title={syncTooltip}>
                <Button
                  type="text"
                  icon={<CloudUploadOutlined />}
                  aria-label={intl.formatMessage({
                    id: 'resources.storage.sync'
                  })}
                  disabled={syncAction.disabled}
                  onClick={() => void openSync(record)}
                />
              </Tooltip>
            )}
            <DropdownButtons
              items={setActionList(record)}
              onSelect={(val) => handleSelect(val, record)}
            ></DropdownButtons>
          </div>
        );
      }
    }
  ];

  const readyWorkers = useMemo(() => {
    return workersList.filter((item) => item.state === WorkerStatusMap.ready);
  }, [workersList]);

  return (
    <>
      <FilterBar
        marginBottom={22}
        marginTop={20}
        actionType="dropdown"
        selectHolder="resources.filter.worker"
        inputHolder="resources.filter.path"
        buttonText={intl.formatMessage({
          id: 'resources.modelfiles.download'
        })}
        handleSelectChange={handleWorkerChange}
        handleDeleteByBatch={() => void handleDeleteByBatch()}
        handleClickPrimary={handleClickDropdown}
        handleSearch={handleSearch}
        selectOptions={[]}
        extraFilters={
          <>
            <WorkerFuzzySelect
              value={queryParams.worker_id as number | undefined}
              onChange={handleWorkerChange}
            />
            <Select
              allowClear
              placeholder={intl.formatMessage({
                id: 'resources.filter.source'
              })}
              style={{ width: 150 }}
              value={queryParams.source}
              onChange={(value) =>
                handleQueryChange({ page: 1, source: value || undefined })
              }
              options={[
                { value: 'model_scope', label: 'ModelScope' },
                { value: 'huggingface', label: 'Hugging Face' },
                { value: 'ollama_library', label: 'Ollama Library' },
                { value: 'local_path', label: 'Local Path' }
              ]}
            />
            <Select
              allowClear
              placeholder={intl.formatMessage({ id: 'common.table.status' })}
              style={{ width: 130 }}
              value={queryParams.state}
              onChange={(value) =>
                handleQueryChange({ page: 1, state: value || undefined })
              }
              options={[
                { value: 'ready', label: 'Ready' },
                { value: 'downloading', label: 'Downloading' },
                { value: 'error', label: 'Error' }
              ]}
            />
            <Typography.Text>
              {intl.formatMessage(
                { id: 'resources.storage.syncBatch.selectedModelCount' },
                { count: rowSelection.selectedRowKeys.length }
              )}
            </Typography.Text>
            <Button
              icon={<CloudUploadOutlined />}
              disabled={!rowSelection.selectedRowKeys.length}
              onClick={() => setSyncBatchOpen(true)}
            >
              {intl.formatMessage({
                id: 'resources.storage.syncBatch.syncSelected'
              })}
            </Button>
          </>
        }
        handleInputChange={handleNameChange}
        rowSelection={syncRowSelection}
        actionItems={onLineSourceOptions}
        showSelect={false}
      ></FilterBar>
      <ConfigProvider renderEmpty={renderEmpty}>
        <Table
          rowKey="id"
          tableLayout="fixed"
          style={{ width: '100%' }}
          onChange={handleTableChange}
          dataSource={dataSource.dataList}
          loading={dataSource.loading}
          rowSelection={syncRowSelection}
          columns={columns}
          pagination={{
            showSizeChanger: true,
            pageSize: queryParams.perPage,
            current: queryParams.page,
            total: dataSource.total,
            hideOnSinglePage: queryParams.perPage === 10,
            showTotal: (value) =>
              intl.formatMessage(
                { id: 'resources.storage.pagination.total' },
                { total: value }
              ),
            onChange: handlePageChange
          }}
        ></Table>
      </ConfigProvider>
      <DeleteModal ref={modalRef} error={deletePreflightError}></DeleteModal>
      <Modal
        open={Boolean(deletePreflightFailure)}
        centered
        maskClosable={false}
        title={intl.formatMessage({
          id: 'resources.storage.deleteModelBlocked'
        })}
        onCancel={() => setDeletePreflightFailure(null)}
        footer={
          <>
            <Button onClick={() => setDeletePreflightFailure(null)}>
              {intl.formatMessage({ id: 'common.button.cancel' })}
            </Button>
            <Button
              type="primary"
              onClick={() =>
                retryModelFileDeletePreflight(
                  deletePreflightFailure?.retry,
                  () => {
                    setDeletePreflightFailure(null);
                    setDeletePreflightError('');
                  }
                )
              }
            >
              {intl.formatMessage({ id: 'resources.storage.retry' })}
            </Button>
          </>
        }
      >
        {deletePreflightError}
      </Modal>
      <Modal
        open={Boolean(blockedDeleteRecord)}
        centered
        width={460}
        maskClosable={false}
        keyboard={false}
        title={intl.formatMessage({
          id: 'resources.storage.deleteModelBlocked'
        })}
        onCancel={() => setBlockedDeleteRecord(null)}
        footer={
          <Button type="primary" onClick={() => setBlockedDeleteRecord(null)}>
            {intl.formatMessage({ id: 'common.button.close' })}
          </Button>
        }
      >
        {intl.formatMessage(
          { id: 'resources.storage.deleteModelBlockedContent' },
          { name: blockedDeleteRecord?.resolved_paths?.[0] || '' }
        )}
      </Modal>
      <DownloadModal
        onCancel={handleDownloadCancel}
        onOk={handleDownload}
        title={intl.formatMessage({ id: 'resources.modelfiles.download' })}
        open={downloadModalStatus.show}
        source={downloadModalStatus.source}
        width={downloadModalStatus.width}
        hasLinuxWorker={downloadModalStatus.hasLinuxWorker}
        workersList={readyWorkers}
      ></DownloadModal>
      <DeployModal
        deploymentType="modelFiles"
        title={intl.formatMessage({ id: 'models.button.deploy' })}
        onCancel={handleDeployModalCancel}
        onOk={handleCreateModel}
        open={openDeployModal.show}
        action={PageAction.CREATE}
        source={openDeployModal.source}
        width={openDeployModal.width}
        gpuOptions={openDeployModal.gpuOptions}
        modelFileOptions={openDeployModal.modelFileOptions || []}
        initialValues={openDeployModal.initialValues}
        isGGUF={openDeployModal.isGGUF}
      ></DeployModal>
      <ModelStorageSyncModal
        open={Boolean(syncRecord)}
        model={syncRecord}
        profiles={profiles}
        onCancel={() => setSyncRecord(null)}
        onCreated={() => {
          setSyncRecord(null);
          navigate('/resources/modelfiles?tab=tasks&task_tab=sync');
        }}
      />
      <ModelStorageSyncBatchModal
        open={syncBatchOpen}
        initialScope="selected_models"
        initialModelFileIds={(rowSelection.selectedRowKeys as number[]).map(
          Number
        )}
        onCancel={() => setSyncBatchOpen(false)}
        onTasksChanged={() => void fetchData()}
      />
    </>
  );
};

const ModelFiles = () => {
  const intl = useIntl();
  const location = useLocation();
  const navigate = useNavigate();
  const requestedTab = new URLSearchParams(location.search).get('tab');
  const tabKeys = ['local', 'storage', 'tasks', 'policies'];
  const activeTab = tabKeys.includes(requestedTab || '')
    ? requestedTab || 'local'
    : 'local';

  const handleTabChange = (key: string) => {
    navigate(
      `${location.pathname}${modelManagementSearchForTab(location.search, key)}`,
      { replace: true }
    );
  };

  return (
    <ModelManagementWrapper>
      <PageContainer
        ghost
        header={{
          title: (
            <span>
              {intl.formatMessage({ id: 'menu.resources.modelfiles' })}{' '}
              <Tooltip
                title={intl.formatMessage({
                  id: 'resources.storage.description'
                })}
              >
                <QuestionCircleOutlined
                  aria-label={intl.formatMessage({
                    id: 'resources.storage.description'
                  })}
                  style={{ color: 'var(--ant-color-text-tertiary)' }}
                />
              </Tooltip>
            </span>
          ),
          style: {
            paddingInline: 'var(--layout-content-header-inlinepadding)'
          },
          breadcrumb: {}
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            {
              key: 'local',
              label: intl.formatMessage({ id: 'resources.storage.nodeModels' }),
              children: <LocalModelFiles />
            },
            {
              key: 'storage',
              label: intl.formatMessage({ id: 'resources.storage.library' }),
              children: <ModelStorage />
            },
            {
              key: 'tasks',
              label: intl.formatMessage({
                id: 'resources.storage.taskRecords'
              }),
              children: <ModelTaskRecords />
            },
            {
              key: 'policies',
              label: intl.formatMessage({ id: 'resources.storage.policies' }),
              children: <ModelTaskPolicies />
            }
          ]}
        />
      </PageContainer>
    </ModelManagementWrapper>
  );
};

export default ModelFiles;
