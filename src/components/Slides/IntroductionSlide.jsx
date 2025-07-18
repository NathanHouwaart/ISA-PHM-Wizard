import React, { forwardRef } from 'react';

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

import introductionSlideContent from '../../data/IntroductionSlideContent.json'
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';

export const IntroductionSlide = forwardRef(({onHeightChange}, ref) => {

    const resizeElementRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, resizeElementRef);

    return (
        <div ref={combinedRef}>
            
            <SlidePageTitle>
                {introductionSlideContent.pageTitle}
            </SlidePageTitle>
            
            <SlidePageSubtitle>
                {introductionSlideContent.pageSubtitle}
            </SlidePageSubtitle>
            
            {introductionSlideContent.content.map((content, index) => (
                <p key={index} className='text-lg font-semibold mx-20 mb-8 text-gray-700'>{content}</p>
            ))}
        </div>
    );
});

IntroductionSlide.displayName = "Introduction"; // Set display name for better debugging

export default IntroductionSlide;