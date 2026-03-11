import React, { useState } from 'react';
import { cn } from '../../../utils/utils';
import useCombinedRef from './useCombinedRef';
import { BASE_INPUT_CLASSNAME } from './constants';

// Example
// <TextInputField name="title" value={value} onChange={handleChange} />

/**
 * Handles standard text-like inputs with optional commit-on-blur buffering.
 */
const TextInputField = ({
    className = '',
    commitOnBlur = false,
    example,
    inputRef,
    name,
    onChange,
    placeholder,
    required,
    type = 'text',
    value,
    ...rest
}) => {
    const [buffer, setBuffer] = useState(value ?? '');
    const [isEditing, setIsEditing] = useState(false);
    const [, assignRef] = useCombinedRef(inputRef);

    const displayValue = commitOnBlur ? (isEditing ? buffer : value ?? '') : value ?? '';

    const handleBlur = () => {
        if (!commitOnBlur) return;

        setIsEditing(false);

        if (String(buffer ?? '') !== String(value ?? '') && typeof onChange === 'function') {
            onChange({
                target: {
                    name,
                    value: buffer,
                },
            });
        }
    };

    return (
        <input
            ref={assignRef}
            name={name}
            type={type}
            value={displayValue}
            onFocus={() => {
                if (commitOnBlur) {
                    setBuffer(value ?? '');
                    setIsEditing(true);
                }
            }}
            onBlur={handleBlur}
            onChange={(event) => {
                if (commitOnBlur) {
                    setBuffer(event.target.value);
                } else if (typeof onChange === 'function') {
                    onChange(event);
                }
            }}
            onKeyDown={(event) => {
                if (commitOnBlur && event.key === 'Enter') {
                    event.preventDefault();
                    event.currentTarget.blur();
                }
            }}
            placeholder={placeholder || example}
            required={required}
            className={cn(BASE_INPUT_CLASSNAME, className)}
            {...rest}
        />
    );
};

export default TextInputField;
