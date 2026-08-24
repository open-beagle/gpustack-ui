import { useIntl } from '@umijs/max';
import { Collapse, Col, Form, Input, Row, Select, Space, Typography } from 'antd';
import React, { useMemo } from 'react';
import {
  getNextScheduleTimes,
  getScheduleSummary,
  getScheduleTriggerMode,
  getScheduleTimezones,
  isSupportedTimezone,
  type ScheduleDraft
} from './model-storage-schedule';

export type { ScheduleDraft } from './model-storage-schedule';
export { buildScheduleCron, getBrowserTimezone, getSchedulePayload, getScheduleTriggerMode, parseScheduleCron } from './model-storage-schedule';

const ScheduleEditor: React.FC<{ disabled?: boolean; allowContinuous?: boolean }> = ({ disabled, allowContinuous = false }) => {
  const intl = useIntl();
  const form = Form.useFormInstance<ScheduleDraft>();
  const draft = Form.useWatch([], form) || {};
  const timezones = useMemo(() => getScheduleTimezones(), []);
  const preset = draft.schedule_preset || (draft.trigger_mode === 'manual' ? 'manual' : 'daily');
  const advanced = preset === 'custom';
  const scheduled = !['manual', 'continuous'].includes(preset);
  const timezone = isSupportedTimezone(draft.timezone) ? draft.timezone : 'UTC';
  const nextRuns = useMemo(
    () => getNextScheduleTimes(draft),
    [draft.cron_expression, draft.schedule_preset, draft.schedule_time, draft.schedule_weekday, draft.timezone, draft.trigger_mode]
  );
  const summary = getScheduleSummary(draft);
  const summaryText = summary === 'daily'
    ? intl.formatMessage({ id: 'resources.preheat.schedule.summary.daily' }, { time: draft.schedule_time || '00:00' })
    : summary === 'weekly'
      ? intl.formatMessage({ id: 'resources.preheat.schedule.summary.weekly' }, { weekday: intl.formatMessage({ id: `resources.preheat.schedule.weekday.${draft.schedule_weekday || '1'}` }), time: draft.schedule_time || '00:00' })
      : ['manual', 'continuous', 'hourly'].includes(summary)
        ? intl.formatMessage({ id: `resources.preheat.schedule.summary.${summary}` })
        : intl.formatMessage({ id: 'resources.preheat.schedule.summary.custom' }, { cron: summary });

  return <>
    <Row gutter={16}>
      <Col xs={24} md={8}>
        <Form.Item name="schedule_preset" label={intl.formatMessage({ id: 'resources.preheat.schedule.triggerMode' })} rules={[{ required: true }]}>
          <Select disabled={disabled} onChange={(schedule_preset) => {
            const trigger_mode = getScheduleTriggerMode({ ...draft, schedule_preset });
            form.setFieldsValue({
              schedule_preset,
              trigger_mode,
              ...(trigger_mode === 'scheduled' ? {} : { cron_expression: null })
            });
          }} options={[
            { value: 'manual', label: intl.formatMessage({ id: 'resources.preheat.schedule.preset.manual' }) }, { value: 'hourly', label: intl.formatMessage({ id: 'resources.preheat.schedule.preset.hourly' }) },
            { value: 'daily', label: intl.formatMessage({ id: 'resources.preheat.schedule.preset.daily' }) }, { value: 'weekly', label: intl.formatMessage({ id: 'resources.preheat.schedule.preset.weekly' }) },
            { value: 'custom', label: intl.formatMessage({ id: 'resources.preheat.schedule.preset.custom' }) },
            ...(allowContinuous ? [{ value: 'continuous', label: intl.formatMessage({ id: 'resources.preheat.schedule.preset.continuous' }) }] : [])
          ]} />
        </Form.Item>
      </Col>
      {scheduled && <Col xs={24} md={8}>
        <Form.Item name="timezone" label={intl.formatMessage({ id: 'resources.preheat.schedule.timezone' })} rules={[{ required: true }]}>
          <Select showSearch optionFilterProp="label" disabled={disabled} options={timezones.map((timezone) => ({ value: timezone, label: timezone }))} />
        </Form.Item>
      </Col>}
      {scheduled && !advanced && <Col xs={24} md={8}>
        <Form.Item name="schedule_time" label={intl.formatMessage({ id: 'resources.preheat.schedule.time' })} rules={[{ required: true }]}>
          <Input type="time" disabled={disabled} />
        </Form.Item>
      </Col>}
      {preset === 'weekly' && <Col xs={24} md={8}>
        <Form.Item name="schedule_weekday" label={intl.formatMessage({ id: 'resources.preheat.schedule.weekday' })} rules={[{ required: true }]}>
          <Select disabled={disabled} options={['0', '1', '2', '3', '4', '5', '6'].map((value) => ({ value, label: intl.formatMessage({ id: `resources.preheat.schedule.weekday.${value}` }) }))} />
        </Form.Item>
      </Col>}
    </Row>
    {scheduled && <Space direction="vertical" size={4} style={{ marginBottom: 16 }}>
      <Typography.Text type="secondary">{intl.formatMessage({ id: 'resources.preheat.schedule.summary.label' })}: {summaryText}</Typography.Text>
      <Typography.Text type="secondary" aria-label="schedule-next-runs">
        {intl.formatMessage({ id: 'resources.preheat.schedule.nextRuns' })}: {nextRuns.length
          ? nextRuns.map((run) => new Intl.DateTimeFormat(undefined, { timeZone: timezone, dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23' }).format(run)).join(', ')
          : intl.formatMessage({ id: 'resources.preheat.schedule.nextRunsUnavailable' })}
      </Typography.Text>
    </Space>}
    {advanced && <Collapse activeKey={['advanced']} items={[{ key: 'advanced', label: intl.formatMessage({ id: 'resources.form.advanced' }), forceRender: true, children: <>
      <Form.Item name="cron_expression" label={intl.formatMessage({ id: 'resources.preheat.schedule.cron' })} rules={[{ required: true }]}><Input disabled={disabled} /></Form.Item>
    </> }]} />}
  </>;
};

export default ScheduleEditor;
