import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ParamsSettings from './dynamic-params';

vi.mock('@umijs/max', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id })
}));

describe('Playground 模型选择器', () => {
  it('已有模型清空后重新选择时同步表单显示和回调值', async () => {
    const onModelChange = vi.fn();
    const { container } = render(
      <ParamsSettings
        initialValues={{ model: 'model-a' }}
        modelList={[
          { label: 'model-a', value: 'model-a' },
          { label: 'model-b', value: 'model-b' }
        ]}
        onModelChange={onModelChange}
      />
    );

    fireEvent.mouseDown(container.querySelector('.ant-select-clear')!);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    await screen.findByRole('option', { name: 'model-b' });
    fireEvent.click(
      document.querySelector('.ant-select-item-option[title="model-b"]')!
    );

    expect(onModelChange).toHaveBeenLastCalledWith('model-b');
    expect(
      container.querySelector('.ant-select-selection-item')
    ).toHaveTextContent('model-b');
    await waitFor(() => {
      expect(screen.queryByRole('option', { name: 'model-a' })).toBeNull();
    });
  });
});
