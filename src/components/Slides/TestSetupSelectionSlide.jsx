

import React, { forwardRef, useEffect, useState } from 'react';

import Fuse from 'fuse.js';

import testSetupSelectionSlideContent from '../../data/testSetupSelectionSlideContent.json';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import TestSetupCard from '../TestSetup/TestSetupCard';
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import { Check } from 'lucide-react';
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';

export const TestSetupSelectionSlide = forwardRef(({ onHeightChange }, ref) => {

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    const { testSetups, selectedTestSetup, selectedTestSetupId, setSelectedTestSetupId } = useGlobalDataContext();

    const [fuse, setFuse] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredSetups, setFilteredSetups] = useState(testSetups);


    useEffect(() => {
        const fuseInstance = new Fuse(testSetups, {
            keys: ["name", "location"],
            threshold: 0.3, // lower = more strict
        });
        setFuse(fuseInstance);
    }, [testSetups]);

    useEffect(() => {
        if (searchQuery.length > 0 && fuse) {
            const result = fuse.search(searchQuery, { limit: 10 });
            setFilteredSetups(result.map((r) => r.item));
        } else {
            setFilteredSetups(testSetups);
        }
    }, [searchQuery, fuse]);

    const handleSelectSetup = (setup) => {
        setSelectedTestSetupId(setup.id);
    };

    return (
        <div ref={combinedRef}>

            <SlidePageTitle>
                {testSetupSelectionSlideContent.pageTitle}
            </SlidePageTitle>

            <SlidePageSubtitle>
                {testSetupSelectionSlideContent.pageSubtitle}
            </SlidePageSubtitle>

            <div className='p-4 bg-gray-50 rounded-lg border border-gray-300'>
                <div className='flex justify-center '>
                    <input type='text' value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder='Search for Test Setups...' className='w-full max-w-md mx-auto mb-4 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' />
                </div>
                <div className='grid grid-cols-1 gap-2 '>


                    {filteredSetups.map((setup, index) => (
                        <div
                            key={setup.id}
                            onClick={() => handleSelectSetup(setup)}
                            className={`relative bg-white rounded-xl shadow-md border-2 cursor-pointer hover:shadow-lg transition-all duration-200 
                                ${selectedTestSetupId === setup.id
                                    ? 'outline-blue-500 outline-5  border-transparent'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`} >

                            {selectedTestSetupId === setup.id && (
                                <div className="absolute bottom-4 right-4">
                                    <div className="bg-blue-500 text-white rounded-full p-1">
                                        <Check size={20} />
                                    </div>
                                </div>
                            )}
                            <TestSetupCard item={setup} index={index} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

TestSetupSelectionSlide.displayName = "Test Setup Selection"; // Set display name for better debugging

export default TestSetupSelectionSlide;