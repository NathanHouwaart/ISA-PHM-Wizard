import React, { useState, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';

import { cn } from '../../utils/utils';
import FormField from '../Form/FormField';
import { SEARCH_FUZZY_THRESHOLD, SEARCH_IGNORE_LOCATION } from '../../constants/ui';

/**
 * ItemSelector Component
 * 
 * A unified searchable selector for studies, runs, or any items with fuzzy search.
 * Replaces StudySelector and RunSelector with a single flexible component.
 * 
 * @component
 * @example
 * // For studies:
 * <ItemSelector
 *   items={studies}
 *   selectedId={selectedStudyId}
 *   onChange={setStudyId}
 *   idKey="id"
 *   labelKey="label"
 *   getBadgeContent={(study) => `${study.runs.length} run${study.runs.length !== 1 ? 's' : ''}`}
 *   placeholder="Search studies..."
 *   searchLabel="Search Studies"
 * />
 * 
 * // For runs:
 * <ItemSelector
 *   items={runs}
 *   selectedId={selectedRunId}
 *   onChange={setRunId}
 *   idKey="runId"
 *   labelKey="label"
 *   getBadgeContent={(run) => run.studyIndex !== undefined ? `S${run.studyIndex + 1}` : 'Run'}
 *   placeholder="Search runs..."
 *   searchLabel="Search Runs"
 *   maxHeight="max-h-64"
 * />
 * 
 * @param {Object} props
 * @param {Array<Object>} [props.items=[]] - Array of items to select from
 * @param {string} props.selectedId - ID of currently selected item
 * @param {(id: string) => void} props.onChange - Callback when selection changes
 * @param {string} [props.idKey='id'] - Property name for item ID
 * @param {string} [props.labelKey='label'] - Property name for display label
 * @param {(item: Object) => string} [props.getBadgeContent] - Function to generate badge text
 * @param {string} [props.placeholder='Search...'] - Search input placeholder
 * @param {string} [props.searchLabel='Search'] - Aria label for search field
 * @param {string} [props.maxHeight='max-h-48'] - Maximum height CSS class
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {JSX.Element} Searchable item selector
 */
const ItemSelector = ({
  items = [],
  selectedId,
  onChange,
  idKey = 'id',
  labelKey = 'label',
  getBadgeContent,
  placeholder = 'Search...',
  searchLabel = 'Search',
  maxHeight = 'max-h-48',
  className = ''
}) => {
  const [query, setQuery] = useState('');

  const handleQueryChange = useCallback((e) => {
    setQuery(e.target.value);
  }, []);

  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys: [labelKey],
      threshold: SEARCH_FUZZY_THRESHOLD,
      ignoreLocation: SEARCH_IGNORE_LOCATION,
    });
  }, [items, labelKey]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    return fuse.search(query.trim()).map(r => r.item);
  }, [query, items, fuse]);

  return (
    <div className={cn('flex flex-col gap-2 w-full', className)} role="search" aria-label={searchLabel}>
      <FormField
        name={`search-${labelKey}`}
        value={query}
        onChange={handleQueryChange}
        placeholder={placeholder}
        className="w-full"
        label={searchLabel}
        aria-label={searchLabel}
      />
      <div
        className={cn('overflow-y-auto rounded-md border border-gray-200 bg-gray-50 divide-y divide-gray-200', maxHeight)}
        role="listbox"
        aria-label={`${searchLabel} options`}
      >
        {filtered.length === 0 && (
          <div className="p-3 text-xs text-gray-500 italic" role="status">
            No matches found
          </div>
        )}
        {filtered.map(item => {
          const itemId = item[idKey];
          const itemLabel = item[labelKey];
          const active = itemId === selectedId;
          const badgeText = getBadgeContent ? getBadgeContent(item) : null;

          return (
            <button
              key={itemId}
              onClick={() => onChange(itemId)}
              className={cn(
                'w-full text-left px-3 py-2 flex items-center justify-between text-sm transition-colors',
                active ? 'bg-white font-semibold text-blue-700 shadow-inner' : 'hover:bg-white text-gray-700'
              )}
              role="option"
              aria-selected={active}
              aria-label={badgeText ? `${itemLabel}, ${badgeText}` : itemLabel}
            >
              <span className="truncate" title={itemLabel}>{itemLabel}</span>
              {badgeText && (
                <span className={cn('ml-2 text-[11px] rounded-full px-2 py-0.5', active ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600')}>
                  {badgeText}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ItemSelector;
