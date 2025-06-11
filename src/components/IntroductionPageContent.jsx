import React, { forwardRef } from 'react';
import useResizeObserver from '../hooks/useResizeObserver';
import useCombinedRefs from '../hooks/useCombinedRefs';

/**
 * Renders the content of an introduction page and reports its height changes.
 */
const IntroductionPageContent = forwardRef(({ pageInfo, onHeightChange }, ref) => {
    // Get the internal ref from useResizeObserver.
    // This hook will automatically call onHeightChange when the content's height changes.
    const resizeElementRef = useResizeObserver(onHeightChange);

    // Combine the forwarded ref (from Contact.jsx) with the resize observer's ref.
    // This allows both the parent and the internal observer to access the DOM node.
    const combinedRef = useCombinedRefs(ref, resizeElementRef);

    return (
        <div ref={combinedRef} className="introduction-page-content-container">
            {pageInfo.content.map((content, index) => (
                <p key={index} className='text-lg font-semibold mx-20 mb-8 text-gray-700'>{content}</p>
            ))}
        </div>
    );
});

export default IntroductionPageContent;