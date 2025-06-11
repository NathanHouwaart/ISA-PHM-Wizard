
import React, { useEffect, useState } from 'react'

// Reusable Animated Tooltip Component with Explanation and Example sections
function AnimatedTooltip({ isVisible, explanation, example, className = '' }) {   
   
    return (
        <div className={`overflow-hidden  ${
            (isVisible) ? 'max-h-96 mt-2' : 'max-h-0 mt-0'
            
        }`}
        >
            <div className={`p-4 bg-white border border-gray-200 rounded-lg shadow-md transform transition-all duration-[200ms] ease-in ${
                isVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
            } ${className}`}>
                {explanation && (
                    <div className="mb-3">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                            Explanation
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            {explanation}
                        </p>
                    </div>
                )}
                
                {example && (
                    <div className={explanation ? 'border-t border-gray-100 pt-3' : ''}>
                        <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            Example
                        </h4>
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded border-l-3 border-green-500">
                            {example}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AnimatedTooltip