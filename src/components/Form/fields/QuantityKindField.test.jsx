import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import QuantityKindField from './QuantityKindField';

it('accepts a catalogue selection and does not save arbitrary text', () => {
  const onChange = vi.fn();
  render(<QuantityKindField value="" identifier="" onChange={onChange} />);
  const input = screen.getByLabelText('Measured quantity');
  fireEvent.change(input, { target: { value: 'Acceleration' } });
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onChange).toHaveBeenLastCalledWith({ name: 'Acceleration', identifier: 'http://qudt.org/vocab/quantitykind/Acceleration' });
  fireEvent.change(input, { target: { value: 'custom quantity' } });
  expect(onChange).toHaveBeenCalledTimes(1);
});

it('offers quaternion components as a project-defined, not QUDT, term', () => {
  const onChange = vi.fn();
  render(<QuantityKindField value="" identifier="" onChange={onChange} />);
  const input = screen.getByLabelText('Measured quantity');
  fireEvent.change(input, { target: { value: 'Quaternion component' } });
  fireEvent.click(screen.getByRole('option', { name: 'Quaternion component (ISA-PHM local term)' }));
  expect(onChange).toHaveBeenCalledWith({ name: 'Quaternion component', identifier: 'urn:isa-phm:quantity:quaternion-component' });
});
