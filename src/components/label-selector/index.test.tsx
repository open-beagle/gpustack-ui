import { fireEvent, render, screen, within } from '@testing-library/react';
import { Form } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import LabelSelector from '.';

vi.mock('@umijs/max', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id })
}));

describe('LabelSelector 受控值同步', () => {
  it('同一 labels 对象补入节点默认值后仍同步到键值选择器', async () => {
    const labels: Record<string, string> = {};
    const labelOptions = { zone: ['beijing', 'shanghai'] };
    const { rerender } = render(
      <LabelSelector labels={labels} labelOptions={labelOptions} />
    );
    expect(screen.queryAllByRole('combobox')).toHaveLength(0);

    labels.zone = 'beijing';
    rerender(<LabelSelector labels={labels} labelOptions={labelOptions} />);

    expect(await screen.findAllByRole('combobox')).toHaveLength(2);
    expect(screen.getByText('zone')).toBeInTheDocument();
    expect(screen.getByText('beijing')).toBeInTheDocument();
  });

  it('异步表单新值覆盖尚未填写的本地空行', async () => {
    const FormHarness = () => {
      const [form] = Form.useForm<{ labels: Record<string, string> }>();
      const labels = Form.useWatch('labels', form) || {};
      return (
        <Form form={form} initialValues={{ labels: {} }}>
          <Form.Item name="labels">
            <LabelSelector
              labels={labels}
              labelOptions={{ zone: ['beijing', 'shanghai'] }}
            />
          </Form.Item>
          <button
            type="button"
            onClick={() => form.setFieldValue('labels', { zone: 'beijing' })}
          >
            写入默认值
          </button>
        </Form>
      );
    };

    const { container } = render(<FormHarness />);
    const form = within(container);
    fireEvent.click(
      form.getByRole('button', { name: /common\.button\.addSelector/ })
    );
    expect(form.getAllByRole('combobox')).toHaveLength(2);

    fireEvent.click(form.getByRole('button', { name: '写入默认值' }));

    expect(await form.findByText('zone')).toBeInTheDocument();
    expect(form.getByText('beijing')).toBeInTheDocument();
    expect(form.getAllByRole('combobox')).toHaveLength(2);
  });

  it('编辑态点击已回显的选择器标签可直接打开候选项', async () => {
    const { container } = render(
      <LabelSelector
        labels={{ os: 'linux' }}
        labelOptions={{
          os: ['linux'],
          arch: ['amd64'],
          'worker-name': ['xny-a100']
        }}
      />
    );

    fireEvent.click(within(container).getByText('common.input.key'));

    expect(await screen.findAllByText('arch')).not.toHaveLength(0);
    expect(screen.getAllByText('worker-name')).not.toHaveLength(0);
  });
});
