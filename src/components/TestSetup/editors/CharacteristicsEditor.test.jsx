import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import CharacteristicsEditor from './CharacteristicsEditor';

vi.mock('../../Widgets/TableTooltip', () => ({ default: () => null }));

it('stores a catalogue unit symbol and identifier on the component property', () => {
  const onCharacteristicsChange = vi.fn();
  render(<CharacteristicsEditor characteristics={[{ id: 'motor', category: 'Motor', value: '2.2', unit: '', isReplaceable: false }]} onCharacteristicsChange={onCharacteristicsChange} />);
  const unit = screen.getByLabelText('Unit');
  fireEvent.focus(unit);
  fireEvent.change(unit, { target: { value: 'Kilowatt' } });
  fireEvent.click(screen.getByRole('option', { name: 'kW (Kilowatt)' }));
  expect(onCharacteristicsChange).toHaveBeenCalledWith([expect.objectContaining({ unit: 'kW', unitIdentifier: 'http://qudt.org/vocab/unit/KiloW' })]);
});
