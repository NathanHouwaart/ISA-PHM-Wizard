import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import AnimatedTooltip from '../Tooltip/AnimatedTooltip';
import Author from '../Author/Author';

function FormField({ 
    label, 
    value, 
    onChange, 
    placeholder, 
    required, 
    explanation, 
    example,
    type = 'text',        // 'text', 'textarea', 'date', 'email', 'password', etc.
    rows = 3,             // for textarea
    className = ''
}) {
    const [showTooltip, setShowTooltip] = useState(false);
    
    const handleTooltipToggle = () => {
        setShowTooltip(!showTooltip);
    };

    const renderInput = () => {
        const baseClasses = "flex-1 px-4 ml-6 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white outline-none";
        
        switch (type) {
            case 'textarea':
                return (
                    <textarea
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder || example}
                        required={required}
                        rows={rows}
                        className={`${baseClasses} resize-vertical ${className}`}
                    />
                );
            case 'date':
                return (
                    <input
                        type="date"
                        value={value}
                        onChange={onChange}
                        required={required}
                        className={`${baseClasses} ${className}`}
                    />
                );
            case 'select':
                return (
                    <select
                        value={value}
                        onChange={onChange}
                        required={required}
                        className={`${baseClasses} ${className}`}
                    >
                        <option value="">{placeholder || "Select an option"}</option>
                        {/* Options would be passed as a prop */}
                    </select>
                );
            default:
                return (
                    <input
                        type={type}
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder || example}
                        required={required}
                        className={`${baseClasses} ${className}`}
                    />
                );
        }
    };
 
    return (
        <div className="mb-6">
            <div className="flex items-start"> {/* items-start for textarea alignment */}
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
            
            <AnimatedTooltip 
                isVisible={showTooltip}
                explanation={explanation}
                example={example}
            />
        </div>
    );
}

export default FormField;