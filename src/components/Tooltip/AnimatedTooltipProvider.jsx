import React, { isValidElement, Children } from 'react';
import Heading4 from '../Typography/Heading4';
import Paragraph from '../Typography/Paragraph';

export const AnimatedTooltipExplanation = ({ children }) => children;
AnimatedTooltipExplanation.displayName = 'AnimatedTooltipExplanation';

export const AnimatedTooltipExample = ({ children }) => children;
AnimatedTooltipExample.displayName = 'AnimatedTooltipExample';

const AnimatedTooltip = ({ isVisible, children, className = '' }) => {
  const explanations = Children.toArray(children).filter(
    (child) => isValidElement(child) && child.type === AnimatedTooltipExplanation
  );

  // Helper: determine whether a node has meaningful/renderable children.
  const hasRenderableChildren = (node) => {
    if (node == null) return false;
    if (typeof node === 'string') return node.trim().length > 0;
    if (typeof node === 'number' || typeof node === 'boolean') return true;
    if (Array.isArray(node)) return node.some(hasRenderableChildren);
    if (isValidElement(node)) return hasRenderableChildren(node.props?.children);
    // For other values (objects, etc.), assume renderable
    return true;
  };

  // Only consider AnimatedTooltipExample children that actually contain content.
  const examples = Children.toArray(children).filter(
    (child) => isValidElement(child) && child.type === AnimatedTooltipExample && hasRenderableChildren(child.props?.children)
  );

  return (
    <div
      className={`overflow-hidden transition-all duration-[200ms] ease-in ${
        isVisible ? 'max-h-fit mt-2' : 'max-h-0 mt-0'
      }`}
    >
      <div
        className={`p-4 mb-2 bg-white border border-gray-200 rounded-lg shadow-md transform ${
          isVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
        } ${className}`}
      >
        {explanations.length > 0 && (
          <div className="mb-3">
            <Heading4 className="mb-2 flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
              Explanation
            </Heading4>
            <div className="space-y-2 text-sm text-gray-600 leading-relaxed">
              {explanations.map((exp, i) => (
                <Paragraph key={i}>{exp}</Paragraph>
              ))}
            </div>
          </div>
        )}

        {examples.length > 0 && (
          <div className={explanations.length ? 'border-t border-gray-100 pt-3' : ''}>
            <Heading4 className="mb-2 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              Example
            </Heading4>
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded border-l-4 border-green-500 space-y-1">
              {examples.map((ex, i) => (
                <div key={i}>{ex.props.children}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimatedTooltip;
