import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SensorTypeDialog from './SensorTypeDialog';

vi.mock('../../contexts/GlobalDataContext', () => ({ useProjectData: () => ({ testSetups: [], configurationTypes: [] }) }));
vi.mock('../Form/fields/DatasheetField', () => ({ default: () => null }));

const types = [
  { id: 'a', name: 'Type A', technologyPlatform: 'Model A', technologyType: 'Accelerometer', measurementType: 'Acceleration' },
  { id: 'b', name: 'Type B', technologyPlatform: 'Model B', technologyType: 'Accelerometer', measurementType: 'Acceleration' },
];

describe('Manage sensor types', () => {
  it('does not save an incomplete reusable type', () => {
    const onChange = vi.fn();
    render(<SensorTypeDialog open types={[{ id: 'incomplete', name: 'Incomplete' }]} sensors={[]} onChange={onChange} onClose={vi.fn()} typesOnly />);
    fireEvent.click(screen.getByRole('button', { name: 'Save all' }));
    expect(screen.getByText(/needs: sensor model, technology type, measured quantity/)).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('stages edits to multiple types and applies them together', async () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(<SensorTypeDialog open types={types} sensors={[]} onChange={onChange} onClose={onClose} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Sensor types' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Wilcoxon 786B-10 vibration channel'), { target: { value: 'Edited A' } });
    fireEvent.click(screen.getByRole('button', { name: /Type B/ }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Wilcoxon 786B-10 vibration channel'), { target: { value: 'Edited B' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Save all/ }));
    await waitFor(() => expect(onChange).toHaveBeenCalledOnce());
    expect(onChange.mock.calls[0][0].map((type) => type.name)).toEqual(['Edited A', 'Edited B']);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('cancels without applying edits', async () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(<SensorTypeDialog open types={types} sensors={[]} onChange={onChange} onClose={onClose} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Sensor types' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Wilcoxon 786B-10 vibration channel'), { target: { value: 'Discarded' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('saves device and type changes together across tabs', async () => {
    const onChange = vi.fn();
    const onDevicesChange = vi.fn();
    render(<SensorTypeDialog open types={types} devices={[{ id: 'd', name: 'Recorder' }]} sensors={[]} onChange={onChange} onDevicesChange={onDevicesChange} onClose={vi.fn()} />);
    fireEvent.change(screen.getByDisplayValue('Recorder'), { target: { value: 'enDAQ' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Sensor types' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Wilcoxon 786B-10 vibration channel'), { target: { value: 'Acceleration' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Devices' }));
    expect(screen.getByDisplayValue('enDAQ')).toBeTruthy();
    expect(onDevicesChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save all' }));
    await waitFor(() => expect(onDevicesChange).toHaveBeenCalledOnce());
    expect(onDevicesChange.mock.calls[0][0][0].name).toBe('enDAQ');
    expect(onChange.mock.calls[0][0][0].name).toBe('Acceleration');
  });

  it('discards device changes when cancelled', async () => {
    const onDevicesChange = vi.fn();
    const onClose = vi.fn();
    render(<SensorTypeDialog open types={types} devices={[{ id: 'd', name: 'Recorder' }]} sensors={[]} onChange={vi.fn()} onDevicesChange={onDevicesChange} onClose={onClose} />);
    fireEvent.change(screen.getByDisplayValue('Recorder'), { target: { value: 'Discarded' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onDevicesChange).not.toHaveBeenCalled();
  });

  it('creates only selected outputs and links them to the chosen device on save', async () => {
    const onSensorsChange = vi.fn();
    render(<SensorTypeDialog open types={types} devices={[{ id: 'd', name: 'Recorder' }]} sensors={[]} onChange={vi.fn()} onDevicesChange={vi.fn()} onSensorsChange={onSensorsChange} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Sensor type for new output'), { target: { value: 'a' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add output' }));
    expect(onSensorsChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save all' }));
    await waitFor(() => expect(onSensorsChange).toHaveBeenCalledOnce());
    expect(onSensorsChange.mock.calls[0][0]).toEqual([expect.objectContaining({ physicalDeviceId: 'd', sensorTypeId: 'a' })]);
  });

  it('discards newly added outputs when cancelled', async () => {
    const onSensorsChange = vi.fn();
    const onClose = vi.fn();
    render(<SensorTypeDialog open types={types} devices={[{ id: 'd', name: 'Recorder' }]} sensors={[]} onChange={vi.fn()} onSensorsChange={onSensorsChange} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText('Sensor type for new output'), { target: { value: 'a' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add output' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onSensorsChange).not.toHaveBeenCalled();
  });
});
