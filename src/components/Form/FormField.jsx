import React, { useState } from 'react';
import { Check, HelpCircle } from 'lucide-react';
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
    required,
    explanation,
    example,
    type = 'text',        // 'text', 'textarea', 'date', 'email', 'password', etc.
    tags = [],
    onAddTag,
    onRemoveTag,
    rows = 3,             // for textarea
    className = '',
}) {
    const [showTooltip, setShowTooltip] = useState(false);

    const handleTooltipToggle = () => {
        setShowTooltip(!showTooltip);
    };

    const renderInput = () => {
        const baseClasses = "w-full px-3 text-base bg-white py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none";
        switch (type) {
            case 'tags':
                const [inputValue, setInputValue] = useState('');

                const handleKeyDown = (e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const newTag = inputValue.trim();
                        if (newTag && !tags.includes(newTag)) {
                            onAddTag(newTag);
                            setInputValue('');
                        }
                    }
                };

                return (
                    <div className="w-full flex flex-wrap items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
                        {tags.map((tag, index) => (
                            <span
                                key={tag + index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
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
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-grow min-w-0 bg-transparent py-0 border-0 focus:ring-0 focus:border-0 outline-none"
                            placeholder={placeholder}
                        />
                    </div>
                );
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
                                    {/* {isSelected && <Check className="ml-2 w-4 h-4 text-indigo-800" />} */}
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
                        name={name}
                        type={type}
                        value={value}
                        onChange={onChange}
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
            <div className="flex flex-grow w-full pt-0.5 ml-0"> {/* items-start for textarea alignment */}

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