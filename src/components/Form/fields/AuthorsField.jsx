import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GripVertical, Mail, X, ChevronDown, ChevronUp } from 'lucide-react';
import IconToolTipButton from '../../Widgets/IconTooltipButton';
import { cn } from '../../../utils/utils';
import { BASE_INPUT_CLASSNAME } from './constants';

// Example
// <AuthorsField name="authors" value={authors} tags={contacts} onChange={handleChange} />

const AuthorsField = ({
    className = '',
    correspondingAuthorId,
    name,
    onChange,
    onCorrespondingAuthorChange,
    placeholder = 'Search and add authors...',
    tags = [],
    value = [],
}) => {
    const [inputValue, setInputValue] = useState('');
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    const inputRef = useRef(null);
    const dropdownRef = useRef(null);
    const containerRef = useRef(null);

    const currentAuthors = Array.isArray(value) ? value : [];

    const filteredAuthors = tags.filter((author) => {
        const authorName = `${author.firstName || ''} ${author.lastName || ''}`.trim();
        const matchesInput =
            authorName.toLowerCase().includes(inputValue.toLowerCase()) ||
            author.email?.toLowerCase().includes(inputValue.toLowerCase()) ||
            author.affiliation?.toLowerCase().includes(inputValue.toLowerCase());
        const notAlreadySelected = !currentAuthors.some((existingAuthor) => existingAuthor.id === author.id);
        return matchesInput && notAlreadySelected;
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
    }, [isDropdownVisible]);

    const addAuthor = (author) => {
        const updatedAuthors = [...currentAuthors, author];
        onChange({ target: { name, value: updatedAuthors } });
        setInputValue('');
        setIsDropdownVisible(false);

        if (currentAuthors.length === 0 && !correspondingAuthorId && onCorrespondingAuthorChange) {
            onCorrespondingAuthorChange(author.id);
        }
    };

    const removeAuthor = (authorId) => {
        const updatedAuthors = currentAuthors.filter((author) => author.id !== authorId);
        onChange({ target: { name, value: updatedAuthors } });

        if (correspondingAuthorId === authorId && onCorrespondingAuthorChange) {
            const [first] = updatedAuthors;
            onCorrespondingAuthorChange(first ? first.id : null);
        }
    };

    const toggleCorrespondingAuthor = (authorId) => {
        if (!onCorrespondingAuthorChange) return;
        onCorrespondingAuthorChange(correspondingAuthorId === authorId ? null : authorId);
    };

    const reorderAuthors = (fromIndex, toIndex) => {
        const updatedAuthors = [...currentAuthors];
        const [movedAuthor] = updatedAuthors.splice(fromIndex, 1);
        updatedAuthors.splice(toIndex, 0, movedAuthor);
        onChange({ target: { name, value: updatedAuthors } });
    };

    const handleDragStart = (event, index) => {
        setDraggedIndex(index);
        event.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (event, index) => {
        event.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        reorderAuthors(draggedIndex, index);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (isDropdownVisible && highlightedIndex >= 0 && highlightedIndex < filteredAuthors.length) {
                addAuthor(filteredAuthors[highlightedIndex]);
            }
        } else if (event.key === 'ArrowDown' && isDropdownVisible) {
            event.preventDefault();
            setHighlightedIndex((prev) => Math.min(prev + 1, filteredAuthors.length - 1));
        } else if (event.key === 'ArrowUp' && isDropdownVisible) {
            event.preventDefault();
            setHighlightedIndex((prev) => Math.max(prev - 1, -1));
        } else if (event.key === 'Escape') {
            setIsDropdownVisible(false);
            setHighlightedIndex(-1);
        }
    };

    const getContributionLabel = (index, total) => {
        if (total === 1) return 'Sole Author';
        if (index === 0) return 'Primary Author';
        // Treat all non-primary authors as generic authors rather than
        // marking the last one specially as a "Contributing Author".
        return `Contributing Author`;
    };

    const renderDropdown = () => {
        if (!isDropdownVisible) return null;

        return createPortal(
            <div
                ref={dropdownRef}
                className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto"
                style={{
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    width: dropdownPosition.width,
                    zIndex: 9999,
                }}
            >
                {filteredAuthors.length > 0 ? (
                    filteredAuthors.map((author, index) => (
                        <div
                            key={author.id}
                            className={cn(
                                'px-4 py-3 cursor-pointer hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 transition-colors duration-150',
                                index === highlightedIndex ? 'bg-indigo-600 text-white hover:bg-indigo-500' : ''
                            )}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                addAuthor(author);
                            }}
                            onMouseEnter={() => setHighlightedIndex(index)}
                        >
                            <div className="font-medium text-sm">
                                {author.firstName} {author.lastName}
                            </div>
                            {author.email && <div className="text-xs text-gray-500">{author.email}</div>}
                            {author.affiliation && <div className="text-xs text-gray-500">{author.affiliation}</div>}
                        </div>
                    ))
                ) : (
                    <div className="px-4 py-3 text-sm text-gray-500 italic">
                        No matches found for &ldquo;{inputValue}&rdquo;
                    </div>
                )}
            </div>,
            document.body
        );
    };

    return (
        <div ref={containerRef} className={cn('space-y-3', className)}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(event) => {
                        const { value: nextValue } = event.target;
                        setInputValue(nextValue);
                        setIsDropdownVisible(nextValue.length > 0);
                    }}
                    onFocus={() => {
                        if (inputValue.length > 0) {
                            setIsDropdownVisible(true);
                        }
                    }}
                    onBlur={(event) => {
                        if (!dropdownRef.current?.contains(event.relatedTarget)) {
                            setTimeout(() => setIsDropdownVisible(false), 150);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={cn(BASE_INPUT_CLASSNAME, className)}
                />
                <div className="absolute inset-y-0 right-2 flex items-center">
                    <IconToolTipButton
                        icon={isDropdownVisible ? ChevronUp : ChevronDown}
                        tooltipText={isDropdownVisible ? 'Hide suggestions' : 'Show suggestions'}
                        onClick={(event) => {
                            event.preventDefault();
                            setIsDropdownVisible((prev) => !prev);
                            if (!isDropdownVisible && inputRef.current) {
                                inputRef.current.focus();
                            }
                        }}
                        size="sm"
                        className="text-gray-400"
                    />
                </div>
                {renderDropdown()}
            </div>

            {currentAuthors.length > 0 ? (
                <div className="space-y-3">
                    {currentAuthors.map((author, index) => {
                        const isCorresponding = correspondingAuthorId === author.id;

                        return (
                            <div
                                key={author.id}
                                draggable
                                onDragStart={(event) => handleDragStart(event, index)}
                                onDragOver={(event) => handleDragOver(event, index)}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                    'bg-white border-2 rounded-lg p-3 cursor-move transition-all',
                                    draggedIndex === index ? 'opacity-50 border-indigo-400' : 'border-gray-200 hover:border-indigo-300',
                                    index === 0 ? 'shadow-md bg-gradient-to-r from-indigo-50 to-white' : 'shadow-sm',
                                    isCorresponding ? 'ring-2 ring-emerald-400 ring-offset-1' : ''
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <GripVertical className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                            <span
                                                className={cn(
                                                    'text-xs font-bold px-2 py-0.5 rounded-full',
                                                    index === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                                                )}
                                            >
                                                {getContributionLabel(index, currentAuthors.length)}
                                            </span>
                                            <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                                            {isCorresponding && (
                                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white flex items-center gap-1">
                                                    <Mail className="w-3 h-3" />
                                                    Corresponding
                                                </span>
                                            )}
                                        </div>
                                        <div className="font-semibold text-gray-800">
                                            {author.firstName} {author.lastName}
                                        </div>
                                        <div className="text-sm text-gray-600">{author.email}</div>
                                        {author.affiliation && (
                                            <div className="text-sm text-indigo-600 font-medium mt-0.5">{author.affiliation}</div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1 flex-shrink-0">
                                        <IconToolTipButton
                                            icon={Mail}
                                            tooltipText={isCorresponding ? 'Unset corresponding author' : 'Set as corresponding author'}
                                            onClick={() => toggleCorrespondingAuthor(author.id)}
                                            size="sm"
                                            className={isCorresponding ? 'bg-emerald-500 text-white' : 'text-gray-400'}
                                            data-testid={`${name}-corresponding-${author.id}`}
                                        />
                                        <IconToolTipButton
                                            icon={X}
                                            tooltipText="Remove author"
                                            onClick={() => removeAuthor(author.id)}
                                            size="sm"
                                            className="text-gray-400"
                                            data-testid={`${name}-remove-${author.id}`}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                    <p className="text-sm">No authors selected yet</p>
                    <p className="text-xs mt-1">Search and add authors to begin</p>
                </div>
            )}
        </div>
    );
};

export default AuthorsField;
