import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import AnimatedTooltip, { AnimatedTooltipExample, AnimatedTooltipExplanation } from '../Tooltip/AnimatedTooltipProvider';
import TooltipButton from '../Widgets/TooltipButton';

// Example
// <FormFieldShell label="Title" required explanation="Explain the title">
//   <input ... />
// </FormFieldShell>

/**
 * Lightweight wrapper for shared label, tooltip, and explanation rendering used by FormField.
 * Children receive layout space for the concrete input element.
 */
const FormFieldShell = ({ children, fieldType, label, required, explanation, example }) => {
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);

    const handleTooltipToggle = () => {
        setIsTooltipVisible((prev) => !prev);
    };

    return (
        <div>
            {label && (
                <label className={`text-sm ml-1 font-medium text-gray-700 w-24 text-right flex-shrink-0 ${fieldType === 'textarea' ? 'pt-3' : ''}`}>
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="flex flex-grow w-full pt-0.5 ml-0">
                {/* Ensure the concrete field can grow and shrink inside the flex row.
                    Some field renderers return a top-level <div> which by default does not
                    flex-grow; wrapping children in a flex-1 + min-w-0 container allows
                    them to take the remaining width and prevents the tooltip button from
                    constraining the input's width. */}
                <div className="flex-1 min-w-0">
                    {children}
                </div>

                {explanation && (
                    <TooltipButton
                        tooltipText={explanation}
                        onClick={handleTooltipToggle}
                        className={`bg-transparent h-10 w-10 p-0 ml-3 mr-1 flex items-center justify-center group hover:bg-gray-200 rounded-full transition-colors duration-200 flex-shrink-0 ${fieldType === 'textarea' ? 'mt-1' : ''}`}
                    >
                        <HelpCircle className="h-5 w-5 text-gray-500 group-hover:text-blue-500 transition-colors duration-200" />
                    </TooltipButton>
                )}
            </div>

            {explanation && (
                <AnimatedTooltip isVisible={isTooltipVisible}>
                    <AnimatedTooltipExplanation>{explanation}</AnimatedTooltipExplanation>
                    <AnimatedTooltipExample>{example}</AnimatedTooltipExample>
                </AnimatedTooltip>
            )}
        </div>
    );
};

export default FormFieldShell;
