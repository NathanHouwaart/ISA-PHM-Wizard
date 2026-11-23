import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import SensorApplicabilityChips from './SensorApplicabilityChips';

it('shows device-qualified sensor labels while selecting by sensor ID', () => {
  const onProtocolChange = vi.fn();
  render(<SensorApplicabilityChips sensors={[
    { id: 'x', alias: 'X', protocolLabel: 'DAQ - X' },
    { id: 's', alias: 'Standalone', protocolLabel: 'Standalone' },
  ]} protocol={{ id: 'p' }} onProtocolChange={onProtocolChange} />);

  fireEvent.click(screen.getByRole('button', { name: 'DAQ - X' }));
  expect(screen.getByRole('button', { name: 'Standalone' })).toBeTruthy();
  expect(onProtocolChange).toHaveBeenCalledWith({ id: 'p', applicableSensorIds: ['s'] });
});
