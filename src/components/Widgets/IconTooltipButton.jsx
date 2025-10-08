import React from 'react';

import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../ui/tooltip';
import { cn } from '../../utils/utils';

export const IconToolTipButton = ({
    icon,
    onClick,
    tooltipText,
    className,
    disabled = false,
    type = 'button',
    'data-testid': dataTestId,
}) => {
    const Icon = icon || HelpCircle;

    return (
        <div>
            <TooltipProvider>
                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        <button
                            type={type}
                            className={cn(
                                'cursor-pointer h-12 w-12 flex items-center justify-center group hover:bg-gray-100 rounded-full transition-colors duration-200',
                                disabled
                                    ? 'opacity-50 cursor-not-allowed hover:bg-transparent'
                                    : '',
                                className
                            )}
                            onClick={disabled ? undefined : onClick}
                            data-testid={dataTestId}
                            disabled={disabled}
                        >
                            <Icon className={cn(
                                'h-7 w-7 text-gray-500 transition-colors duration-200',
                                disabled ? '' : 'group-hover:text-blue-500'
                            )} />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="max-w-sm">{tooltipText}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
};

export default IconToolTipButton;
