import { describe, expect, it } from 'vitest';
import { getDatasetOutputSensors, pruneProtocolSensorState } from './protocolSensorScope';

describe('protocol sensor scope', () => {
  const sensors = [
    { id: 'output', usage: 'dataset-output' },
    { id: 'monitor', usage: 'condition-monitoring' },
    { id: 'both', usage: 'both' },
  ];

  it('includes only dataset-output and dual-purpose sensors in protocol grids', () => {
    expect(getDatasetOutputSensors(sensors).map((sensor) => sensor.id)).toEqual(['output', 'both']);
  });

  it('removes monitoring-only protocol mappings and applicability selections', () => {
    const result = pruneProtocolSensorState({
      sensors,
      measurementProtocols: [{ id: 'measurement', applicableSensorIds: ['output', 'monitor'] }],
      processingProtocols: [{ id: 'processing', applicableSensorIds: ['monitor', 'both'] }],
      sensorToMeasurementProtocolMapping: [
        { sourceId: 'output', protocolId: 'measurement' },
        { sourceId: 'monitor', protocolId: 'measurement' },
      ],
      sensorToProcessingProtocolMapping: [
        { sourceId: 'monitor', protocolId: 'processing' },
        { sourceId: 'both', protocolId: 'processing' },
      ],
    });

    expect(result.measurementProtocols[0].applicableSensorIds).toEqual(['output']);
    expect(result.processingProtocols[0].applicableSensorIds).toEqual(['both']);
    expect(result.sensorToMeasurementProtocolMapping.map((mapping) => mapping.sourceId)).toEqual(['output']);
    expect(result.sensorToProcessingProtocolMapping.map((mapping) => mapping.sourceId)).toEqual(['both']);
  });
});
