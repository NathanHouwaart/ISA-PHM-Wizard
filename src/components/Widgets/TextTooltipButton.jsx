
import React from 'react'

import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
    TooltipProvider
} from '../ui/tooltip'
import { cn } from '../../utils/utils'

export function TooltipButton({ className, onClick, tooltipText, children }) {
    return (
        <div>
            <TooltipProvider>
                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={onClick}
                            className={cn("cursor-pointer px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 rounded-lg transition-colors duration-0 flex items-center space-x-2", className)}
                        >
                            {children}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className='max-w-sm'>{tooltipText}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    )
}

export default TooltipButton