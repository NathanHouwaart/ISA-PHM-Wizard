import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import AnimatedTooltip, { AnimatedTooltipExample, AnimatedTooltipExplanation } from '../Tooltip/AnimatedTooltip';
import LicensePicker from './LicensePicker';
import { cn } from '../../utils/utils';

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
    rows = 3,             // for textarea
    className = '',
}) {
    const [showTooltip, setShowTooltip] = useState(false);
    
    const handleTooltipToggle = () => {
        setShowTooltip(!showTooltip);
    };               

    const renderInput = () => {
        const baseClasses = "flex-1 px-4 ml-6 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white outline-none";
        
        switch (type) {
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
                        {/* Options would be passed as a prop */}
                    </select>
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
        <div className="space-y-2">
            <div className="flex items-stretch "> {/* items-start for textarea alignment */}
                <label className={`text-sm font-medium text-gray-700 w-24 text-right ${type === 'textarea' ? 'pt-3' : ''}`}>
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>

                    {renderInput()}
               
                <button 
                    type="button"
                    onClick={handleTooltipToggle} 
                    className={`h-12 w-12 ml-3 flex items-center justify-center group hover:bg-gray-100 rounded-full transition-colors duration-200 flex-shrink-0 ${type === 'textarea' ? 'mt-1' : ''}`}
                >
                    <HelpCircle className="h-5 w-5 text-gray-500 hover:text-blue-500 transition-colors duration-200" />
                </button>
            </div>

            <AnimatedTooltip isVisible={showTooltip}>
                <AnimatedTooltipExplanation>{explanation}</AnimatedTooltipExplanation>
                <AnimatedTooltipExample>{example}</AnimatedTooltipExample>
            </AnimatedTooltip>
        </div>
    );
}

export default FormField;