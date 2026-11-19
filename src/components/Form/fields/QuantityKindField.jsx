import React, { useEffect, useId, useMemo, useState } from 'react';
import { QUANTITY_CATALOGUE as quantities } from '../../../utils/quantityCatalogue';
const optionLabel = (item) => `${item.name} (${item.identifier.startsWith('urn:isa-phm:') ? 'ISA-PHM local term' : item.identifier.split('/').pop()})`;

export default function QuantityKindField({ value, identifier, onChange, label = 'Measured quantity', required = false }) {
  const listId = useId();
  const selected = useMemo(() => quantities.find((item) => item.identifier === identifier), [identifier]);
  const [query, setQuery] = useState(selected?.name || value || '');
  useEffect(() => { setQuery(selected?.name || value || ''); }, [selected, value]);
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
      <input
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        list={listId}
        aria-required={required || undefined}
        value={query}
        onChange={(event) => {
          const text = event.target.value;
          setQuery(text);
          const match = quantities.find((item) => optionLabel(item) === text);
          if (match) onChange({ name: match.name, identifier: match.identifier });
          else if (!text) onChange({ name: '', identifier: '' });
        }}
        onBlur={() => setQuery(selected?.name || value || '')}
        placeholder="Search measured quantities"
      />
      <datalist id={listId}>
        {quantities.map((item) => <option key={item.identifier} value={optionLabel(item)} />)}
      </datalist>
    </label>
  );
}
