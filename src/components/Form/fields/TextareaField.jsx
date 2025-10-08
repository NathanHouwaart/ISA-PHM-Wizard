import React from 'react';
import { cn } from '../../../utils/utils';
import { BASE_INPUT_CLASSNAME } from './constants';

// Example
// <TextareaField name="description" rows={4} value={value} onChange={handleChange} />

const TextareaField = ({
    className = '',
    example,
    name,
    onChange,
    placeholder,
    required,
    rows = 3,
    value,
}) => (
    <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder || example}
        required={required}
        rows={rows}
        className={cn(BASE_INPUT_CLASSNAME, 'resize-vertical', className)}
    />
);

export default TextareaField;
