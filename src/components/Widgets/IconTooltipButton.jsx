import React from 'react';

import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../ui/tooltip';
import { cn } from '../../utils/utils';
import { TOOLTIP_DELAY_MS } from '../../constants/ui';

/**
 * IconToolTipButton Component
 * 
 * A flexible icon-only button with integrated tooltip.
 * Supports multiple sizes and custom icons.
 * 
 * @component
 * @param {Object} props
 * @param {React.ComponentType} [props.icon] - Lucide icon component (defaults to HelpCircle)
 * @param {() => void} [props.onClick] - Click handler
 * @param {string} props.tooltipText - Tooltip text (required for accessibility)
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {'button'|'submit'|'reset'} [props.type='button'] - Button type
 * @param {'md'|'sm'} [props.size='md'] - Size variant
 * @param {string} [props['data-testid']] - Test ID for testing
 * @returns {JSX.Element} Icon button with tooltip
 */
export const IconToolTipButton = ({
    icon,
    onClick,
    tooltipText,
    className,
    disabled = false,
    type = 'button',
    size = 'md', // 'md' or 'sm'
    'data-testid': dataTestId,
}) => {
    const Icon = icon || HelpCircle;

    const sizeMap = {
        md: {
            btn: 'h-12 w-12',
            icon: 'h-7 w-7',
            padding: 'p-0',
        },
        sm: {
            btn: 'h-8 w-8',
            icon: 'h-4 w-4',
            padding: 'p-0',
        },
    };

    const chosen = sizeMap[size] || sizeMap.md;

    return (
        <div>
            <TooltipProvider>
                <Tooltip delayDuration={TOOLTIP_DELAY_MS}>
                    <TooltipTrigger asChild>
                        <button
                            type={type}
                            className={cn(
                                'cursor-pointer flex items-center justify-center group hover:bg-gray-100 rounded-full transition-colors duration-200',
                                chosen.btn,
                                chosen.padding,
                                disabled ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : '',
                                className
                            )}
                            onClick={disabled ? undefined : onClick}
                            data-testid={dataTestId}
                            disabled={disabled}
                        >
                            <Icon className={cn(
                                chosen.icon + ' text-gray-500 transition-colors duration-200',
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
