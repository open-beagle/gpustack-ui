import {
  cleanup,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ModelDistributionPolicyRuns from './model-distribution-policy-runs';

const api = vi.hoisted(() => ({
  queryModelPreheatPolicyRun: vi.fn(),
  queryModelPreheatPolicyRuns: vi.fn()
}));

vi.mock('@umijs/max', () => ({
  useIntl: () => ({
    formatMessage: (
      { id }: { id: string },
      values?: Record<string, unknown>
    ) => (values ? `${id} ${JSON.stringify(values)}` : id)
  })
}));

vi.mock('../apis', () => api);

const summary = {
  total: 1,
  pending: 0,
  running: 0,
  paused: 0,
  ready: 1,
  error: 0,
  failed: 0,
  skipped: 0,
  progress: 100,
  downloaded_bytes: 1024,
  total_bytes: 1024
};

const run = {
  id: 5,
  policy_id: 1,
  policy_name: 'S3-work',
  model_id: 'Qwen/Qwen-7B-Chat-Int8',
  trigger: 'manual',
  state: 'ready',
  execution_state: 'ready',
  summary,
  tasks: [],
  error_code: null,
  outcome: null,
  window_start_utc: '2026-08-30T06:51:17Z',
  started_at: '2026-08-30T06:51:17Z',
  finished_at: '2026-08-30T06:51:19Z',
  created_at: '2026-08-30T06:51:17Z',
  updated_at: '2026-08-30T06:51:19Z'
};

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  api.queryModelPreheatPolicyRuns.mockResolvedValue({
    items: [run],
    pagination: { page: 1, perPage: 10, total: 1, totalPage: 1 }
  });
  api.queryModelPreheatPolicyRun.mockResolvedValue({
    ...run,
    tasks: [
      {
        id: 89,
        model_file_id: null,
        model_id: 'Qwen/Qwen-7B-Chat-Int8',
        worker_id: 6,
        worker_uuid: 'cfc16eeb-ef53-4b3f-b283-3e1b683d9dd3',
        worker_name: 'beagle-241',
        worker_ip: '10.4.2.241',
        artifact_id: 'modelscope/Qwen/Qwen-7B-Chat-Int8/rev',
        state: 'ready',
        progress: 100,
        downloaded_bytes: 1024,
        total_bytes: 1024,
        error_code: null,
        state_message: null
      }
    ]
  });
});

describe('分发记录列表', () => {
  it('展示后端分发 run，并在详情中显示可读模型和节点信息', async () => {
    const user = userEvent.setup();
    render(<ModelDistributionPolicyRuns />);

    expect(api.queryModelPreheatPolicyRuns).toHaveBeenCalledWith({
      page: 1,
      perPage: 10
    });
    expect(await screen.findAllByText('S3-work')).not.toHaveLength(0);
    expect(
      screen.getAllByText('Qwen/Qwen-7B-Chat-Int8').length
    ).toBeGreaterThan(0);

    await user.click(
      screen.getByRole('button', {
        name: 'resources.storage.distributionPolicy.runDetail'
      })
    );

    await waitFor(() =>
      expect(api.queryModelPreheatPolicyRun).toHaveBeenCalledWith(5)
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('beagle-241')).toBeInTheDocument();
    expect(within(dialog).getByText('10.4.2.241')).toBeInTheDocument();
  });
});
