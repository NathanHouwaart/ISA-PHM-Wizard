import React, { forwardRef } from 'react';

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle, Paragraph } from '../Typography/Paragraph';

export const IntroductionSlide = forwardRef(({onHeightChange}, ref) => {

    const resizeElementRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, resizeElementRef);

    return (
        <div ref={combinedRef}>
            
            <SlidePageTitle>
                Introduction
            </SlidePageTitle>

            <SlidePageSubtitle>
                Welcome to the ISA-PHM input wizard!
            </SlidePageSubtitle>

            <Paragraph className='text-lg font-semibold mx-20 mb-8 text-gray-700'>
                With this Wizard it is easy to annotate measurements of your experiment according to FAIR principles, and translate the metadata to the standardized ISA-PHM format.
                <br/><br/>
                Click on the Next button to start the metadata annotation of your experiments.
            </Paragraph>
        </div>
    );
});

IntroductionSlide.displayName = "Introduction"; // Set display name for better debugging

export default IntroductionSlide;