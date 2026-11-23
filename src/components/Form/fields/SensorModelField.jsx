import React from 'react';
import FormField from '../FormField';

// ISA-PHM uses an explicit text answer; keep N/A in the model field so it
// survives the existing project, conversion and ISA-JSON interfaces.
export default function SensorModelField({ name, value = '', onChange, placeholder = 'Sensor model' }) {
  const notApplicable = value.trim().toUpperCase() === 'N/A';
  return <div className="space-y-1">
    <FormField name={name} label="Sensor model" value={value} onChange={(event) => onChange(event.target.value)} required placeholder={placeholder} disabled={notApplicable} />
    <label className="flex shrink-0 items-center gap-1.5 text-sm text-gray-700"><input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={notApplicable} onChange={(event) => onChange(event.target.checked ? 'N/A' : '')} />Sensor model is N/A</label>
  </div>;
}
