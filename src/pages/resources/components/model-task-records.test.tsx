import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ModelTaskRecords from './model-task-records';

vi.mock('@umijs/max', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id })
}));
vi.mock('./model-preheat-tasks', () => ({
  default: () => <div>preheat-task-list</div>
}));
vi.mock('./model-storage-sync-tasks', () => ({
  default: () => <div>sync-task-list</div>
}));

describe('模型任务记录', () => {
  it('分发记录在没有后端列表接口时展示明确空态，不复用预热记录', async () => {
    const user = userEvent.setup();
    render(<ModelTaskRecords />);

    await user.click(
      screen.getByRole('tab', { name: 'resources.storage.distributionTasks' })
    );

    expect(
      screen.getByText('resources.storage.distributionTasks.unavailable')
    ).toBeInTheDocument();
    expect(screen.queryByText('preheat-task-list')).not.toBeInTheDocument();
  });
});
