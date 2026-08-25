import { useIntl } from '@umijs/max';
import { Alert, Space, Typography, type AlertProps } from 'antd';
import React from 'react';
import { getModelStorageErrorPresentation } from '../config/model-preheat';

interface DetailsProps {
  errorCode: string;
  showTitle?: boolean;
}

export const ModelStorageErrorDetails: React.FC<DetailsProps> = ({
  errorCode,
  showTitle = true
}) => {
  const intl = useIntl();
  const presentation = getModelStorageErrorPresentation(errorCode);

  return (
    <Space direction="vertical" size={0}>
      {showTitle && (
        <Typography.Text>
          {intl.formatMessage({ id: presentation.messageId })}
        </Typography.Text>
      )}
      <Typography.Text type="secondary">
        {intl.formatMessage({ id: presentation.actionHintId })}
      </Typography.Text>
      <Typography.Text code copyable={{ text: presentation.value }}>
        {presentation.value}
      </Typography.Text>
    </Space>
  );
};

interface AlertErrorProps extends Omit<AlertProps, 'description' | 'message'> {
  errorCode: string;
}

export const ModelStorageErrorAlert: React.FC<AlertErrorProps> = ({
  errorCode,
  ...props
}) => {
  const intl = useIntl();
  const presentation = getModelStorageErrorPresentation(errorCode);

  return (
    <Alert
      {...props}
      message={intl.formatMessage({ id: presentation.messageId })}
      description={
        <ModelStorageErrorDetails errorCode={errorCode} showTitle={false} />
      }
    />
  );
};
