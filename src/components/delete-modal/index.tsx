import useBodyScroll from '@/hooks/use-body-scroll';
import { ExclamationCircleFilled } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Checkbox,
  Modal,
  Space,
  message,
  type ModalFuncProps
} from 'antd';
import { createStyles } from 'antd-style';
import { forwardRef, useImperativeHandle, useState } from 'react';
import styled from 'styled-components';

const useStyles = createStyles(({ css }) => ({
  'delete-modal-content': css`
    display: flex;
    font-size: var(--font-size-middle);
    .anticon {
      font-size: 20px;
      margin-right: 10px;
      color: var(--ant-color-warning);
    }
    .title {
      display: flex;
      align-items: center;
      font-weight: var(--font-weight-500);
    }
  `,
  content: css`
    padding-top: 15px;
    padding-left: 30px;
    color: var(--ant-color-text-secondary);
    white-space: pre-line;
    word-break: break-all;
    span {
      color: var(--ant-color-text);
      display: flex;
      margin-top: 8px;
    }
  `
}));

const CheckboxWrapper = styled.div`
  margin-top: 20px;
  margin-left: 30px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  .check-text {
    font-weight: 700;
    color: var(--ant-color-warning);
  }
`;

interface DataOptions {
  content?: string;
  selection?: boolean;
  name?: string;
  okText?: string;
  cancelText?: string;
  title?: string;
  getErrorMessage?: (error: unknown) => string;
  operation: string;
  checkConfig?: {
    checkText: string;
    defautlChecked: boolean;
  };
}

interface Configuration {
  checked: boolean;
}

interface DeleteModalProps {
  error?: string;
}

const DeleteModal = forwardRef<any, DeleteModalProps>(({ error }, ref) => {
  const intl = useIntl();
  const { styles } = useStyles();
  const { saveScrollHeight, restoreScrollHeight } = useBodyScroll();
  const [visible, setVisible] = useState(false);
  const [configuration, setConfiguration] = useState<Configuration>({
    checked: false
  });
  const [config, setConfig] = useState<ModalFuncProps & DataOptions>({} as any);
  const [submitError, setSubmitError] = useState<string>();

  const show = (data: ModalFuncProps & DataOptions) => {
    saveScrollHeight();
    setConfig(data);
    setSubmitError(undefined);
    setConfiguration({
      checked: data.checkConfig?.defautlChecked || false
    });
    setVisible(true);
  };

  const hide = () => {
    setVisible(false);
    restoreScrollHeight();
  };

  const handleCancel = () => {
    setVisible(false);
    config.onCancel?.();
    restoreScrollHeight();
  };

  const handleOk = async () => {
    let shouldClose = false;
    try {
      const res = await config.onOk?.();
      if (res === false) return;
      const isArray = Array.isArray(res);
      if (isArray) {
        const failed = res.filter((item: any) => item?.status === 'rejected');
        if (failed.length) {
          setSubmitError(
            config.getErrorMessage?.(failed) ||
              `${failed.length} ${intl.formatMessage({ id: 'common.message.failed' })}`
          );
          return;
        }
        message.success(intl.formatMessage({ id: 'common.message.success' }));
      } else {
        message.success(intl.formatMessage({ id: 'common.message.success' }));
      }
      shouldClose = true;
    } catch (error) {
      setSubmitError(
        config.getErrorMessage?.(error) ||
          (error instanceof Error ? error.message : String(error))
      );
      return;
    } finally {
      if (shouldClose) {
        setVisible(false);
        restoreScrollHeight();
      }
    }
  };

  useImperativeHandle(ref, () => ({
    show,
    hide,
    configuration
  }));

  return (
    <Modal
      style={{
        top: '20%'
      }}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      destroyOnClose={false}
      closeIcon={false}
      maskClosable={false}
      keyboard={false}
      width={460}
      styles={{
        footer: {
          marginTop: '20px'
        }
      }}
      footer={
        <Space size={20}>
          <Button onClick={handleCancel} size="middle">
            {config.cancelText
              ? intl.formatMessage({ id: config.cancelText })
              : intl.formatMessage({ id: 'common.button.cancel' })}
          </Button>
          <Button type="primary" onClick={handleOk} size="middle">
            {config.okText
              ? intl.formatMessage({ id: config.okText })
              : intl.formatMessage({ id: 'common.button.delete' })}
          </Button>
        </Space>
      }
    >
      <div className={styles['delete-modal-content']}>
        <span className="title">
          <ExclamationCircleFilled />
          <span>
            {config.title
              ? intl.formatMessage({ id: config.title })
              : intl.formatMessage({ id: 'common.title.delete.confirm' })}
          </span>
        </span>
      </div>
      <div
        className={styles['content']}
        dangerouslySetInnerHTML={{
          __html: config.content
            ? intl.formatMessage(
                {
                  id: config.operation || ''
                },
                {
                  type: intl.formatMessage({ id: config.content }),
                  name: config.name
                }
              )
            : ''
        }}
      ></div>
      {(error || submitError) && (
        <Alert type="error" showIcon message={error || submitError} />
      )}
      {config.checkConfig && (
        <CheckboxWrapper>
          <Checkbox
            checked={configuration.checked}
            onChange={(e) =>
              setConfiguration({
                checked: e.target.checked
              })
            }
          >
            <span className="check-text">
              {intl.formatMessage({ id: config.checkConfig?.checkText })}
            </span>
          </Checkbox>
        </CheckboxWrapper>
      )}
    </Modal>
  );
});

export default DeleteModal;
