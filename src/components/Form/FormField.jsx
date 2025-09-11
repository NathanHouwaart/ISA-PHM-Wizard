import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import AnimatedTooltip, { AnimatedTooltipExample, AnimatedTooltipExplanation } from '../Tooltip/AnimatedTooltipProvider';
import LicensePicker from './LicensePicker';
import { cn } from '../../utils/utils';
import TooltipButton from '../Widgets/TooltipButton';
import { X } from 'lucide-react';

function FormField({
    name,
    value,
    label,
    placeholder,
    onChange,
    commitOnBlur = false,
    required,
    explanation,
    example,
    type = 'text',
    tags = [],
    onAddTag,
    onRemoveTag,
    rows = 3,
    className = '',
}) {
    const [showTooltip, setShowTooltip] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    const handleTooltipToggle = () => {
        setShowTooltip(!showTooltip);
    };

    // Ensure value is always an array for tags type
    const currentTags = type === 'tags' ? (Array.isArray(value) ? value : []) : [];

    // Filter suggestions based on input and current tags
    const filteredSuggestions = tags.filter(tag => {
        const tagText = typeof tag === 'string' ? tag : `${tag.firstName || ''} ${tag.lastName || ''}`.trim();
        const matchesInput = tagText.toLowerCase().includes(inputValue.toLowerCase());
        const notAlreadySelected = !currentTags.some(selectedTag => 
            (typeof selectedTag === 'string' ? selectedTag : selectedTag.id) === 
            (typeof tag === 'string' ? tag : tag.id)
        );
        return matchesInput && notAlreadySelected;
    });

    const formatTagDisplay = (tag) => {
        if (typeof tag === 'string') return tag;
        return `${tag.firstName || ''} ${tag.lastName || ''}`.trim() || tag.name || tag.id;
    };

    // Update dropdown position when it opens
    useEffect(() => {
        if (showDropdown && inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, [showDropdown]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (showDropdown && highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
                selectSuggestion(filteredSuggestions[highlightedIndex]);
            } else if (inputValue.trim()) {
                const newTag = inputValue.trim();
                if (!currentTags.some(tag => formatTagDisplay(tag) === newTag)) {
                    onAddTag(newTag);
                    setInputValue('');
                }
            }
        } else if (e.key === 'ArrowDown' && showDropdown) {
            e.preventDefault();
            setHighlightedIndex(prev => Math.min(prev + 1, filteredSuggestions.length - 1));
        } else if (e.key === 'ArrowUp' && showDropdown) {
            e.preventDefault();
            setHighlightedIndex(prev => Math.max(prev - 1, -1));
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
            setHighlightedIndex(-1);
        } else if (e.key === 'Backspace' && inputValue === '' && currentTags.length > 0) {
            onRemoveTag(currentTags[currentTags.length - 1]);
        }
    };

    const selectSuggestion = (suggestion) => {
        onAddTag(suggestion);
        setInputValue('');
        setHighlightedIndex(-1);
    };

    const toggleDropdown = () => {
        // Only allow toggle if there's input text or already showing
        if (inputValue.length > 0 || showDropdown) {
            setShowDropdown(!showDropdown);
            if (!showDropdown) {
                setHighlightedIndex(-1);
            }
        }
    };

    useEffect(() => {
        if (type === 'tags' && tags.length > 0 && inputValue.length > 0) {
            setShowDropdown(true);
        } else if (inputValue.length === 0) {
            setShowDropdown(false);
        }
    }, [inputValue, type, tags.length]);

    const handleInputFocus = () => {
        if (tags.length > 0 && inputValue.length > 0) {
            setShowDropdown(true);
        }
    // mark editing state for default inputs
    if (!commitOnBlur) return;
    setIsEditing(true);
    };

    const handleInputBlur = (e) => {
        if (!dropdownRef.current?.contains(e.relatedTarget)) {
            setTimeout(() => setShowDropdown(false), 150);
        }
        // If commit-on-blur behavior requested, commit value on blur
        if (commitOnBlur && inputRef.current && inputRef.current === e.target) {
            // Stop editing and call onChange only if value changed
            setIsEditing(false);
            if (String(inputValue) !== String(value) && typeof onChange === 'function') {
                // synthesize an event-like object for compatibility
                const syntheticEvent = { target: { value: inputValue } };
                onChange(syntheticEvent);
            }
        }
    };

    const renderDropdown = () => {
        if (!showDropdown) return null;

        return createPortal(
            <div
                ref={dropdownRef}
                className="fixed z-[9999] bg-white border border-gray-300 rounded-md shadow-xl max-h-60 overflow-auto"
                style={{
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    width: dropdownPosition.width,
                    zIndex: 9999
                }}
            >
                {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map((suggestion, index) => (
                        <div
                            key={(typeof suggestion === 'string' ? suggestion : suggestion.id) + '-suggestion-' + index}
                            className={`px-4 py-2 cursor-pointer hover:bg-blue-100 ${
                                index === highlightedIndex ? 'bg-blue-500 text-white hover:bg-blue-600' : ''
                            }`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                selectSuggestion(suggestion);
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
        );
    };

    const renderInput = () => {
        const baseClasses = "w-full px-3 text-base bg-white py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none";
        switch (type) {
            case 'tags':
                return (
                    <div className="relative w-full">
                        <div 
                            ref={inputRef}
                            className="w-full flex flex-wrap items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white"
                        >
                            {currentTags.map((tag, index) => (
                                <span
                                    key={(typeof tag === 'string' ? tag : tag.id) + '-' + index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 flex-shrink-0"
                                >
                                    {index+1}. {formatTagDisplay(tag)}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onRemoveTag(tag);
                                        }}
                                        className="ml-2 -mr-0.5 h-4 w-4 inline-flex items-center justify-center rounded-full bg-indigo-200 text-indigo-600 hover:bg-indigo-300 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                    >
                                        <span className="sr-only">Remove {formatTagDisplay(tag)}</span>
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={handleInputFocus}
                                onBlur={handleInputBlur}
                                className="flex-grow min-w-[120px] bg-transparent py-0 border-0 focus:ring-0 focus:border-0 outline-none"
                                placeholder={placeholder}
                            />
                            {tags.length > 0 && (
                                <button
                                    type="button"
                                    onClick={toggleDropdown}
                                    className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    {showDropdown ? (
                                        <ChevronUp className="w-4 h-4" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4" />
                                    )}
                                </button>
                            )}
                        </div>
                        {renderDropdown()}
                    </div>
                );

            // ... rest of the cases remain the same
            case 'textarea':
                return (
                    <textarea
                        name={name}
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder || example}
                        required={required}
                        rows={rows}
                        className={cn(baseClasses, "resize-vertical", className)}
                    />
                );
            case 'select':
                return (
                    <select
                        name={name}
                        value={value}
                        onChange={onChange}
                        required={required}
                        className={cn(baseClasses, className)}
                    >
                        <option value="">{placeholder || "Select an option"}</option>
                        {tags && tags.map((option, index) => (
                            <option key={`${option}-${index}`} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                );
            case 'multi-select':
                return (
                    <div className="flex flex-wrap gap-2 py-2">
                        {tags.map((option) => {
                            const isSelected = value && value.includes(option);
                            const handleToggle = () => {
                                if (isSelected) {
                                    onRemoveTag(option);
                                } else {
                                    onAddTag(option);
                                }
                            };

                            return (
                                <div
                                    key={option}
                                    className={`flex items-center px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors duration-200 border-2
        ${isSelected ? 'bg-indigo-100 text-indigo-800 border-indigo-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'}
      `}
                                    onClick={handleToggle}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={handleToggle}
                                        className="sr-only"
                                    />
                                    <span>{option}</span>
                                </div>
                            );
                        })}
                    </div>
                );
            case 'license':
                return (
                    <LicensePicker
                        name={name}
                        type="license"
                        value={value}
                        placeholder={placeholder}
                        onChange={onChange}
                        required={required}
                        className={cn(baseClasses, className)}
                    />
                )
            default:
                return (
                    <input
                        ref={inputRef}
                        name={name}
                        type={type}
                        value={commitOnBlur ? (isEditing ? inputValue : (value ?? '')) : (value ?? '')}
                        onChange={(e) => {
                            if (commitOnBlur) {
                                setInputValue(e.target.value);
                            } else {
                                if (typeof onChange === 'function') onChange(e);
                            }
                        }}
                        onFocus={() => {
                            // initialize buffer when focusing
                            if (commitOnBlur) {
                                setInputValue(value ?? '');
                                setIsEditing(true);
                            }
                            if (typeof inputRef.current?.focus === 'function') {
                                /* noop, keep ref */
                            }
                        }}
                        onBlur={handleInputBlur}
                        onKeyDown={(e) => {
                            if (commitOnBlur && e.key === 'Enter') {
                                e.preventDefault();
                                // commit on Enter by blurring which triggers handleInputBlur
                                e.target.blur();
                            }
                        }}
                        placeholder={placeholder || example}
                        required={required}
                        className={cn(baseClasses, className)}
                    />
                );
        }
    };

    return (
        <div>
            <label className={`text-sm ml-1 font-medium text-gray-700 w-24 text-right ${type === 'textarea' ? 'pt-3' : ''}`}>
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="flex flex-grow w-full pt-0.5 ml-0">
                {renderInput()}
                {explanation &&
                    <TooltipButton
                        tooltipText={explanation}
                        onClick={handleTooltipToggle}
                        className={`bg-transparent h-10 w-10 p-0 ml-3 mr-1 flex items-center justify-center group hover:bg-gray-200 rounded-full transition-colors duration-200 flex-shrink-0 ${type === 'textarea' ? 'mt-1' : ''}`}
                    >
                        <HelpCircle className="h-5 w-5 text-gray-500 group-hover:text-blue-500 transition-colors duration-200" />
                    </TooltipButton>
                }
            </div>

            {explanation && <AnimatedTooltip isVisible={showTooltip}>
                <AnimatedTooltipExplanation>{explanation}</AnimatedTooltipExplanation>
                <AnimatedTooltipExample>{example}</AnimatedTooltipExample>
            </AnimatedTooltip>}
        </div>
    );
}

export default FormField;