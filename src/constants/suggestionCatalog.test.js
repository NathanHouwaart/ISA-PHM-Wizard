import { expect, it } from 'vitest';
import { FAULT_SPECIFICATION_SUGGESTIONS, OPERATING_CONDITION_SUGGESTIONS, MEASUREMENT_PROTOCOL_PARAMETER_SUGGESTIONS, PROCESSING_PROTOCOL_PARAMETER_SUGGESTIONS } from './suggestionCatalog';
import { unitSelection } from '../utils/unitCatalogue';

it('uses catalogue identifiers for every suggested default unit', () => {
  const suggestions = [...FAULT_SPECIFICATION_SUGGESTIONS, ...OPERATING_CONDITION_SUGGESTIONS,
    ...MEASUREMENT_PROTOCOL_PARAMETER_SUGGESTIONS, ...PROCESSING_PROTOCOL_PARAMETER_SUGGESTIONS];
  for (const suggestion of suggestions) {
    if (suggestion.unit) expect(unitSelection(suggestion.unitIdentifier)?.value).toBe(suggestion.unit);
    else expect(suggestion.unitIdentifier).toBe('');
  }
  expect(OPERATING_CONDITION_SUGGESTIONS.find((item) => item.name === 'Rotational Speed').unit).toBe('rev/min');
  expect(OPERATING_CONDITION_SUGGESTIONS.find((item) => item.name === 'Cutting Speed').unit).toBe('');
});
