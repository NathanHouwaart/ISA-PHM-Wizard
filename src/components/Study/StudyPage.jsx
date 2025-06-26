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
import { StudyTable } from './StudyTable';

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';


export const StudyPage = forwardRef(({ pageInfo, onHeightChange }, ref) => {

    const [value, setValue] = useState(true);

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    return (
        <div ref={combinedRef}>
            <div className='flex gap-2'>
                <Switch
                    className="w-16 h-8 data-[state=unchecked]:bg-gray-500 data-[state=checked]:bg-blue-600"
                    thumbClassName="w-6 h-6 data-[state=unchecked]:translate-x-[2px] data-[state=checked]:translate-x-9"
                    checked={value}
                    onCheckedChange={setValue}
                />
                <span className='font-bold text-2xl'>Toggle Grid Mode</span>
            </div>
            <div
                className={`rounded transition-opacity overflow-hidden duration-500 ease-in-out ${value ? "opacity-100" : "opacity-0 max-h-0"
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
                className={`transition-opacity overflow-hidden duration-500 ease-in-out ${value ? "opacity-0 max-h-0" : "opacity-100"
                    }`}
            >
                <StudyTable
                    ref={ref}
                    onHeightChange={() => { }}
                />
            </div>
        </div>
    );
});

export default StudyPage;