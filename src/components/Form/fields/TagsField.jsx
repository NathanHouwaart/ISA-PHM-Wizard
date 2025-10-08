import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import IconTooltipButton from '../../Widgets/IconTooltipButton';
import { cn } from '../../../utils/utils';
import useCombinedRef from './useCombinedRef';
import { BASE_INPUT_CLASSNAME } from './constants';

// Example
// <TagsField tags={options} value={selected} onAddTag={addTag} onRemoveTag={removeTag} />

const TagsField = ({
    className = '',
    inputRef,
    name,
    onAddTag,
    onRemoveTag,
    placeholder,
    renderTag,
    tags = [],
    value,
}) => {
    const [inputValue, setInputValue] = useState('');
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [containerRef, assignContainerRef] = useCombinedRef(inputRef);
    const dropdownRef = useRef(null);

    const currentTags = Array.isArray(value) ? value : [];

    const formatTagDisplay = (tag) => {
        if (typeof tag === 'string') return tag;
        return `${tag.firstName || ''} ${tag.lastName || ''}`.trim() || tag.name || tag.id;
    };

    const filteredSuggestions = tags.filter((tag) => {
        const displayText = typeof tag === 'string' ? tag : `${tag.firstName || ''} ${tag.lastName || ''}`.trim();
        const matchesInput = displayText.toLowerCase().includes(inputValue.toLowerCase());
        const alreadySelected = currentTags.some(
            (selectedTag) =>
                (typeof selectedTag === 'string' ? selectedTag : selectedTag.id) ===
                (typeof tag === 'string' ? tag : tag.id)
        );
        return matchesInput && !alreadySelected;
    });

    useEffect(() => {
        if (isDropdownVisible && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
        }
    }, [isDropdownVisible, containerRef]);

    useEffect(() => {
        if (tags.length > 0 && inputValue.length > 0) {
            setIsDropdownVisible(true);
        } else if (inputValue.length === 0) {
            setIsDropdownVisible(false);
        }
    }, [inputValue, tags.length]);

    const handleSelect = (suggestion) => {
        onAddTag(suggestion);
        setInputValue('');
        setHighlightedIndex(-1);
    };

    const handleToggleDropdown = () => {
        if (inputValue.length > 0 || isDropdownVisible) {
            setIsDropdownVisible((prev) => !prev);
            if (!isDropdownVisible) {
                setHighlightedIndex(-1);
            }
        }
    };

    const handleInputFocus = () => {
        if (tags.length > 0 && inputValue.length > 0) {
            setIsDropdownVisible(true);
        }
    };

    const handleInputBlur = (event) => {
        if (!dropdownRef.current?.contains(event.relatedTarget)) {
            setTimeout(() => setIsDropdownVisible(false), 150);
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (isDropdownVisible && highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
                handleSelect(filteredSuggestions[highlightedIndex]);
            } else if (inputValue.trim()) {
                const trimmed = inputValue.trim();
                if (!currentTags.some((tag) => formatTagDisplay(tag) === trimmed)) {
                    onAddTag(trimmed);
                    setInputValue('');
                }
            }
        } else if (event.key === 'ArrowDown' && isDropdownVisible) {
            event.preventDefault();
            setHighlightedIndex((prev) => Math.min(prev + 1, filteredSuggestions.length - 1));
        } else if (event.key === 'ArrowUp' && isDropdownVisible) {
            event.preventDefault();
            setHighlightedIndex((prev) => Math.max(prev - 1, -1));
        } else if (event.key === 'Escape') {
            setIsDropdownVisible(false);
            setHighlightedIndex(-1);
        } else if (event.key === 'Backspace' && inputValue === '' && currentTags.length > 0) {
            onRemoveTag(currentTags[currentTags.length - 1]);
        }
    };

    return (
        <div className={cn('relative w-full', className)}>
            <div
                ref={assignContainerRef}
                className={cn(
                    BASE_INPUT_CLASSNAME,
                    'flex flex-wrap items-center gap-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500'
                )}
            >
                {currentTags.map((tag, index) => {
                    const tagKey = (typeof tag === 'string' ? tag : tag.id) ?? index;
                    if (typeof renderTag === 'function') {
                        return (
                            <React.Fragment key={`${tagKey}-${index}`}>
                                {renderTag(tag, {
                                    index,
                                    removeTag: () => onRemoveTag(tag),
                                    formatTagDisplay,
                                })}
                            </React.Fragment>
                        );
                    }

                    return (
                        <span
                            key={`${tagKey}-${index}`}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 flex-shrink-0"
                        >
                            {index + 1}. {formatTagDisplay(tag)}
                            <IconTooltipButton
                                icon={X}
                                tooltipText={`Remove ${formatTagDisplay(tag)}`}
                                onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    onRemoveTag(tag);
                                }}
                                className="ml-2 -mr-0.5 h-4 w-4"
                                data-testid={`${name}-remove-${tagKey}-${index}`}
                            />
                        </span>
                    );
                })}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    className="flex-grow min-w-[120px] bg-transparent py-0 border-0 focus:ring-0 focus:border-0 outline-none"
                    placeholder={placeholder}
                />
                {tags.length > 0 && (
                    <IconTooltipButton
                        icon={isDropdownVisible ? ChevronUp : ChevronDown}
                        tooltipText={isDropdownVisible ? 'Hide suggestions' : 'Show suggestions'}
                        onClick={(event) => {
                            event.stopPropagation();
                            handleToggleDropdown();
                        }}
                        className="flex-shrink-0 p-1 text-gray-400"
                        data-testid={`${name}-toggle-dropdown`}
                    />
                )}
            </div>
            {isDropdownVisible &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        className="fixed z-[9999] bg-white border border-gray-300 rounded-md shadow-xl max-h-60 overflow-auto"
                        style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            width: dropdownPosition.width,
                            zIndex: 9999,
                        }}
                    >
                        {filteredSuggestions.length > 0 ? (
                            filteredSuggestions.map((suggestion, index) => (
                                <div
                                    key={`${typeof suggestion === 'string' ? suggestion : suggestion.id}-suggestion-${index}`}
                                    className={`px-4 py-2 cursor-pointer hover:bg-blue-100 ${
                                        index === highlightedIndex ? 'bg-blue-500 text-white hover:bg-blue-600' : ''
                                    }`}
                                    onMouseDown={(event) => {
                                        event.preventDefault();
                                        handleSelect(suggestion);
                                    }}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                >
                                    {formatTagDisplay(suggestion)}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-2 text-sm text-gray-500 italic">
                                {inputValue ? `No matches found for "${inputValue}"` : 'No more options available'}
                            </div>
                        )}
                    </div>,
                    document.body
                )}
        </div>
    );
};

export default TagsField;
