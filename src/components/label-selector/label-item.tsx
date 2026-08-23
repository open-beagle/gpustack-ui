import SealInput from '@/components/seal-form/seal-input';
import SealSelect from '@/components/seal-form/seal-select';
import { MinusOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Button, Tooltip } from 'antd';
import _ from 'lodash';
import React, { useState } from 'react';
import './styles/label-item.less';
interface LabelItemProps {
  label: {
    key: string;
    value: string;
  };
  labelKey?: string;
  labelValue?: string;
  keyAddon?: React.ReactNode;
  valueAddon?: React.ReactNode;
  seperator?: string;
  onDelete?: () => void;
  labelList: { key: string; value: string }[];
  labelOptions?: Record<string, string[]>;
  onChange?: (params: { key: string; value: string }) => void;
  onPaste?: (e: any) => void;
  onBlur?: (e: any, type: string) => void;
}
const LabelItem: React.FC<LabelItemProps> = ({
  label,
  labelList,
  labelOptions,
  seperator,
  keyAddon,
  valueAddon,
  onChange,
  onDelete,
  onPaste,
  onBlur
}) => {
  const intl = useIntl();
  const [open, setOpen] = useState(false);

  const handleOnValueChange = (e: any) => {
    const value = e.target.value;
    onChange?.({
      key: label.key,
      value: value
    });
  };

  const handleOnKeyChange = (e: any) => {
    const key = e.target.value;
    onChange?.({
      key,
      value: label.value
    });
  };

  const handleKeySelect = (key?: string) => {
    const nextKey = key || '';
    const nextValues = labelOptions?.[nextKey] || [];
    onChange?.({
      key: nextKey,
      value: nextValues.includes(label.value) ? label.value : ''
    });
  };

  const handleValueSelect = (value?: string) => {
    onChange?.({
      key: label.key,
      value: value || ''
    });
  };

  const keyOptions = _.sortBy(
    _.uniq([..._.keys(labelOptions), ...(label.key ? [label.key] : [])])
  ).map((key: string) => ({
    label: key,
    value: key,
    disabled: key !== label.key && labelList.some((item) => item.key === key)
  }));
  const valueOptions = _.uniq([
    ...(labelOptions?.[label.key] || []),
    ...(label.value ? [label.value] : [])
  ])
    .sort()
    .map((value: string) => ({ label: value, value }));

  const handleKeyOnBlur = (e: any, type: string) => {
    const val = e.target.value;
    // has duplicate key
    const duplicates = _.filter(
      labelList,
      (item: Global.BaseListItem<string>) => val && val === item.key
    );
    if (duplicates.length > 1) {
      setOpen(true);
      onChange?.({
        key: '',
        value: label.value
      });
      setTimeout(() => {
        setOpen(false);
      }, 1000);
    } else {
      setOpen(false);
    }
    onBlur?.(e, type);
  };

  return (
    <div className="label-item">
      <div className="label-key">
        {keyAddon ??
          (labelOptions ? (
            <SealSelect
              allowClear
              showSearch
              optionFilterProp="label"
              label={intl.formatMessage({ id: 'common.input.key' })}
              value={label.key || undefined}
              options={keyOptions}
              onChange={handleKeySelect}
              onBlur={(e: any) => onBlur?.(e, 'key')}
            />
          ) : (
            <Tooltip
              open={open}
              title={intl.formatMessage({ id: 'resources.table.key.tips' })}
            >
              <SealInput.Input
                checkStatus="success"
                label={intl.formatMessage({ id: 'common.input.key' })}
                value={label.key}
                onChange={handleOnKeyChange}
                onBlur={(e: any) => handleKeyOnBlur(e, 'key')}
                onPaste={onPaste}
              ></SealInput.Input>
            </Tooltip>
          ))}
      </div>
      {seperator && <span className="seprator">{seperator}</span>}
      <div className="label-value">
        {valueAddon ??
          (labelOptions ? (
            <SealSelect
              allowClear
              showSearch
              optionFilterProp="label"
              disabled={!label.key}
              label={intl.formatMessage({ id: 'common.input.value' })}
              value={label.value || undefined}
              options={valueOptions}
              onChange={handleValueSelect}
              onBlur={(e: any) => onBlur?.(e, 'value')}
            />
          ) : (
            <SealInput.Input
              checkStatus={label.value ? 'success' : ''}
              label={intl.formatMessage({ id: 'common.input.value' })}
              value={label.value}
              onChange={handleOnValueChange}
              onBlur={(e: any) => onBlur?.(e, 'value')}
            ></SealInput.Input>
          ))}
      </div>
      <Button
        size="small"
        className="btn"
        type="default"
        shape="circle"
        onClick={onDelete}
      >
        <MinusOutlined />
      </Button>
    </div>
  );
};

export default React.memo(LabelItem);
