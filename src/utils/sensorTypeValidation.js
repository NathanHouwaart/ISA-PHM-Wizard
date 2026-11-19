export function missingSensorTypeFields(type) {
  return [
    ['name', 'type name'],
    ['technologyPlatform', 'sensor model'],
    ['technologyType', 'technology type'],
    ['measurementType', 'measured quantity']
  ].filter(([key]) => !String(type?.[key] || '').trim()).map(([, label]) => label);
}
