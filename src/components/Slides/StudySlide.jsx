// src/pages/StudyPage.js
import React, { useEffect, useState, forwardRef } from 'react';
import { Switch } from '../ui/switch';

// Import the single global provider
import { GlobalDataProvider } from '../../contexts/GlobalDataContext';

import useStudies from '../../hooks/useStudies';
import Collection, {
    CollectionTitle,
    CollectionUndertitle,
    CollectionAddButtonText,
    CollectionEmptyStateTitle,
    CollectionEmptyStateUndertitle,
    CollectionEmptyStateAddButtonText
} from '../Collection';
import { StudyTable } from '../Study/StudyTable';

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

import studySlideContent from '../../data/studySlideContent.json'; // Assuming you have a JSON file for the content

export const StudySlide = forwardRef(({ onHeightChange }, ref) => {

    const [value, setValue] = useState(false);

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    return (
        <div ref={combinedRef} className='relative'>
            <div className="absolute left-10 top-8 flex items-center gap-2 z-20"> {/* Adjusted positioning for clarity */}
                    <Switch
                        className="w-16 h-8 data-[state=unchecked]:bg-gray-500 data-[state=checked]:bg-blue-600"
                        thumbClassName="w-6 h-6 data-[state=unchecked]:translate-x-[2px] data-[state=checked]:translate-x-9"
                        checked={value}
                        onCheckedChange={setValue}
                    />
                    {/* You might want to remove this H2 if the switch is just an overlay, or adjust its styling */}
                    <span className='text-center text-sm font text-gray-700 '>Table View</span>
                </div>
            <h2 className='text-2xl font-semibold text-gray-800 flex items-center justify-center mb-2'>
                {studySlideContent.pageTitle}
            </h2>
            <p className='text-center text-sm font text-gray-700 mb-7 pb-7 border-b border-gray-300'>{studySlideContent.pageUnderTitle}</p>

            <div className='bg-gray-50 p-3 border-gray-300 border rounded-lg pb-2 relative'> {/* Add 'relative' here */}
                {/* Position the switch absolutely within this relative parent */}
                
                <div
                    className={`rounded transition-opacity overflow-hidden duration-500 ease-in-out ${value ? "opacity-0 max-h-0" : "opacity-100"
                        }`}
                >
                    <Collection
                        onHeightChange={() => { }}
                        itemHook={useStudies} // This hook will need to pull 'studies' from the global context
                        grid={true}
                    >
                        <CollectionTitle>Studies</CollectionTitle>
                        <CollectionUndertitle>View, add and edit Studies</CollectionUndertitle>
                        <CollectionAddButtonText>Add Study</CollectionAddButtonText>
                        <CollectionEmptyStateTitle>No Studies Found</CollectionEmptyStateTitle>
                        <CollectionEmptyStateUndertitle>Click below to add your first Study</CollectionEmptyStateUndertitle>
                        <CollectionEmptyStateAddButtonText>Add Study Now</CollectionEmptyStateAddButtonText>
                    </Collection>
                </div>
                <div
                    className={`transition-opacity overflow-hidden duration-500 ease-in-out ${value ? "opacity-100" : "opacity-0 max-h-0"
                        }`}
                >
                    <StudyTable
                        ref={ref}
                        onHeightChange={() => { }}
                    />
                </div>
            </div>
        </div>
    );
});

export default StudySlide;