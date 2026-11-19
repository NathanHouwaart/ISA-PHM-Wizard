import qudtQuantities from '../../vendor/isa-phm-specification/catalogues/qudt-quantities-3.5.2.json';
import isaPhmQuantities from '../../vendor/isa-phm-specification/catalogues/isa-phm-quantities.json';

// This project-defined term is not a QUDT quantity kind. It identifies one
// dimensionless component of a quaternion representing orientation.
export const QUATERNION_COMPONENT = Object.freeze(isaPhmQuantities.find((item) => item.identifier === 'urn:isa-phm:quantity:quaternion-component'));
export const QUANTITY_CATALOGUE = [...qudtQuantities, ...isaPhmQuantities];
const quantities = QUANTITY_CATALOGUE;

const byIdentifier = new Map(quantities.map((quantity) => [quantity.identifier, quantity]));
const normalizedName = (value) => String(value || '').trim().toLowerCase();
const names = new Set(quantities.map((quantity) => normalizedName(quantity.name)));
const byName = new Map();
quantities.forEach((quantity) => {
  const name = normalizedName(quantity.name);
  const matches = byName.get(name) || [];
  matches.push(quantity);
  byName.set(name, matches);
});

export function resolveUnambiguousQuantity(name) {
  const matches = byName.get(normalizedName(name)) || [];
  return matches.length === 1 ? matches[0] : null;
}

export function isAmbiguousQuantityName(name) {
  return (byName.get(normalizedName(name)) || []).length > 1;
}

export function isKnownSensorQuantity(name, identifier) {
  const normalized = normalizedName(name);
  if (!normalized) return false;
  if (identifier) {
    const option = byIdentifier.get(identifier);
    return Boolean(option && normalizedName(option.name) === normalized);
  }
  return names.has(normalized);
}
