import React from 'react';
import { cn } from '@/utils/utils';

/**
 * A row of toggle pill chips for opting sensors in/out of a protocol.
 *
 * Default behaviour: all sensors are applicable (opt-out model).
 * Absent or empty `protocol.applicableSensorIds` means all included.
 * Clicking a chip toggles that sensor out (or back in).
 *
 * Props:
 *   sensors          – array of sensor objects { id, alias, name }
 *   protocol         – the protocol object (may have applicableSensorIds)
 *   onProtocolChange – called with the updated protocol object
 */
const SensorApplicabilityChips = ({ sensors = [], protocol, onProtocolChange }) => {
  if (!sensors.length) return null;

  const applicableIds = protocol?.applicableSensorIds;
  // undefined / null / non-array = all included; empty array = none included
  const allIncluded = !Array.isArray(applicableIds);

  const isIncluded = (sensorId) => {
    if (allIncluded) return true;
    return applicableIds.includes(String(sensorId));
  };

  const handleToggle = (sensorId) => {
    const sid = String(sensorId);

    let currentIds;
    if (allIncluded) {
      currentIds = sensors.map((s) => String(s.id));
    } else {
      currentIds = [...applicableIds];
    }

    let nextIds;
    if (currentIds.includes(sid)) {
      nextIds = currentIds.filter((id) => id !== sid);
    } else {
      nextIds = [...currentIds, sid];
    }

    // If all sensors are back in, reset to undefined (= default "all included")
    const resolved = nextIds.length >= sensors.length ? undefined : nextIds;
    onProtocolChange({ ...protocol, applicableSensorIds: resolved });
  };

  return (
    <div className="mt-3">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        Applicable sensors
      </span>
      <div className="flex flex-wrap gap-2 mt-1.5">
        {sensors.map((sensor) => {
          const included = isIncluded(sensor.id);
          const label = sensor.alias || sensor.name || String(sensor.id);
          return (
            <button
              key={sensor.id}
              type="button"
              onClick={() => handleToggle(sensor.id)}
              className={cn(
                'border rounded-full px-3.5 py-1.5 text-sm transition-colors select-none cursor-pointer',
                included
                  ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                  : 'text-gray-400 border-gray-200 bg-gray-50 hover:bg-gray-100 line-through'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SensorApplicabilityChips;
