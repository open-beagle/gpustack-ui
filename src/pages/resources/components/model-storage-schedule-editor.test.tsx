import { Button, Form } from 'antd';
import dayjs from 'dayjs';
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildScheduleCron,
  getNextScheduleTimes,
  getSchedulePayload,
  getScheduleSummary,
  parseScheduleCron
} from './model-storage-schedule';
import ScheduleEditor from './model-storage-schedule-editor';

vi.mock('@umijs/max', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id })
}));

afterEach(cleanup);

const SchedulePayloadForm: React.FC<{ allowContinuous?: boolean }> = ({ allowContinuous }) => {
  const [form] = Form.useForm();
  const [payload, setPayload] = useState('');
  return <Form
    form={form}
    initialValues={{ trigger_mode: 'manual', schedule_preset: 'manual', schedule_time: '00:00', timezone: 'UTC' }}
    onFinish={(values) => setPayload(JSON.stringify(getSchedulePayload(values, Boolean(allowContinuous) as true)))}
  >
    <ScheduleEditor allowContinuous={allowContinuous} />
    <Button htmlType="submit">submit</Button>
    <output data-testid="schedule-payload">{payload}</output>
  </Form>;
};

describe('共享调度辅助', () => {
  it('把常用模式转换为稳定 Cron，并提供摘要和未来执行时间', () => {
    const values = {
      trigger_mode: 'scheduled' as const,
      schedule_preset: 'weekly' as const,
      schedule_time: '08:30',
      schedule_weekday: '1',
      timezone: 'Asia/Shanghai'
    };
    expect(buildScheduleCron(values)).toBe('30 08 * * 1');
    expect(getScheduleSummary(values)).toBe('weekly');
    expect(getNextScheduleTimes(values, dayjs('2026-08-24T00:00:00Z')).length).toBe(3);
  });

  it('无法识别的既有 Cron 保持原值并进入自定义模式', () => {
    expect(parseScheduleCron('0 1 1 * *')).toEqual({
      schedule_preset: 'custom'
    });
    expect(buildScheduleCron({
      trigger_mode: 'scheduled',
      schedule_preset: 'custom',
      cron_expression: '0 1 1 * *'
    })).toBe('0 1 1 * *');
  });

  it('手动模式不提交 Cron', () => {
    expect(buildScheduleCron({ trigger_mode: 'manual', schedule_preset: 'manual' })).toBeNull();
  });

  it('按所选时区计算 custom Cron，并由 cron-parser 跨越 DST', () => {
    const values = {
      trigger_mode: 'scheduled' as const,
      schedule_preset: 'custom' as const,
      cron_expression: '30 1 * * *',
      timezone: 'America/New_York'
    };
    const runs = getNextScheduleTimes(values, dayjs('2026-10-31T00:00:00Z'));
    expect(runs).toHaveLength(3);
    expect(runs.map((run) => new Intl.DateTimeFormat('en-US', {
      timeZone: values.timezone,
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).format(run))).toEqual(['01:30', '01:30', '01:30']);
  });

  it('continuous 不生成 Cron 或下一次执行时间', () => {
    const values = { trigger_mode: 'continuous' as const, schedule_preset: 'continuous' as const };
    expect(buildScheduleCron(values)).toBeNull();
    expect(getNextScheduleTimes(values)).toEqual([]);
  });

  it('同步策略通过共享编辑器从 manual 切换为 daily 后提交 scheduled Cron', async () => {
    render(<SchedulePayloadForm />);
    fireEvent.mouseDown(screen.getByLabelText('resources.preheat.schedule.triggerMode'));
    fireEvent.click(await screen.findByText('resources.preheat.schedule.preset.daily'));
    fireEvent.click(screen.getByText('submit'));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('schedule-payload').textContent || '{}')).toEqual({
      trigger_mode: 'scheduled', cron_expression: '00 00 * * *'
    }));
  });

  it('分发策略通过共享编辑器选择 continuous 后提交 continuous 且不带 Cron', async () => {
    render(<SchedulePayloadForm allowContinuous />);
    fireEvent.mouseDown(screen.getByLabelText('resources.preheat.schedule.triggerMode'));
    fireEvent.click(await screen.findByText('resources.preheat.schedule.preset.continuous'));
    fireEvent.click(screen.getByText('submit'));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('schedule-payload').textContent || '{}')).toEqual({
      trigger_mode: 'continuous', cron_expression: null
    }));
  });
});
