// src/pages/StudyPage.js
import React, { useEffect, useState, forwardRef } from 'react';
import { Switch } from '../ui/switch';

// Import the single global provider
import { GlobalDataProvider, useGlobalDataContext } from '../../contexts/GlobalDataContext';

import useStudies from '../../hooks/useStudies';
import Collection, {
    CollectionTitle,
    CollectionSubtitle,
    CollectionAddButtonText,
    CollectionEmptyStateTitle,
    CollectionEmptyStateSubtitle,
    CollectionEmptyStateAddButtonText
} from '../Collection';
import { StudyTable } from '../Study/StudyTable';

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

import studySlideContent from '../../data/studySlideContent.json'; // Assuming you have a JSON file for the content
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';
import TabSwitcher, { TabPanel } from '../TabSwitcher';
import useCarouselNavigation from '../../hooks/useCarouselNavigation';

export const StudySlide = forwardRef(({ onHeightChange, currentPage }, ref) => {

    const [value, setValue] = useState(false);
    const [selectedTab, setSelectedTab] = useState('simple-view'); // State to manage selected tab

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    const { setScreenWidth } = useGlobalDataContext();

    if (selectedTab === 'grid-view' && currentPage === 5) {
        setScreenWidth("max-w-[100rem]");
        console.log("Setting screen width to max-w-7xl for grid view on StudySlide");
    } else if (currentPage === 5) {
        setScreenWidth("max-w-5xl");
        console.log("Setting screen width to max-w-5xl for simple view on StudySlide");
    }
    
    return (
        <div ref={combinedRef}>

            <SlidePageTitle>
                {studySlideContent.pageTitle}
            </SlidePageTitle>

            <SlidePageSubtitle>
                {studySlideContent.pageSubtitle}
            </SlidePageSubtitle>

            <div className='bg-gray-50 p-3 border-gray-300 border rounded-lg pb-2 relative'>
               <TabSwitcher
                    selectedTab={selectedTab}
                    onTabChange={setSelectedTab}
                    tabs={[
                        { id: 'simple-view', label: 'Simple View' },
                        { id: 'grid-view', label: 'Grid View' }
                    ]}
                />

                <TabPanel isActive={selectedTab === 'simple-view'}>
                    <Collection
                        onHeightChange={() => { }}
                        itemHook={useStudies} // This hook will need to pull 'studies' from the global context
                        grid={true}
                    >
                        <CollectionTitle>Studies</CollectionTitle>
                        <CollectionSubtitle>View, add and edit Studies</CollectionSubtitle>
                        <CollectionAddButtonText>Add Study</CollectionAddButtonText>
                        <CollectionEmptyStateTitle>No Studies Found</CollectionEmptyStateTitle>
                        <CollectionEmptyStateSubtitle>Click below to add your first Study</CollectionEmptyStateSubtitle>
                        <CollectionEmptyStateAddButtonText>Add Study Now</CollectionEmptyStateAddButtonText>
                    </Collection>
                </TabPanel>

               <TabPanel isActive={selectedTab === 'grid-view'}>
                    <StudyTable
                        ref={ref}
                        onHeightChange={() => { }}
                    />
                </TabPanel>
            </div>
        </div>
    );
});

export default StudySlide;