import { unitSelection } from './unitCatalogue';
import { isSensorApplicable } from './protocolApplicability';

const statuses = new Set(['unknown', 'not applicable']);

export function validateMeasurementMetadata(payload) {
  const errors = [];
  for (const study of payload.studies || []) {
    const protocol = (payload.measurement_protocols || []).find((item) => item.id === study.selectedMeasurementProtocolId);
    if (!protocol) continue;
    for (const assay of study.assay_details || []) {
      if (!isSensorApplicable(protocol, String(assay.used_sensor?.id || ''))) continue;
      const sensor = assay.used_sensor?.alias || assay.used_sensor?.id || 'sensor';
      for (const [key, name] of [['sampling_rate', 'Sampling Rate'], ['measured_unit', 'Measured Unit']]) {
        const parameter = (protocol.parameters || []).find((item) => item.builtinKey === key);
        const mapping = (assay.measurement_protocols || []).find((item) => item.targetId === parameter?.id);
        const value = String(mapping?.value?.[0] ?? '').trim();
        const unit = String(mapping?.value?.[1] ?? '').trim();
        const prefix = `${study.name || 'Study'} / ${sensor} / ${name}`;
        if (!parameter || !value) { errors.push(`${prefix}: provide a value, Unknown, or Not applicable.`); continue; }
        if (statuses.has(value.toLowerCase())) {
          // Explicitly answered; duplicate legacy mappings are still checked below.
        } else if (key === 'sampling_rate') {
          const numericValue = Number(value.replace(',', '.'));
          if (!/^\d+(?:[.,]\d+)?$/.test(value) || !Number.isFinite(numericValue) || numericValue <= 0 || !['hz', 'khz', 'mhz'].includes(unit.toLowerCase())) {
            errors.push(`${prefix}: enter a positive number (decimal comma or dot) and Hz, kHz, or MHz.`);
          }
        } else {
          const selected = unitSelection(mapping.valueIdentifier);
          if (!selected || selected.value !== value) errors.push(`${prefix}: "${value}" is not linked to a matching catalogue unit. In the measurement protocol grid, select the unit again in this sensor's Specification cell.`);
        }
        const duplicates = (protocol.parameters || []).filter((item) => !item.builtinKey && item.name?.trim().toLowerCase() === name.toLowerCase());
        if (duplicates.some((item) => (assay.measurement_protocols || []).some((entry) => entry.targetId === item.id && String(entry.value?.[0] ?? '').trim()))) {
          errors.push(`${prefix}: remove or rename the existing duplicate parameter before export.`);
        }
      }
    }
  }
  return errors;
}
