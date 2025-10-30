import React from 'react';
import { cn } from '../../../utils/utils';
import { BASE_INPUT_CLASSNAME } from './constants';

// Example
// <MultiSelectField tags={options} value={selected} onAddTag={add} onRemoveTag={remove} />

const MultiSelectField = ({ className = '', name, onAddTag, onRemoveTag, tags = [], value = [] }) => (
    <div className={cn(BASE_INPUT_CLASSNAME, 'flex flex-wrap gap-2', className)}>
        {tags.map((option) => {
            const isSelected = Array.isArray(value) && value.includes(option);
            const handleToggle = () => {
                if (isSelected) {
                    onRemoveTag(option);
                } else {
                    onAddTag(option);
                }
            };

            return (
                <div
                    key={`${name}-${option}`}
                    className={`flex items-center px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors duration-200 border-2 ${
                        isSelected
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-500'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
                    }`}
                    onClick={handleToggle}
                >
                    <input type="checkbox" checked={isSelected} onChange={handleToggle} className="sr-only" />
                    <span>{option}</span>
                </div>
            );
        })}
    </div>
);

export default MultiSelectField;
