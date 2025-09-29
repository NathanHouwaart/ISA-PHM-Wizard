import { X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { formatContactName } from "../../utils/utils";

export function TagInput({
  label,
  tags,
  onAddTag,
  onRemoveTag,
  placeholder,
  required = false,
  availableOptions,
}) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const suggestionsRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputValue.length > 0 && availableOptions?.length > 0) {
      const filtered = availableOptions
        .filter(contact =>
          formatContactName(contact).toLowerCase().includes(inputValue.toLowerCase()) &&
          !tags.some(tag => tag.id === contact.id)
        )
        .slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue, availableOptions, tags]);


  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const selectSuggestion = (suggestion) => {
    onAddTag(suggestion);
    setInputValue('');
    setShowSuggestions(false);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        selectSuggestion(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }, 100);
  };

  const handleAddButtonClick = () => {
    const foundContact = availableOptions.find(contact =>
      formatContactName(contact).toLowerCase() === inputValue.trim().toLowerCase()
    );
    if (foundContact) {
      onAddTag(foundContact);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <label className={`text-sm ml-1 font-medium text-gray-700 w-24 text-right`}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className={`flex flex-wrap gap-2 ${tags.length && 'mb-2'}`}>
        {tags.map((tag, index) => (
          <span
            key={tag + index}
            className="inline-flex items-center px-3 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
          >
            {tag}
            <button
              type="button"
              onClick={() => onRemoveTag(tag)}
              className="ml-2 -mr-0.5 h-4 w-4 inline-flex items-center justify-center rounded-full bg-indigo-200 text-indigo-600 hover:bg-indigo-300 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <span className="sr-only">Remove {tag}</span>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={handleInputBlur}
          className="w-full px-3 text-base bg-white py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none"
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-controls="autocomplete-list"
          role="combobox"
          aria-expanded={showSuggestions}
        />
        <button
          type="button"
          onClick={handleAddButtonClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Add
        </button>
      </div>

      {showSuggestions && (
        <ul
          ref={suggestionsRef}
          id="autocomplete-list"
          role="listbox"
          className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-auto"
        >
          {suggestions.length > 0 ? (
            suggestions.map((contact, index) => (
              <li
                key={contact.id}
                role="option"
                aria-selected={index === highlightedIndex}
                className={`px-4 py-2 cursor-pointer hover:bg-blue-100 ${
                  index === highlightedIndex ? 'bg-blue-500 text-white hover:bg-blue-600' : ''
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(contact);
                }}
              >
                {formatContactName(contact)}
              </li>
            ))
          ) : (
            <li className="px-4 py-2 text-sm text-gray-500 italic">No contacts found. Add them on the contacts page.</li>
          )}
        </ul>
      )}
    </div>
  );
}
