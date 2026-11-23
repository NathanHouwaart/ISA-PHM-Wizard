import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useProtocolSections from './useProtocolSections';

describe('protocol grid sensor labels', () => {
  it('shows device and sensor names in both grids without changing sensor IDs or aliases', () => {
    const sensors = [
      { id: 'a', alias: 'X', physicalDeviceId: 'one' },
      { id: 'b', alias: 'X', physicalDeviceId: 'two' },
      { id: 'c', alias: 'Standalone' },
    ];
    const formData = { sensors, physicalDevices: [{ id: 'one', name: 'DAQ 1' }, { id: 'two', name: 'DAQ 2' }], measurementProtocols: [], processingProtocols: [] };
    const { result, rerender } = renderHook(({ data }) => useProtocolSections({ formData: data, setFormData: vi.fn() }), { initialProps: { data: formData } });
    for (const config of [result.current.measurementProtocolGridConfig, result.current.processingProtocolGridConfig]) {
      expect(config.fieldMappings.columnName).toBe('protocolLabel');
      expect(config.columnData.map((sensor) => sensor.protocolLabel)).toEqual(['DAQ 1 - X', 'DAQ 2 - X', 'Standalone']);
      expect(config.columnData.map((sensor) => sensor.id)).toEqual(['a', 'b', 'c']);
      expect(config.columnData.map((sensor) => sensor.alias)).toEqual(['X', 'X', 'Standalone']);
    }
    rerender({ data: { ...formData, physicalDevices: [{ id: 'one', name: 'Renamed DAQ' }, { id: 'two', name: 'DAQ 2' }] } });
    expect(result.current.measurementProtocolGridConfig.columnData[0].protocolLabel).toBe('Renamed DAQ - X');
  });
});
