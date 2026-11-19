import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { formatUnit, searchUnits } from '../../../utils/unitCatalogue';

export default function UnitField({ value = '', identifier = '', onChange, label = 'Unit' }) {
  const listId = useId();
  const inputId = useId();
  const inputRef = useRef(null);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState(null);
  const options = useMemo(() => searchUnits(query).slice(0, 100), [query]);

  useEffect(() => { setQuery(value); }, [value]);
  useLayoutEffect(() => {
    if (!open || !inputRef.current) return undefined;
    const positionMenu = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const above = spaceBelow < 120 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(0, Math.min(224, above ? spaceAbove : spaceBelow));
      setMenuPosition({
        left: Math.max(0, rect.left),
        width: Math.max(0, Math.min(rect.width, window.innerWidth - Math.max(0, rect.left))),
        top: above ? undefined : rect.bottom + 4,
        bottom: above ? window.innerHeight - rect.top + 4 : undefined,
        maxHeight,
      });
    };
    positionMenu();
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    return () => {
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
    };
  }, [open]);
  useEffect(() => {
    if (open && activeIndex >= 0) document.getElementById(`${listId}-option-${activeIndex}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [open, activeIndex, listId]);

  const selectUnit = (unit) => {
    setQuery(unit.symbol);
    setOpen(false);
    setActiveIndex(-1);
    onChange({ value: unit.symbol, identifier: unit.identifier });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      if (!options.length) return;
      setActiveIndex((current) => event.key === 'ArrowDown'
        ? Math.min(current + 1, options.length - 1)
        : current < 0 ? options.length - 1 : Math.max(current - 1, 0));
    } else if (event.key === 'Enter' && open && activeIndex >= 0 && options[activeIndex]) {
      event.preventDefault();
      selectUnit(options[activeIndex]);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setQuery(value);
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative text-sm font-medium text-gray-700">
      <label htmlFor={inputId}>{label}</label>
      <div className="relative mt-1">
        <input
          id={inputId}
          ref={inputRef}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-9 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={open ? query : formatUnit(value, identifier)}
          title={formatUnit(value, identifier)}
          placeholder="Search units"
          onFocus={() => { setQuery(value); setOpen(true); setActiveIndex(-1); }}
          onChange={(event) => {
            const text = event.target.value;
            setQuery(text);
            setOpen(true);
            setActiveIndex(-1);
            if (!text) onChange({ value: '', identifier: '' });
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => { setQuery(value); setOpen(false); setActiveIndex(-1); }}
        />
        <button type="button" aria-label="Show unit options" tabIndex={-1}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-800"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => { inputRef.current?.focus(); setOpen(true); setActiveIndex(-1); }}>
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      {open && menuPosition && createPortal(
        <div className="fixed z-[9999] overflow-y-auto overflow-x-hidden rounded-md border border-gray-200 bg-white shadow-lg" style={menuPosition}>
          <ul id={listId} role="listbox" aria-label={`${label} options`} className="py-1 font-normal">
            {options.map((unit, index) => (
              <li id={`${listId}-option-${index}`} key={unit.identifier} role="option"
                aria-selected={index === activeIndex}
                className={`cursor-pointer break-words px-3 py-2 ${index === activeIndex ? 'bg-blue-100 text-blue-900' : 'text-gray-800 hover:bg-gray-100'}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectUnit(unit)}>
                <span className="font-medium">{unit.symbol}</span> <span className="text-gray-500">({unit.name})</span>
              </li>
            ))}
            {!options.length && <li className="px-3 py-2 text-gray-500">No matching catalogue units</li>}
          </ul>
        </div>, document.body
      )}
    </div>
  );
}
