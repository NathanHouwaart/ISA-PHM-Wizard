import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { QUANTITY_CATALOGUE as quantities } from '../../../utils/quantityCatalogue';

const termLabel = (item) => item.identifier.startsWith('urn:isa-phm:') ? 'ISA-PHM local term' : item.identifier.split('/').pop();

export default function QuantityKindField({ value = '', identifier = '', onChange, label = 'Measured quantity', required = false }) {
  const inputId = useId();
  const listId = useId();
  const inputRef = useRef(null);
  const selected = useMemo(() => quantities.find((item) => item.identifier === identifier), [identifier]);
  const [query, setQuery] = useState(selected?.name || value || '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState(null);
  const options = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return quantities.filter((item) => !search || `${item.name} ${termLabel(item)}`.toLocaleLowerCase().includes(search)).slice(0, 100);
  }, [query]);

  useEffect(() => { setQuery(selected?.name || value || ''); }, [selected, value]);
  useLayoutEffect(() => {
    if (!open || !inputRef.current) return undefined;
    const positionMenu = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const above = spaceBelow < 120 && spaceAbove > spaceBelow;
      setMenuPosition({ left: Math.max(0, rect.left), width: Math.max(0, Math.min(rect.width, window.innerWidth - Math.max(0, rect.left))), top: above ? undefined : rect.bottom + 4, bottom: above ? window.innerHeight - rect.top + 4 : undefined, maxHeight: Math.max(0, Math.min(224, above ? spaceAbove : spaceBelow)) });
    };
    positionMenu();
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    return () => { window.removeEventListener('resize', positionMenu); window.removeEventListener('scroll', positionMenu, true); };
  }, [open]);
  useEffect(() => {
    if (open && activeIndex >= 0) document.getElementById(`${listId}-option-${activeIndex}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [open, activeIndex, listId]);

  const select = (item) => { setQuery(item.name); setOpen(false); setActiveIndex(-1); onChange({ name: item.name, identifier: item.identifier }); };
  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); setOpen(true);
      if (!options.length) return;
      setActiveIndex((current) => event.key === 'ArrowDown' ? Math.min(current + 1, options.length - 1) : current < 0 ? options.length - 1 : Math.max(current - 1, 0));
    } else if (event.key === 'Enter' && open && activeIndex >= 0 && options[activeIndex]) {
      event.preventDefault(); select(options[activeIndex]);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault(); setQuery(selected?.name || value || ''); setOpen(false); setActiveIndex(-1);
    }
  };

  return <div className="relative text-sm font-medium text-gray-700">
    <label htmlFor={inputId}>{label}{required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}</label>
    <div className="relative mt-1">
      <input id={inputId} ref={inputRef} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-required={required || undefined} aria-activedescendant={open && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-9 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        value={query} placeholder="Search measured quantities" onFocus={() => { setOpen(true); setActiveIndex(-1); }} onChange={(event) => { const text = event.target.value; setQuery(text); setOpen(true); setActiveIndex(-1); if (!text) onChange({ name: '', identifier: '' }); }} onKeyDown={handleKeyDown}
        onBlur={() => { setQuery(selected?.name || value || ''); setOpen(false); setActiveIndex(-1); }} />
      <button type="button" aria-label="Show measured quantity options" tabIndex={-1} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-800" onMouseDown={(event) => event.preventDefault()} onClick={() => { inputRef.current?.focus(); setOpen(true); setActiveIndex(-1); }}><ChevronDown className="h-4 w-4" /></button>
    </div>
    {open && menuPosition && createPortal(<div className="fixed z-[9999] overflow-y-auto overflow-x-hidden rounded-md border border-gray-200 bg-white shadow-lg" style={menuPosition}>
      <ul id={listId} role="listbox" aria-label={`${label} options`} className="py-1 font-normal">
        {options.map((item, index) => <li id={`${listId}-option-${index}`} key={item.identifier} role="option" aria-selected={index === activeIndex} className={`cursor-pointer break-words px-3 py-2 ${index === activeIndex ? 'bg-blue-100 text-blue-900' : 'text-gray-800 hover:bg-gray-100'}`} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)} onClick={() => select(item)}><span className="font-medium">{item.name}</span> <span className="text-gray-500">({termLabel(item)})</span></li>)}
        {!options.length && <li className="px-3 py-2 text-gray-500">No matching measured quantities</li>}
      </ul>
    </div>, document.body)}
  </div>;
}
