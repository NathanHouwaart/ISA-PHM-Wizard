import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SensorsEditor from './SensorsEditor';

vi.mock('../../../contexts/GlobalDataContext', () => ({ useProjectData: () => ({ testSetups: [], configurationTypes: [] }) }));
vi.mock('../../Form/fields/DatasheetField', () => ({ default: () => null }));
vi.mock('../../Widgets/TableTooltip', () => ({ default: () => null }));

const types = [{ id: 'acc', name: 'Accelerometer', measurementType: 'Acceleration' }];

function EditorHarness({ sensorTypes = types, initialDefinitions = [], initialDevices = [], initialSensors = [] }) {
  const [devices, setDevices] = useState(initialDevices);
  const [sensors, setSensors] = useState(initialSensors);
  const [managedTypes, setManagedTypes] = useState(sensorTypes);
  const [definitions, setDefinitions] = useState(initialDefinitions);
  return <SensorsEditor sensors={sensors} sensorTypes={managedTypes} physicalDevices={devices} deviceDefinitions={definitions} onDeviceDefinitionsChange={setDefinitions} onPhysicalDevicesChange={setDevices} onSensorsChange={setSensors} onSensorTypesChange={setManagedTypes} />;
}

describe('sensor device tree', () => {
  it('offers starting choices and guides users to create a definition', () => {
    render(<EditorHarness sensorTypes={[]} />);
    expect(screen.getByText('For one sensor, such as a single-axis accelerometer.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Add device with outputs/ }));
    expect(screen.getByRole('dialog', { name: 'Manage device definitions' })).toBeTruthy();
    expect(document.querySelector('input[name="device-definition-name"]')).toBeTruthy();
  });

  it('creates a device definition first and adds a device instance', () => {
    render(<EditorHarness sensorTypes={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add device' }));
    fireEvent.change(document.querySelector('input[name="device-definition-name"]'), { target: { value: 'Custom sleeve' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('status').textContent).toBe('Saved');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add device' }));
    const select = screen.getByLabelText('Saved definition');
    fireEvent.change(select, { target: { value: select.options[1].value } });
    fireEvent.change(screen.getByLabelText(/Device name/), { target: { value: 'Sleeve 1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    expect(screen.getByRole('button', { name: 'Sleeve 1', exact: true })).toBeTruthy();
  });

  it('preserves existing standalone sensors without a definition', () => {
    const { container } = render(<EditorHarness sensorTypes={[]} initialSensors={[{ id: 's', alias: 'Existing', technologyType: 'Accelerometer' }]} />);
    expect(screen.getByRole('button', { name: /Existing/ })).toBeTruthy();
    expect(container.querySelector('input[name="sensor-0-technologyType"]').value).toBe('Accelerometer');
  });

  it('saves sensor details as a reusable type and assigns it', () => {
    const { container } = render(<EditorHarness sensorTypes={[]} initialSensors={[{ id: 's', alias: 'Sensor SE01' }]} />);
    fireEvent.change(container.querySelector('input[name="sensor-0-technologyType"]'), { target: { value: 'Accelerometer' } });
    fireEvent.change(container.querySelector('input[name="sensor-0-technologyPlatform"]'), { target: { value: 'Model A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save as sensor definition' }));
    fireEvent.change(document.querySelector('input[name="new-reusable-type-name"]'), { target: { value: 'Reusable accelerometer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save definition' }));
    expect(screen.getByRole('alert').textContent).toContain('measured quantity');
    const quantity = screen.getByLabelText(/Default measured quantity/);
    fireEvent.change(quantity, { target: { value: 'Acceleration' } });
    fireEvent.click(screen.getByRole('option', { name: 'Acceleration (Acceleration)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save definition' }));
    expect(screen.getByRole('button', { name: 'Edit sensor definition' })).toBeTruthy();
  });

  it('asks for confirmation before removing a sensor', () => {
    render(<EditorHarness sensorTypes={[]} initialSensors={[{ id: 's', alias: 'Sensor SE01' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove sensor' }));
    expect(screen.getByText(/removes its associated measurement and processing protocol mappings/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: /Sensor SE01/ })).toBeTruthy();
  });
  it('adds only the selected outputs from a saved device definition', () => {
    const definitions = [{ id: 'd', name: 'enDAQ', model: 'S3', datasheet: { notAvailable: true }, outputs: [
      { id: 'x', name: 'Acceleration X', technologyType: 'Accelerometer', measurementType: 'Acceleration' },
      { id: 'y', name: 'Acceleration Y', technologyType: 'Accelerometer', measurementType: 'Acceleration' },
    ] }];
    render(<EditorHarness initialDefinitions={definitions} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add device' }));
    fireEvent.change(screen.getByLabelText('Saved definition'), { target: { value: 'd' } });
    fireEvent.change(screen.getByLabelText(/Device name/), { target: { value: 'enDAQ 1' } });
    expect(screen.getByLabelText('Acceleration X').checked).toBe(false);
    fireEvent.click(screen.getByLabelText('Acceleration X'));
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    expect(screen.getByRole('button', { name: /Acceleration X/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Acceleration Y/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add output to enDAQ 1' }));
    expect(screen.queryByLabelText('Acceleration X')).toBeNull();
    fireEvent.click(screen.getByLabelText('Acceleration Y'));
    fireEvent.click(screen.getByRole('button', { name: 'Add selected outputs' }));
    expect(screen.getByRole('button', { name: /Acceleration Y/ })).toBeTruthy();
  });
  it('adds a device output using a saved sensor definition', () => {
    render(<EditorHarness initialDevices={[{ id: 'd', name: 'DAQ' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add output to DAQ' }));
    fireEvent.change(screen.getByLabelText('Saved definition'), { target: { value: 'acc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    expect(screen.getByText('Device: DAQ')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit sensor definition' })).toBeTruthy();
  });
  it('offers saved definitions when adding a standalone sensor', () => {
    render(<EditorHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Add standalone sensor output' }));
    fireEvent.change(screen.getByLabelText('Saved definition'), { target: { value: 'acc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    expect(screen.getByRole('button', { name: 'Edit sensor definition' })).toBeTruthy();
    expect(screen.getByText('Standalone sensor')).toBeTruthy();
  });
  it('lets the researcher name a device definition and edit it directly', () => {
    const device = { id: 'device', name: 'DAQ 1', model: 'S3', datasheet: { notAvailable: true } };
    const sensor = { id: 's', alias: 'X', physicalDeviceId: 'device', technologyType: 'Accelerometer', technologyPlatform: 'Sensor model', measurementType: 'Acceleration' };
    render(<EditorHarness sensorTypes={[]} initialDevices={[device]} initialSensors={[sensor]} />);
    fireEvent.click(screen.getByRole('button', { name: 'DAQ 1', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Save as definition' }));
    fireEvent.change(screen.getByLabelText('Device definition name'), { target: { value: 'My DAQ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save definition' }));
    expect(screen.getByRole('status').textContent).toContain('My DAQ');
    fireEvent.click(screen.getByRole('button', { name: 'Edit definition' }));
    expect(screen.getByRole('dialog', { name: 'Manage device definitions' })).toBeTruthy();
    expect(screen.getByDisplayValue('My DAQ')).toBeTruthy();
  });
  it('keeps a mapping-review notice after a quantity change until acknowledged', () => {
    const sensor = { id: 's', alias: 'X', technologyPlatform: 'Model', technologyType: 'Accelerometer', measurementType: 'Acceleration', quantityKindIdentifier: 'http://qudt.org/vocab/quantitykind/Acceleration' };
    render(<EditorHarness sensorTypes={[]} initialSensors={[sensor]} />);
    const quantity = screen.getByPlaceholderText('Search measured quantities');
    fireEvent.change(quantity, { target: { value: 'Temperature' } });
    fireEvent.click(screen.getByRole('option', { name: 'Temperature (Temperature)' }));
    expect(screen.getByRole('alert').textContent).toContain('review this sensor');
    expect(screen.getByText('Review mappings')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'I reviewed them or no mappings exist' }));
    expect(screen.queryByText('Review mappings')).toBeNull();
  });
  it('keeps the sensor model separate from the device model', () => {
    const device = { id: 'd', name: 'DAQ', model: 'S3' };
    const sensor = { id: 's', alias: 'X', physicalDeviceId: 'd', technologyType: 'Accelerometer' };
    const { container } = render(<EditorHarness sensorTypes={[]} initialDevices={[device]} initialSensors={[sensor]} />);
    const model = container.querySelector('input[name="sensor-0-technologyPlatform"]');
    expect(model.value).toBe('');
    fireEvent.change(model, { target: { value: 'Sensor A' } });
    expect(model.value).toBe('Sensor A');
  });
  it('allows a reusable device definition without outputs', () => {
    const device = { id: 'd', name: 'DAQ', model: 'S3', datasheet: { notAvailable: true } };
    render(<EditorHarness sensorTypes={[]} initialDevices={[device]} />);
    fireEvent.click(screen.getByRole('button', { name: 'DAQ', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Save as definition' }));
    expect(screen.getByRole('dialog', { name: 'Save device definition' })).toBeTruthy();
  });
  it('opens the linked sensor definition directly', () => {
    const definitions = [types[0], { id: 'temp', name: 'Temperature probe', measurementType: 'Temperature' }];
    const sensor = { id: 's', alias: 'T', sensorTypeId: 'temp' };
    render(<EditorHarness sensorTypes={definitions} initialSensors={[sensor]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit sensor definition' }));
    expect(document.querySelector('input[name="sensor-type-name"]').value).toBe('Temperature probe');
  });

  it('deletes a device and its outputs while keeping other sensors and the definition', () => {
    const definition = { id: 'def', name: 'DAQ definition', outputs: [] };
    const device = { id: 'd', name: 'DAQ', definitionId: 'def' };
    const sensor = { id: 's', alias: 'X', physicalDeviceId: 'd' };
    const standalone = { id: 'other', alias: 'Other sensor' };
    render(<EditorHarness initialDefinitions={[definition]} initialDevices={[device]} initialSensors={[sensor, standalone]} />);
    fireEvent.click(screen.getByRole('button', { name: 'DAQ', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete device' }));
    expect(screen.getByText(/saved device definition remains available/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'DAQ', exact: true })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete device' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete device' }));
    expect(screen.queryByRole('button', { name: 'DAQ', exact: true })).toBeNull();
    expect(screen.queryByRole('button', { name: /^X/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Other sensor/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add device', exact: true }));
    expect(screen.getByText('DAQ definition')).toBeTruthy();
  });

  it('updates linked device and output details after editing their definition', () => {
    const definition = { id: 'def', name: 'Sleeve', model: 'Version 1', outputs: [{ id: 'x', name: 'FBG 1', technologyType: 'FBG', technologyPlatform: 'Model 1', measurementType: 'Strain' }] };
    const device = { id: 'd', name: 'Sleeve 1', model: 'Version 1', definitionId: 'def' };
    const sensor = { id: 's', alias: 'FBG 1', physicalDeviceId: 'd', definitionOutputId: 'x', technologyType: 'FBG', technologyPlatform: 'Model 1', measurementType: 'Strain' };
    render(<EditorHarness initialDefinitions={[definition]} initialDevices={[device]} initialSensors={[sensor]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sleeve 1', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit definition' }));
    fireEvent.change(document.querySelector('input[name="device-definition-model"]'), { target: { value: 'Version 2' } });
    fireEvent.click(screen.getByRole('button', { name: 'FBG 1', exact: true }));
    fireEvent.change(document.querySelector('input[name="definition-output-model-x"]'), { target: { value: 'Model 2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('dialog', { name: 'Manage device definitions' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(document.querySelector('input[name="device-model"]').value).toBe('Version 2');
    fireEvent.click(screen.getByRole('button', { name: /FBG 1/ }));
    expect(screen.getByText('Model 2')).toBeTruthy();
  });
  it('allows selecting all eight outputs of a custom sleeve', () => {
    const definition = { id: 'def', name: 'Custom sleeve', outputs: Array.from({ length: 8 }, (_, i) => ({ id: `f${i}`, name: `FBG ${i + 1}`, technologyType: 'FBG', technologyPlatform: 'Custom', measurementType: 'Strain' })) };
    render(<EditorHarness initialDefinitions={[definition]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add device' }));
    fireEvent.change(screen.getByLabelText('Saved definition'), { target: { value: 'def' } });
    fireEvent.change(screen.getByLabelText(/Device name/), { target: { value: 'Sleeve 1' } });
    for (let i = 1; i <= 8; i++) fireEvent.click(screen.getByLabelText(`FBG ${i}`));
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    for (let i = 1; i <= 8; i++) expect(screen.getByRole('button', { name: new RegExp(`FBG ${i}`) })).toBeTruthy();
  });

  it('opens definition management without an intermediate dialog', () => {
    render(<EditorHarness sensorTypes={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Manage definitions' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Device definitions' }));
    expect(screen.getByRole('dialog', { name: 'Manage device definitions' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('requires enabling an override before editing linked sensor details and can restore the definition', () => {
    const sensorTypes = [{ id: 't', name: 'Probe', technologyType: 'Accelerometer', technologyPlatform: 'Model A', measurementType: 'Acceleration' }];
    const sensor = { id: 's', alias: 'Probe 1', sensorTypeId: 't', technologyType: 'Accelerometer', technologyPlatform: 'Model A', measurementType: 'Acceleration' };
    const { container } = render(<EditorHarness sensorTypes={sensorTypes} initialSensors={[sensor]} />);
    expect(container.querySelector('input[name="sensor-0-technologyPlatform"]')).toBeNull();
    const checkbox = screen.getByRole('checkbox', { name: /Override definition for this sensor/ });
    fireEvent.click(checkbox);
    fireEvent.change(container.querySelector('input[name="sensor-0-technologyPlatform"]'), { target: { value: 'Model B' } });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Use definition' }));
    expect(container.querySelector('input[name="sensor-0-technologyPlatform"]')).toBeNull();
    expect(screen.getByText('Model A')).toBeTruthy();
  });

});
