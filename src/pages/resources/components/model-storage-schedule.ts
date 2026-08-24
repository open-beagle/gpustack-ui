import dayjs, { type Dayjs } from 'dayjs';
import { CronExpressionParser } from 'cron-parser';

export type SchedulePreset = 'manual' | 'continuous' | 'hourly' | 'daily' | 'weekly' | 'custom';

export interface ScheduleDraft {
  trigger_mode?: 'manual' | 'scheduled' | 'continuous';
  cron_expression?: string | null;
  timezone?: string;
  schedule_preset?: SchedulePreset;
  schedule_time?: string;
  schedule_weekday?: string;
}

export interface SchedulePayload {
  trigger_mode: 'manual' | 'scheduled' | 'continuous';
  cron_expression: string | null;
}

export interface FiniteSchedulePayload extends Omit<SchedulePayload, 'trigger_mode'> {
  trigger_mode: 'manual' | 'scheduled';
}

export function getBrowserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function getScheduleTimezones() {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['UTC', 'Asia/Shanghai', 'Asia/Tokyo', 'Europe/London', 'America/Los_Angeles'];
  }
}

export function isSupportedTimezone(timezone?: string) {
  if (!timezone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

export function parseScheduleCron(cron?: string | null): Pick<ScheduleDraft, 'schedule_preset' | 'schedule_time' | 'schedule_weekday'> {
  if (!cron) return { schedule_preset: 'manual', schedule_time: '00:00' };
  const [minute, hour, dayOfMonth, month, dayOfWeek, ...extra] = cron.trim().split(/\s+/);
  if (extra.length || !minute || !hour || !dayOfMonth || !month || !dayOfWeek) return { schedule_preset: 'custom' };
  const schedule_time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    if (hour === '*' && /^\d{1,2}$/.test(minute)) return { schedule_preset: 'hourly', schedule_time: `00:${minute.padStart(2, '0')}` };
    if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute)) return { schedule_preset: 'custom' };
    return { schedule_preset: 'daily', schedule_time };
  }
  if (dayOfMonth === '*' && month === '*' && /^[0-6]$/.test(dayOfWeek) && /^\d{1,2}$/.test(hour) && /^\d{1,2}$/.test(minute)) return { schedule_preset: 'weekly', schedule_time, schedule_weekday: dayOfWeek };
  return { schedule_preset: 'custom' };
}

export function buildScheduleCron(values: ScheduleDraft): string | null {
  const preset = values.schedule_preset || (values.trigger_mode === 'manual' ? 'manual' : values.trigger_mode === 'continuous' ? 'continuous' : 'daily');
  if (preset === 'manual' || preset === 'continuous') return null;
  if (preset === 'custom') return values.cron_expression?.trim() || null;
  const [hour = '0', minute = '0'] = (values.schedule_time || '00:00').split(':');
  if (preset === 'hourly') return `${minute} * * * *`;
  if (preset === 'weekly') return `${minute} ${hour} * * ${values.schedule_weekday || '1'}`;
  return `${minute} ${hour} * * *`;
}

export function getScheduleTriggerMode(values: ScheduleDraft): SchedulePayload['trigger_mode'] {
  const preset = values.schedule_preset || (values.trigger_mode === 'manual' ? 'manual' : values.trigger_mode === 'continuous' ? 'continuous' : 'daily');
  if (preset === 'manual') return 'manual';
  if (preset === 'continuous') return 'continuous';
  return 'scheduled';
}

export function getSchedulePayload(values: ScheduleDraft): FiniteSchedulePayload;
export function getSchedulePayload(values: ScheduleDraft, allowContinuous: true): SchedulePayload;
export function getSchedulePayload(values: ScheduleDraft, allowContinuous = false): SchedulePayload {
  const trigger_mode = getScheduleTriggerMode(values);
  return {
    trigger_mode: allowContinuous ? trigger_mode : trigger_mode === 'continuous' ? 'manual' : trigger_mode,
    cron_expression: trigger_mode === 'scheduled' ? buildScheduleCron(values) : null
  };
}

export function getScheduleSummary(values: ScheduleDraft): SchedulePreset | string {
  const preset = values.schedule_preset || (values.trigger_mode === 'manual' ? 'manual' : values.trigger_mode === 'continuous' ? 'continuous' : 'daily');
  if (preset === 'manual' || preset === 'continuous' || preset === 'hourly' || preset === 'daily' || preset === 'weekly') return preset;
  return values.cron_expression || 'custom';
}

export function getNextScheduleTimes(values: ScheduleDraft, now: Dayjs = dayjs()) {
  if (getScheduleTriggerMode(values) !== 'scheduled') return [] as Date[];
  const timezone = isSupportedTimezone(values.timezone) ? values.timezone! : getBrowserTimezone();
  const cron = buildScheduleCron(values);
  if (!cron) return [] as Date[];
  try {
    const interval = CronExpressionParser.parse(cron, {
      currentDate: now.toDate(),
      tz: timezone
    });
    return [interval.next().toDate(), interval.next().toDate(), interval.next().toDate()];
  } catch {
    // 未知或无效的既有 Cron 仍可保存原文，但客户端不会编造执行时间。
    return [] as Date[];
  }
}
