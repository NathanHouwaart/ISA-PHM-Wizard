import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeviceDefinitionDialog from './DeviceDefinitionDialog';
import * as catalogue from '../../utils/deviceCatalogue';

vi.mock('../../contexts/GlobalDataContext', () => ({ useProjectData: () => ({ testSetups: [], configurationTypes: [] }) }));
vi.mock('../Form/fields/DatasheetField', () => ({ default: () => null }));

describe('device definition management', () => {
  it('opens the linked definition selected from a device', () => {
    const definitions = [{ id: 'a', name: 'First', outputs: [] }, { id: 'b', name: 'Second', outputs: [] }];
    render(<DeviceDefinitionDialog open initialDefinitionId="b" definitions={definitions} devices={[]} sensors={[]} onSave={vi.fn()} onClose={() => {}} />);
    expect(screen.getByDisplayValue('Second')).toBeTruthy();
  });
  it('warns before removing a used output and preserves the sensor', () => {
    const definition = { id: 'def', name: 'DAQ', model: 'S3', outputs: [{ id: 'out', name: 'X', technologyType: 'Accelerometer', measurementType: 'Acceleration' }] };
    const devices = [{ id: 'device', name: 'DAQ 1', definitionId: 'def', model: 'S3' }];
    const sensors = [{ id: 'sensor', alias: 'X sensor', physicalDeviceId: 'device', definitionOutputId: 'out', technologyType: 'Accelerometer', measurementType: 'Acceleration' }];
    const onSave = vi.fn();
    render(<DeviceDefinitionDialog open definitions={[definition]} devices={devices} sensors={sensors} onSave={onSave} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'X', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove output' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText(/Affected sensors: X sensor/)).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(onSave.mock.calls[0][2][0]).toMatchObject({ id: 'sensor', definitionOutputId: '', alias: 'X sensor' });
  });
  it('shows only the selected output and preserves edits when switching sections', () => {
    const definition = { id: 'd', name: 'Device', outputs: [{ id: 'a', name: 'X' }, { id: 'b', name: 'Y' }] };
    render(<DeviceDefinitionDialog open definitions={[definition]} devices={[]} sensors={[]} onSave={vi.fn()} onClose={() => {}} />);
    expect(document.querySelector('input[name="device-definition-name"]')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Device definition sections' }).tagName).toBe('DIV');
    expect(document.querySelector('input[name="definition-output-name-a"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'X', exact: true }));
    fireEvent.change(document.querySelector('input[name="definition-output-name-a"]'), { target: { value: 'X edited' } });
    fireEvent.click(screen.getByRole('button', { name: 'Y', exact: true }));
    expect(document.querySelector('input[name="definition-output-name-a"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'X edited', exact: true }));
    expect(document.querySelector('input[name="definition-output-name-a"]').value).toBe('X edited');
  });

  it('uses the searchable catalogue dropdown for output quantities', () => {
    const definition = { id: 'd', name: 'Device', outputs: [{ id: 'a', name: 'X', technologyType: 'Accelerometer', technologyPlatform: 'Model' }] };
    render(<DeviceDefinitionDialog open definitions={[definition]} devices={[]} sensors={[]} onSave={vi.fn()} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'X', exact: true }));
    const input = screen.getByRole('combobox', { name: /Measured quantity/ });
    expect(input.getAttribute('list')).toBeNull();
    expect(input.getAttribute('autocomplete')).toBe('off');
    fireEvent.change(input, { target: { value: 'Acceleration' } });
    expect(screen.getByRole('listbox', { name: 'Measured quantity options' })).toBeTruthy();
    fireEvent.click(screen.getByRole('option', { name: 'Acceleration (Acceleration)' }));
    expect(input.value).toBe('Acceleration');
  });

  it('allows explicitly selecting N/A for an output sensor model', () => {
    const definition = { id: 'd', name: 'Device', outputs: [{ id: 'a', name: 'X', technologyType: 'Accelerometer', measurementType: 'Acceleration', technologyPlatform: '' }] };
    const onSave = vi.fn();
    render(<DeviceDefinitionDialog open definitions={[definition]} devices={[]} sensors={[]} onSave={onSave} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'X', exact: true }));
    fireEvent.click(screen.getByLabelText('Sensor model is N/A'));
    expect(document.querySelector('input[name="definition-output-model-a"]').value).toBe('N/A');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSave.mock.calls[0][0][0].outputs[0].technologyPlatform).toBe('N/A');
  });

  it('adds a catalogue copy to the current setup without altering the catalogue', async () => {
    const original = catalogue.DEVICE_CATALOGUE[1];
    const create = vi.spyOn(catalogue, 'createDefinitionFromCatalogue').mockImplementation(async (entry) => ({ ...structuredClone(entry), id: 'new-copy', catalogueDatasheet: undefined }));
    function Harness() {
      const [definitions, setDefinitions] = useState([]);
      return <DeviceDefinitionDialog open definitions={definitions} devices={[]} sensors={[]} onSave={(next) => setDefinitions(next)} onClose={() => {}} />;
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /Custom FBG sleeve/ }));
    expect(await screen.findByDisplayValue(original.name)).toBeTruthy();
    expect(screen.getByText('Outputs (8)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect((await screen.findByRole('status')).textContent).toBe('Saved');
    expect(catalogue.DEVICE_CATALOGUE[1].id).not.toBe('new-copy');
    create.mockRestore();
  });

});
