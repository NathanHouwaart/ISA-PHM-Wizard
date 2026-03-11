import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GripVertical, Mail, X, ChevronDown, ChevronUp } from 'lucide-react';
import IconToolTipButton from '../../Widgets/IconTooltipButton';
import EmailPromptModal from '../../Publication/EmailPromptModal';
import { useProjectActions, useProjectData } from '../../../contexts/GlobalDataContext';
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
    const [showEmailPrompt, setShowEmailPrompt] = useState(false);
    const [pendingCorrespondingAuthor, setPendingCorrespondingAuthor] = useState(null);

    const { contacts } = useProjectData();
    const { setContacts } = useProjectActions();
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);
    const containerRef = useRef(null);
    const rafRef = useRef(null);
    const tickingRef = useRef(false);

    const currentAuthors = Array.isArray(value) ? value : [];

    const filteredAuthors = tags.filter((author) => {
        const authorName = `${author.firstName || ''} ${author.lastName || ''}`.trim();
        const live = contacts.find(c => c.id === author.id) || {};
        const emailToCheck = (live.email ?? author.email ?? '').toLowerCase();
        const affiliationToCheck = (live.affiliation ?? author.affiliation ?? '').toLowerCase();
        const matchesInput =
            authorName.toLowerCase().includes(inputValue.toLowerCase()) ||
            emailToCheck.includes(inputValue.toLowerCase()) ||
            affiliationToCheck.includes(inputValue.toLowerCase());
        const notAlreadySelected = !currentAuthors.some((existingAuthor) => existingAuthor.id === author.id);
        return matchesInput && notAlreadySelected;
    });

    const updateDropdownPosition = () => {
        if (!inputRef.current) return;
        const rect = inputRef.current.getBoundingClientRect();
        const gap = 6; // px spacing between input and dropdown
        setDropdownPosition({
            top: rect.bottom + window.scrollY + gap,
            left: rect.left + window.scrollX,
            width: rect.width,
        });
    };

    useEffect(() => {
        if (isDropdownVisible) {
            updateDropdownPosition();
        }
    }, [isDropdownVisible]);

    // Reposition on scroll/resize/orientationchange (handles zoom + scroll).
    useEffect(() => {
        if (!isDropdownVisible) return undefined;

        const handleTickedUpdate = () => {
            tickingRef.current = false;
            updateDropdownPosition();
        };

        const handler = () => {
            if (tickingRef.current) return;
            tickingRef.current = true;
            rafRef.current = window.requestAnimationFrame(handleTickedUpdate);
        };

        window.addEventListener('scroll', handler, { passive: true });
        window.addEventListener('resize', handler);
        window.addEventListener('orientationchange', handler);

        return () => {
            window.removeEventListener('scroll', handler, { passive: true });
            window.removeEventListener('resize', handler);
            window.removeEventListener('orientationchange', handler);
            if (rafRef.current) {
                window.cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            tickingRef.current = false;
        };
    }, [isDropdownVisible]);

    const addAuthor = (author) => {
        const updatedAuthors = [...currentAuthors, author];
        onChange({ target: { name, value: updatedAuthors } });
        setInputValue('');
        setIsDropdownVisible(false);
    };

    const removeAuthor = (authorId) => {
        const updatedAuthors = currentAuthors.filter((author) => author.id !== authorId);
        onChange({ target: { name, value: updatedAuthors } });
        // If the removed author was the corresponding author, clear the corresponding
        // selection instead of implicitly assigning another author. Corresponding
        // author must be set explicitly by user action.
        if (correspondingAuthorId === authorId && onCorrespondingAuthorChange) {
            onCorrespondingAuthorChange(null);
        }
    };

    const toggleCorrespondingAuthor = (authorId) => {
        if (!onCorrespondingAuthorChange) return;
        
        // If unsetting (already corresponding), just unset
        if (correspondingAuthorId === authorId) {
            onCorrespondingAuthorChange(null);
            return;
        }
        
        // If setting as corresponding, prefer the live global contact email (contacts)
        const authorInValue = currentAuthors.find(a => a.id === authorId);
        const liveContact = contacts.find(c => c.id === authorId);
        const effectiveEmail = liveContact?.email ?? authorInValue?.email;
        if (!authorInValue) return;

        if (!effectiveEmail || effectiveEmail.trim() === '') {
            // No email: show prompt modal (pass the local author object)
            setPendingCorrespondingAuthor(authorInValue);
            setShowEmailPrompt(true);
        } else {
            // Has email: set immediately
            onCorrespondingAuthorChange(authorId);
        }
    };

    const handleEmailSave = (email) => {
        if (!pendingCorrespondingAuthor) return;
        
        // Capture the author ID before clearing state (needed for setTimeout closure)
        const authorId = pendingCorrespondingAuthor.id;
        
        // Update global contacts first - this ensures the tags prop is updated
        setContacts(prevContacts =>
            prevContacts.map(c =>
                c.id === authorId
                    ? { ...c, email }
                    : c
            )
        );
        
        // Update the author in local state using the current value, not stale closure
        // CRITICAL: We must map over value prop directly, not currentAuthors which might be stale
        const updatedAuthors = (Array.isArray(value) ? value : []).map(a =>
            a.id === authorId
                ? { ...a, email }
                : a
        );
        
        onChange({ target: { name, value: updatedAuthors } });
        
        // Close modal and clear pending
        setShowEmailPrompt(false);
        setPendingCorrespondingAuthor(null);

        // Defer setting corresponding author to the next tick so the modal unmounts
        // and any portal/z-index ordering updates settle (ensures UI reflects change)
        setTimeout(() => {
            onCorrespondingAuthorChange(authorId);
        }, 0);
    };

    const handleEmailCancel = () => {
        setShowEmailPrompt(false);
        setPendingCorrespondingAuthor(null);
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
                    filteredAuthors.map((author, index) => {
                        const live = contacts.find(c => c.id === author.id) || {};
                        const dropdownEmail = live.email ?? author.email;
                        const dropdownAffiliation = live.affiliation ?? author.affiliation;

                        return (
                            <div
                                key={author.id}
                                className={cn(
                                    'px-4 py-3 cursor-pointer hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 transition-colors duration-150',
                                    // Use a lighter highlight so the text remains readable when selected
                                    index === highlightedIndex ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200' : ''
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
                                {dropdownEmail && <div className="text-xs text-gray-500">{dropdownEmail}</div>}
                                {dropdownAffiliation && <div className="text-xs text-gray-500">{dropdownAffiliation}</div>}
                            </div>
                        );
                    })
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
                        if (filteredAuthors.length > 0) {
                            setIsDropdownVisible(true);
                        }
                    }}
                    onBlur={(event) => {
                        const nextFocusTarget = event.relatedTarget;
                        const focusStayedInsideField = containerRef.current?.contains(nextFocusTarget);
                        const focusMovedToDropdown = dropdownRef.current?.contains(nextFocusTarget);

                        if (!focusStayedInsideField && !focusMovedToDropdown) {
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
                            // Toggle visibility and update dropdown position immediately
                            setIsDropdownVisible((prev) => {
                                const next = !prev;
                                if (next && inputRef.current) {
                                    const rect = inputRef.current.getBoundingClientRect();
                                    const gap = 6;
                                    setDropdownPosition({
                                        top: rect.bottom + window.scrollY + gap,
                                        left: rect.left + window.scrollX,
                                        width: rect.width,
                                    });
                                    // focus the input when opening
                                    inputRef.current.focus();
                                }
                                return next;
                            });
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
                        // Prefer live data from global contacts so UI reflects edits/removals
                        const liveContact = contacts.find(c => c.id === author.id);
                        const displayEmail = liveContact ? liveContact.email : author.email;
                        const displayAffiliation = liveContact ? liveContact.affiliation : author.affiliation;
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
                                    // Primary author: use solid background with subtle left accent instead of gradient
                                    index === 0 ? 'shadow-md bg-white border-l-4 border-indigo-100' : 'shadow-sm',
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
                                        {displayEmail ? (
                                            <div className="text-sm text-gray-600">{displayEmail}</div>
                                        ) : null}
                                        {displayAffiliation ? (
                                            <div className="text-sm text-indigo-600 font-medium mt-0.5">{displayAffiliation}</div>
                                        ) : null}
                                    </div>
                                    <div className="flex flex-col gap-1 flex-shrink-0">
                                        <IconToolTipButton
                                            icon={Mail}
                                            tooltipText={
                                                isCorresponding
                                                    ? 'Unset corresponding author'
                                                    : 'Set as corresponding author'
                                            }
                                            onClick={() => toggleCorrespondingAuthor(author.id)}
                                            size="sm"
                                            className={
                                                isCorresponding
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'text-gray-400'
                                            }
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
            
            {/* Email prompt modal */}
            <EmailPromptModal
                isOpen={showEmailPrompt}
                authorName={pendingCorrespondingAuthor ? `${pendingCorrespondingAuthor.firstName || ''} ${pendingCorrespondingAuthor.lastName || ''}`.trim() : ''}
                onSave={handleEmailSave}
                onCancel={handleEmailCancel}
            />
        </div>
    );
};

export default AuthorsField;
