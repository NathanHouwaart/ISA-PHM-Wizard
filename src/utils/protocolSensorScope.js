import { isSensorIncludedInDatasetOutput } from './sensorUsage';

const asArray = (value) => (Array.isArray(value) ? value : []);

export const getDatasetOutputSensors = (sensors = []) => (
  asArray(sensors).filter(isSensorIncludedInDatasetOutput)
);

const getSensorId = (mapping = {}) => (
  mapping.sourceId ?? mapping.sensorId ?? mapping.source ?? null
);

const pruneProtocolApplicability = (protocols, outputSensorIds) => (
  asArray(protocols).map((protocol) => {
    if (!Array.isArray(protocol?.applicableSensorIds)) return protocol;

    return {
      ...protocol,
      applicableSensorIds: protocol.applicableSensorIds.filter((sensorId) => (
        outputSensorIds.has(String(sensorId))
      )),
    };
  })
);

const pruneSensorMappings = (mappings, outputSensorIds) => (
  asArray(mappings).filter((mapping) => outputSensorIds.has(String(getSensorId(mapping))))
);

/**
 * Removes protocol state for sensors that are not exported as dataset output.
 * Monitoring-only sensors remain part of the test setup but cannot have output
 * protocol mappings or protocol applicability selections.
 */
export const pruneProtocolSensorState = (state = {}) => {
  const outputSensorIds = new Set(getDatasetOutputSensors(state.sensors).map((sensor) => String(sensor.id)));

  return {
    measurementProtocols: pruneProtocolApplicability(state.measurementProtocols, outputSensorIds),
    processingProtocols: pruneProtocolApplicability(state.processingProtocols, outputSensorIds),
    sensorToMeasurementProtocolMapping: pruneSensorMappings(
      state.sensorToMeasurementProtocolMapping,
      outputSensorIds
    ),
    sensorToProcessingProtocolMapping: pruneSensorMappings(
      state.sensorToProcessingProtocolMapping,
      outputSensorIds
    ),
  };
};
