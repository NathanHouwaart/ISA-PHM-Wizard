import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SensorsEditor from './SensorsEditor';

vi.mock('../../../contexts/GlobalDataContext', () => ({ useProjectData: () => ({ testSetups: [], configurationTypes: [] }) }));
vi.mock('../../Form/fields/DatasheetField', () => ({ default: () => null }));
vi.mock('../../Widgets/TableTooltip', () => ({ default: () => null }));

const types = [{ id: 'acc', name: 'Accelerometer', measurementType: 'Acceleration' }];

function EditorHarness({ sensorTypes = types }) {
  const [devices, setDevices] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [managedTypes, setManagedTypes] = useState(sensorTypes);
  return <SensorsEditor sensors={sensors} sensorTypes={managedTypes} physicalDevices={devices} onPhysicalDevicesChange={setDevices} onSensorsChange={setSensors} onSensorTypesChange={setManagedTypes} />;
}

describe('sensor device tree', () => {
  it('offers two starting choices when the tree is empty', () => {
    render(<EditorHarness sensorTypes={[]} />);
    expect(screen.getByText('For one sensor, such as a single-axis accelerometer.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Add device with outputs/ }));
    expect(screen.getByText('Edit device')).toBeTruthy();
  });

  it('adds a device and creates an output underneath it', () => {
    const { container } = render(<EditorHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Add device' }));
    fireEvent.change(container.querySelector('input[name="device-name"]'), { target: { value: 'enDAQ 1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add output to enDAQ 1' }));
    expect(screen.getByRole('button', { name: /Sensor SE01/ })).toBeTruthy();
    expect(container.querySelector('select[name="sensor-0-physicalDeviceId"]').value).not.toBe('');
  });

  it('allows a standalone sensor without creating a reusable type', () => {
    const { container } = render(<EditorHarness sensorTypes={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add standalone sensor output' }));
    expect(screen.getByRole('button', { name: /Sensor SE01/ })).toBeTruthy();
    expect(container.querySelector('input[name="sensor-0-technologyType"]')).toBeTruthy();
  });

  it('saves sensor details as a reusable type and assigns it', () => {
    const { container } = render(<EditorHarness sensorTypes={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add standalone sensor output' }));
    fireEvent.click(container.querySelector('summary'));
    fireEvent.change(container.querySelector('input[name="sensor-0-technologyType"]'), { target: { value: 'Accelerometer' } });
    fireEvent.change(container.querySelector('input[name="sensor-0-technologyPlatform"]'), { target: { value: 'Model A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save as reusable type' }));
    fireEvent.change(document.querySelector('input[name="new-reusable-type-name"]'), { target: { value: 'Reusable accelerometer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save type' }));
    expect(screen.getByRole('alert').textContent).toContain('measured quantity');
    const quantity = screen.getByLabelText(/Default measured quantity/);
    const option = document.getElementById(quantity.getAttribute('list')).querySelector('option');
    fireEvent.change(quantity, { target: { value: option.value } });
    fireEvent.click(screen.getByRole('button', { name: 'Save type' }));
    const selector = container.querySelector('select[name="sensor-0-sensorTypeId"]');
    expect(selector.selectedOptions[0].textContent).toBe('Reusable accelerometer');
  });

  it('asks for confirmation before removing a sensor', () => {
    render(<EditorHarness sensorTypes={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add standalone sensor output' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove sensor' }));
    expect(screen.getByText(/removes its associated measurement and processing protocol mappings/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: /Sensor SE01/ })).toBeTruthy();
  });
});
