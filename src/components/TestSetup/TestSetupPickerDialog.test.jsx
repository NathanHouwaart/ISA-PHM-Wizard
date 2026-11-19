import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TestSetupPickerDialog from './TestSetupPickerDialog';

vi.mock('../../hooks/useFuseSearch', () => { const setQuery = vi.fn(); return { default: (items) => ({ query: '', setQuery, results: items }) }; });
vi.mock('./TestSetupSelectableCard', () => ({ default: ({ item, onSelect }) => <button type="button" onClick={onSelect}>{item.name}</button> }));

const ready = { id: 'ready', name: 'Ready rig', location: 'Lab', experimentPreparationProtocolName: 'Prepare', testSpecimenName: 'Bearing', characteristics: [{ isReplaceable: true, category: 'Bearing', description: 'Bearing' }] };

describe('test setup picker readiness', () => {
  it('shows but does not assign a draft, and allows a ready setup', () => {
    const onConfirm = vi.fn();
    render(<TestSetupPickerDialog open testSetups={[{ id: 'draft', name: 'Draft rig' }, ready]} onClose={vi.fn()} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Draft rig' }));
    expect(screen.getByRole('button', { name: 'Assign test setup' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Ready rig' }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign test setup' }));
    expect(onConfirm).toHaveBeenCalledWith('ready');
  });
});
