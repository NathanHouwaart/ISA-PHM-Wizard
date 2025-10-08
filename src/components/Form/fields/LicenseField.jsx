import React, { useCallback, useEffect, useRef, useState } from 'react';
import Fuse from 'fuse.js';

import { getLicenses } from '../../../services/api';
import { cn } from '../../../utils/utils';
import { BASE_INPUT_CLASSNAME } from './constants';

// Example
// <LicenseField name="license" value={value} onChange={handleChange} />

const MAX_SUGGESTIONS = 10;

const LicenseField = ({
    className = '',
    name,
    value = '',
    onChange,
    placeholder = 'Search and select a license...',
    required = false,
    disabled = false,
    id,
    onBlur: userOnBlur,
    onFocus: userOnFocus,
    ...rest
}) => {
    const [fuse, setFuse] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [isFocused, setIsFocused] = useState(false);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);

    const inputRef = useRef(null);
    const closeTimeoutRef = useRef(null);
    const skipNextSuggestionsRef = useRef(false);

    useEffect(() => {
        let isMounted = true;

        const loadLicenses = async () => {
            try {
                const response = await getLicenses();
                if (!isMounted) return;

                const fuseInstance = new Fuse(response, {
                    keys: ['name', 'licenseId'],
                    threshold: 0.3,
                });

                setFuse(fuseInstance);
            } catch (error) {
                if (isMounted) {
                    // eslint-disable-next-line no-console
                    console.error('Failed to fetch license list', error);
                }
            }
        };

        loadLicenses();

        return () => {
            isMounted = false;
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);

    const updateSuggestions = useCallback(
        (query) => {
            if (!fuse) {
                setSuggestions([]);
                return [];
            }

            const normalized = (query ?? '').trim();
            if (!normalized) {
                setSuggestions([]);
                return [];
            }

            const results = fuse.search(normalized, { limit: MAX_SUGGESTIONS }).map((entry) => entry.item);
            setSuggestions(results);
            return results;
        },
        [fuse]
    );

    useEffect(() => {
        if (!isFocused) {
            return;
        }

        if (skipNextSuggestionsRef.current) {
            skipNextSuggestionsRef.current = false;
            return;
        }

        const matches = updateSuggestions(value ?? '');
        setIsDropdownVisible(matches.length > 0);
    }, [isFocused, updateSuggestions, value]);

    const handleInputChange = (event) => {
        onChange?.(event);
        const matches = updateSuggestions(event.target.value ?? '');
        if (isFocused) {
            setIsDropdownVisible(matches.length > 0);
        }
    };

    const handleFocus = (event) => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
        }

        setIsFocused(true);

        const matches = updateSuggestions(value ?? '');
        setIsDropdownVisible(matches.length > 0);

        userOnFocus?.(event);
    };

    const handleBlur = (event) => {
        closeTimeoutRef.current = setTimeout(() => {
            setIsFocused(false);
            setIsDropdownVisible(false);
        }, 120);

        userOnBlur?.(event);
    };

    const handleKeyDown = (event) => {
        if (!isDropdownVisible) {
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            setIsDropdownVisible(false);
        } else if (event.key === 'Enter' && suggestions.length > 0) {
            event.preventDefault();
            handleSelect(suggestions[0]);
        }
    };

    const handleSelect = (license) => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
        }

        skipNextSuggestionsRef.current = true;

        const syntheticEvent = {
            target: {
                name,
                id: id ?? name,
                type: 'text',
                value: license.name,
            },
        };

        onChange?.(syntheticEvent);
        setSuggestions([]);
        setIsDropdownVisible(false);
    };

    const inputId = id ?? name;
    const inputValue = value ?? '';
    const inputClassName = cn(BASE_INPUT_CLASSNAME, className);

    return (
        <div className="relative">
            <input
                ref={inputRef}
                id={inputId}
                name={name}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                autoComplete="off"
                className={inputClassName}
                {...rest}
            />

            {isDropdownVisible && suggestions.length > 0 && (
                <ul className="absolute z-20 mt-2 w-full max-h-60 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                    {suggestions.map((license) => (
                        <li
                            key={license.licenseId ?? license.name}
                            className="cursor-pointer px-3 py-2 text-sm hover:bg-indigo-50"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleSelect(license)}
                        >
                            <div className="font-medium text-gray-900">{license.name}</div>
                            {license.licenseId && (
                                <div className="text-xs uppercase tracking-wide text-gray-500">{license.licenseId}</div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LicenseField;
