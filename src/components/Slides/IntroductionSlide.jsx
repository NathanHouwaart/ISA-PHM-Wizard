import React, { forwardRef } from 'react';

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

import introductionSlideContent from '../../data/IntroductionSlideContent.json'

export const IntroductionSlide = forwardRef(({onHeightChange}, ref) => {

    const resizeElementRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, resizeElementRef);

    return (
        <div ref={combinedRef}>
            <h2 className='text-2xl font-semibold text-gray-800 flex items-center justify-center mt-7 mb-2'>
                {introductionSlideContent.pageTitle}
            </h2>
            <p className='text-center text-sm font text-gray-700 mb-7 pb-7 border-b border-gray-300'>{introductionSlideContent.pageUnderTitle}</p>
            {introductionSlideContent.content.map((content, index) => (
                <p key={index} className='text-lg font-semibold mx-20 mb-8 text-gray-700'>{content}</p>
            ))}
        </div>
    );
});
