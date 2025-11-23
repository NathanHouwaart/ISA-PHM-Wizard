import React, { forwardRef } from 'react';

import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
    TooltipProvider
} from '../ui/tooltip';
import { cn } from '../../utils/utils';
import { TOOLTIP_DELAY_MS } from '../../constants/ui';

/**
 * TooltipButton Component
 * 
 * A button component with integrated tooltip functionality.
 * Wraps Radix UI Tooltip with consistent styling and behavior.
 * 
 * NOTE: This component includes its own TooltipProvider for convenience.
 * For better performance when rendering multiple TooltipButtons, wrap
 * the parent component in a single TooltipProvider and use the raw
 * Radix Tooltip primitives instead.
 * 
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Additional CSS classes
 * @param {() => void} [props.onClick] - Click handler
 * @param {string} [props.tooltipText] - Text to display in tooltip
 * @param {React.ReactNode} props.children - Button content
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {'button'|'submit'|'reset'} [props.type='button'] - Button type
 * @returns {JSX.Element} Button with tooltip
 */
export const TooltipButton = forwardRef(({ className, onClick, tooltipText, children, disabled = false, type = 'button', ...props }, ref) => {
    return (
        <TooltipProvider>
            <Tooltip delayDuration={TOOLTIP_DELAY_MS}>
                <TooltipTrigger asChild>
                    <button
                        ref={ref}
                        type={type}
                        onClick={onClick}
                        className={cn(
                            'cursor-pointer px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 rounded-lg transition-colors duration-200 flex items-center space-x-2',
                            className
                        )}
                        disabled={disabled}
                        {...props}
                    >
                        {children}
                    </button>
                </TooltipTrigger>
                {tooltipText ? (
                    <TooltipContent>
                        <p className="max-w-sm">{tooltipText}</p>
                    </TooltipContent>
                ) : null}
            </Tooltip>
        </TooltipProvider>
    );
});

TooltipButton.displayName = 'TooltipButton';

export default TooltipButton;
