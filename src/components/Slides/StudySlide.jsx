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
    const [selectedTab, setSelectedTab] = useState('simple-view'); // State to manage selected tab

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    return (
        <div ref={combinedRef}>
            <h2 className='text-2xl font-semibold text-gray-800 flex items-center justify-center mb-2'>
                {studySlideContent.pageTitle}
            </h2>
            <p className='text-center text-sm font text-gray-700 mb-7 pb-7 border-b border-gray-300'>{studySlideContent.pageUnderTitle}</p>

            <div className='bg-gray-50 p-3 border-gray-300 border rounded-lg pb-2 relative'>
                
                {/* Tab Navigation */}
                <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-300 mb-4 shadow-sm">
                    <button
                        onClick={() => setSelectedTab('simple-view')}
                        className={`cursor-pointer flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${selectedTab === 'simple-view'
                                ? 'bg-white text-blue-700 shadow-md'
                                : 'text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Simple View
                    </button>
                    <button
                        onClick={() => setSelectedTab('grid-view')}
                        className={`cursor-pointer flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${selectedTab === 'grid-view'
                                ? 'bg-white text-blue-700 shadow-md'
                                : 'text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Grid View
                    </button>
                </div>

                <div
                    className={`rounded transition-opacity overflow-hidden duration-500 ease-in-out ${selectedTab === 'grid-view' ? "opacity-0 max-h-0" : "opacity-100"
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
                    className={`transition-opacity overflow-hidden duration-500 ease-in-out ${selectedTab === 'grid-view' ? "opacity-100" : "opacity-0 max-h-0"
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