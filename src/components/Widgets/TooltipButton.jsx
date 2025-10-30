import React, { forwardRef } from 'react';

import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
    TooltipProvider
} from '../ui/tooltip';
import { cn } from '../../utils/utils';

export const TooltipButton = forwardRef(({ className, onClick, tooltipText, children, disabled = false, type = 'button', ...props }, ref) => {
    return (
        <TooltipProvider>
            <Tooltip delayDuration={300}>
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
