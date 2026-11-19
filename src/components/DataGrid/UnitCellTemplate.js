import { formatUnit } from '../../utils/unitCatalogue';

// Display only; grid values and the values passed to editors remain unchanged.
export function UnitCellTemplate(h, { model, prop }) {
  const value = model?.[prop] || '';
  const identifier = prop === 'unit' ? model?.unitIdentifier : model?.[`${prop}_identifier`];
  const label = formatUnit(value, identifier);
  return h('span', { title: label, style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' } }, label);
}
