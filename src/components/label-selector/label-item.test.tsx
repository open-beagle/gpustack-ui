import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LabelItem from './label-item';

vi.mock('@umijs/max', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id })
}));

describe('LabelItem 候选标签模式', () => {
  it('使用级联下拉选择标签键和值，并在切换键时清空旧值', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <LabelItem
        label={{ key: '', value: '' }}
        labelList={[{ key: '', value: '' }]}
        labelOptions={{ zone: ['beijing', 'shanghai'], gpu: ['a100'] }}
        onChange={onChange}
      />
    );

    const [keySelect, valueSelect] = screen.getAllByRole('combobox');
    expect(valueSelect).toBeDisabled();

    fireEvent.mouseDown(keySelect);
    fireEvent.click(
      document.querySelector('.ant-select-item-option[title="zone"]')!
    );
    expect(onChange).toHaveBeenLastCalledWith({ key: 'zone', value: '' });

    rerender(
      <LabelItem
        label={{ key: 'zone', value: 'beijing' }}
        labelList={[{ key: 'zone', value: 'beijing' }]}
        labelOptions={{ zone: ['beijing', 'shanghai'], gpu: ['a100'] }}
        onChange={onChange}
      />
    );
    const [, populatedValueSelect] = screen.getAllByRole('combobox');
    fireEvent.mouseDown(populatedValueSelect);
    fireEvent.change(populatedValueSelect, { target: { value: 'jing' } });
    expect(
      document.querySelector('.ant-select-item-option[title="beijing"]')
    ).not.toBeNull();
    expect(
      document.querySelector('.ant-select-item-option[title="shanghai"]')
    ).toBeNull();
    fireEvent.keyDown(populatedValueSelect, { key: 'Escape' });

    fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
    fireEvent.click(
      document.querySelector('.ant-select-item-option[title="gpu"]')!
    );
    expect(onChange).toHaveBeenLastCalledWith({ key: 'gpu', value: '' });
  });
});
