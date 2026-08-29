import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import { Form } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import SealSelect from './seal-select';

vi.mock('@umijs/max', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id })
}));

describe('SealSelect 可搜索受控值', () => {
  it('受控 open 时点击浮动标签只通知一次打开', () => {
    const onOpenChange = vi.fn();
    render(
      <SealSelect
        open={false}
        onOpenChange={onOpenChange}
        label="模型"
        options={[{ label: 'model-a', value: 'model-a' }]}
      />
    );

    fireEvent.click(screen.getByText('模型'));

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('已有值清空后可重新选择，并同步关闭下拉、表单值和显示值', async () => {
    const FormHarness = () => {
      const [form] = Form.useForm<{ model?: string }>();
      const model = Form.useWatch('model', form);
      return (
        <Form form={form} initialValues={{ model: 'model-a' }}>
          <Form.Item name="model">
            <SealSelect
              allowClear
              showSearch
              optionFilterProp="label"
              label="模型"
              options={[
                { label: 'model-a', value: 'model-a' },
                { label: 'model-b', value: 'model-b' }
              ]}
            />
          </Form.Item>
          <output data-testid="form-model">{model || 'empty'}</output>
        </Form>
      );
    };

    const { container } = render(<FormHarness />);
    expect(screen.getByTestId('form-model')).toHaveTextContent('model-a');

    fireEvent.mouseDown(container.querySelector('.ant-select-clear')!);
    expect(screen.getByTestId('form-model')).toHaveTextContent('empty');

    fireEvent.mouseDown(within(container).getByRole('combobox'));
    await screen.findByRole('option', { name: 'model-b' });
    fireEvent.click(
      document.querySelector('.ant-select-item-option[title="model-b"]')!
    );

    expect(screen.getByTestId('form-model')).toHaveTextContent('model-b');
    expect(
      container.querySelector('.ant-select-selection-item')
    ).toHaveTextContent('model-b');
    await waitFor(() => {
      expect(screen.queryByRole('option', { name: 'model-a' })).toBeNull();
    });
  });
});
