/**
 * Returns true if the given sensorId is applicable to the protocol.
 * By convention, if applicableSensorIds is absent or empty, ALL sensors
 * are applicable (opt-out model — users must explicitly exclude sensors).
 *
 * @param {object|null|undefined} protocol
 * @param {string|number} sensorId
 * @returns {boolean}
 */
export function isSensorApplicable(protocol, sensorId) {
  if (!protocol) return true;
  const ids = protocol.applicableSensorIds;
  // undefined / null / non-array  → all sensors included (default opt-out model)
  if (!Array.isArray(ids)) return true;
  // empty array [] → all sensors explicitly excluded
  if (ids.length === 0) return false;
  return ids.includes(String(sensorId));
}
