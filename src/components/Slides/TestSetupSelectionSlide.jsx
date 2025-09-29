

import React, { forwardRef, useEffect, useState } from 'react';

import useFuseSearch from '../../hooks/useFuseSearch';

import testSetupSelectionSlideContent from '../../data/testSetupSelectionSlideContent.json';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import TestSetupCard from '../TestSetup/TestSetupCard';
import TestSetupSelectableCard from '../TestSetup/TestSetupSelectableCard';
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import { Check } from 'lucide-react';
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';

export const TestSetupSelectionSlide = forwardRef(({ onHeightChange }, ref) => {

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    const { testSetups, selectedTestSetup, selectedTestSetupId, setSelectedTestSetupId } = useGlobalDataContext();

    const {
        query: searchQuery,
        setQuery: setSearchQuery,
        results: filteredSetups } = useFuseSearch(
            testSetups, ['name', 'location'],
            { threshold: 0.3, limit: 10, debounce: 150 }
        );

    const handleSelectSetup = (setup) => setSelectedTestSetupId(setup.id);

    return (
        <div ref={combinedRef}>

            <SlidePageTitle>
                Test Set-up
            </SlidePageTitle>

            <SlidePageSubtitle style={{ whiteSpace: 'pre-line' }}>
                {"Please select the test set-up used to collect the data within the investigation. \n \
                Test Setups can be created and managed in the 'Test Setups' page."}
            </SlidePageSubtitle>

            <div className='p-4 bg-gray-50 rounded-lg border border-gray-300'>
                <div className='flex justify-center '>
                    <input type='text' value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder='Search for Test Setups...' className='w-full max-w-md mx-auto mb-4 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' />
                </div>
                <div className='grid grid-cols-1 gap-2 '>


                    {filteredSetups.map((setup, index) => (
                        <TestSetupSelectableCard
                            key={setup.id}
                            item={setup}
                            index={index}
                            isSelected={selectedTestSetupId === setup.id}
                            onSelect={() => handleSelectSetup(setup)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
});

TestSetupSelectionSlide.displayName = "Test Setup Selection"; // Set display name for better debugging

export default TestSetupSelectionSlide;