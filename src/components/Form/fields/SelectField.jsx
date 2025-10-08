import React from 'react';
import { cn } from '../../../utils/utils';
import { BASE_INPUT_CLASSNAME } from './constants';

// Example
// <SelectField name="category" tags={options} value={value} onChange={handleChange} />

const SelectField = ({
    className = '',
    name,
    onChange,
    placeholder,
    required,
    tags = [],
    value,
}) => (
    <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className={cn(BASE_INPUT_CLASSNAME, className)}
    >
        <option value="">{placeholder || 'Select an option'}</option>
        {tags.map((option, index) => {
            const optionValue = typeof option === 'string' ? option : option.value;
            const optionLabel = typeof option === 'string' ? option : option.label ?? option.value;

            if (optionValue === undefined || optionValue === null) {
                return null;
            }

            return (
                <option key={`${optionValue}-${index}`} value={optionValue}>
                    {optionLabel}
                </option>
            );
        })}
    </select>
);

export default SelectField;
