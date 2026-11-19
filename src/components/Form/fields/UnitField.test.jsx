import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import UnitField from './UnitField';

it('shows the selected unit name without changing its stored symbol', () => {
  const onChange = vi.fn();
  render(<UnitField value="g" identifier="http://qudt.org/vocab/unit/GM" onChange={onChange} />);
  const input = screen.getByRole('combobox', { name: 'Unit' });
  expect(input.value).toBe('g (Gram)');
  fireEvent.focus(input);
  expect(input.value).toBe('g');
  fireEvent.blur(input);
  expect(input.value).toBe('g (Gram)');
  expect(onChange).not.toHaveBeenCalled();
});

it('returns the symbol and ontology identifier for a selected unit', () => {
  const onChange = vi.fn();
  render(<UnitField value="" onChange={onChange} />);
  const input = screen.getByLabelText('Unit');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: 'Hertz' } });
  fireEvent.click(screen.getByRole('option', { name: 'Hz (Hertz)' }));
  expect(onChange).toHaveBeenLastCalledWith({ value: 'Hz', identifier: 'http://qudt.org/vocab/unit/HZ' });
});

it('selects the first filtered option with the first ArrowDown and Enter', () => {
  const onChange = vi.fn();
  render(<UnitField value="" onChange={onChange} />);
  const input = screen.getByRole('combobox', { name: 'Unit' });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: 'gram' } });
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(screen.getByRole('option', { name: 'g (Gram)' }).getAttribute('aria-selected')).toBe('true');
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onChange).toHaveBeenCalledWith({ value: 'g', identifier: 'http://qudt.org/vocab/unit/GM' });
});

it('does not select a unit when the search is cancelled', () => {
  const onChange = vi.fn();
  render(<UnitField value="legacy unit" onChange={onChange} />);
  const input = screen.getByRole('combobox', { name: 'Unit' });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: 'does-not-exist' } });
  expect(screen.getByText('No matching catalogue units')).toBeTruthy();
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(input.value).toBe('legacy unit');
  expect(onChange).not.toHaveBeenCalled();
});

it('selects Gravity for an uppercase G search', () => {
  const onChange = vi.fn();
  render(<UnitField value="" onChange={onChange} />);
  const input = screen.getByRole('combobox', { name: 'Unit' });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: 'G' } });
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onChange).toHaveBeenCalledWith({ value: 'G', identifier: 'http://qudt.org/vocab/unit/G' });
});

it('renders the menu outside the form and matches the field width', () => {
  const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 120, right: 260, top: 200, bottom: 240, width: 140, height: 40 });
  try {
    const { container } = render(<div style={{ overflow: 'auto' }}><UnitField value="" onChange={vi.fn()} /></div>);
    fireEvent.focus(screen.getByRole('combobox', { name: 'Unit' }));
    const list = screen.getByRole('listbox', { name: 'Unit options' });
    expect(container.contains(list)).toBe(false);
    expect(list.parentElement.style.width).toBe('140px');
    expect(list.parentElement.style.left).toBe('120px');
  } finally {
    rect.mockRestore();
  }
});

it('places the menu above the field when there is more room above', () => {
  const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 10, right: 210, top: 730, bottom: 760, width: 200, height: 30 });
  try {
    render(<UnitField value="" onChange={vi.fn()} />);
    fireEvent.focus(screen.getByRole('combobox', { name: 'Unit' }));
    const menu = screen.getByRole('listbox', { name: 'Unit options' }).parentElement;
    expect(menu.style.bottom).toBe('42px');
    expect(menu.style.top).toBe('');
  } finally {
    rect.mockRestore();
  }
});

it('does not commit arbitrary text and preserves the existing value on blur', () => {
  const onChange = vi.fn();
  render(<UnitField value="legacy unit" onChange={onChange} />);
  const input = screen.getByLabelText('Unit');
  fireEvent.change(input, { target: { value: 'made-up-unit' } });
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.blur(input);
  expect(input.value).toBe('legacy unit');
  fireEvent.change(input, { target: { value: '' } });
  expect(onChange).toHaveBeenCalledWith({ value: '', identifier: '' });
});
