import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ModelTaskRecords from './model-task-records';

const router = vi.hoisted(() => ({
  location: {
    pathname: '/resources/modelfiles',
    search: '?tab=tasks&task_tab=preheat'
  },
  navigate: vi.fn()
}));

vi.mock('@umijs/max', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }),
  useLocation: () => router.location,
  useNavigate: () => router.navigate
}));
vi.mock('./model-preheat-tasks', () => ({
  default: () => <div>preheat-task-list</div>
}));
vi.mock('./model-storage-sync-tasks', () => ({
  default: () => <div>sync-task-list</div>
}));
vi.mock('./model-distribution-policy-runs', () => ({
  default: () => <div>distribution-run-list</div>
}));

afterEach(cleanup);
beforeEach(() => {
  router.location.search = '?tab=tasks&task_tab=preheat';
  router.navigate.mockClear();
});

describe('模型任务记录', () => {
  it('从 task_tab 恢复页签，并在切换时持久化到 URL', async () => {
    const user = userEvent.setup();
    render(<ModelTaskRecords />);

    expect(screen.getByText('preheat-task-list')).toBeInTheDocument();
    await user.click(
      screen.getByRole('tab', { name: 'resources.storage.syncTasks' })
    );
    expect(router.navigate).toHaveBeenCalledWith(
      '/resources/modelfiles?tab=tasks&task_tab=sync',
      { replace: true }
    );
  });

  it('分发记录展示独立分发运行列表，不复用预热记录', () => {
    router.location.search = '?tab=tasks&task_tab=distribution';
    render(<ModelTaskRecords />);

    expect(screen.getByText('distribution-run-list')).toBeInTheDocument();
    expect(screen.queryByText('preheat-task-list')).not.toBeInTheDocument();
  });
});
