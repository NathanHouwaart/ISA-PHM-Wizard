import React, { useEffect, useState, isValidElement } from 'react'

// Marker components with display names for better debugging
export const AnimatedTooltipExplanation = ({ children }) => children;
AnimatedTooltipExplanation.displayName = 'AnimatedTooltipExplanation';

export const AnimatedTooltipExample = ({ children }) => children;
AnimatedTooltipExample.displayName = 'AnimatedTooltipExample';

// Main Animated Tooltip Component that processes JSX children
function AnimatedTooltip({ isVisible, children, className = '' }) {  
    // Extract explanations and examples from children using React's built-in utilities
    const explanations = [];
    const examples = [];
    
    children.forEach((child) => {
        if (isValidElement(child)) {
            if (child.type === AnimatedTooltipExplanation) {
                explanations.push(child.props.children);
            } else if (child.type === AnimatedTooltipExample) {
                examples.push(child.props.children);
            }
        }
    });

    const explanation = explanations.length > 0 ? (
        <div className="space-y-2">
            {explanations.map((exp, index) => (
                <p key={index} className="text-sm text-gray-600 leading-relaxed">
                    {exp}
                </p>
            ))}
        </div>
    ) : null;
    
    const example = examples.length > 0 ? (
        <div className="space-y-1">
            {examples.map((ex, index) => (
                <div key={index} className="text-sm">
                    {ex}
                </div>
            ))}
        </div>
    ) : null;

    return (
        <div className={`overflow-hidden ${
            (isVisible) ? 'max-h-96 mt-2' : 'max-h-0 mt-0'
        }`}>
            <div className={`p-4 bg-white border border-gray-200 rounded-lg shadow-md transform transition-all duration-[200ms] ease-in ${
                isVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
            } ${className}`}>
                {explanation && (
                    <div className="mb-3">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                            Explanation
                        </h4>
                        <div className="space-y-2">
                            {explanation}
                        </div>
                    </div>
                )}
               
                {example && (
                    <div className={explanation ? 'border-t border-gray-100 pt-3' : ''}>
                        <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            Example
                        </h4>
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded border-l-4 border-green-500 space-y-1">
                            {example}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AnimatedTooltip