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
import { GridTable } from '../GridTable/GridTable';
import { Template } from '@revolist/react-datagrid';

const BoldCell = ({ value }) => {
    return (
        <div className="flex items-center justify-center">
            <strong className=''>{value}</strong>
        </div>
    );
};

const PatternCellTemplate = ({ prefix, rowIndex }) => {
    // Generate the pattern based on the row index
    const value = `${prefix}${(rowIndex + 1).toString().padStart(2, '0')}`;
    return <BoldCell value={value} />;
}


const columns = [
    {
        prop: 'id', name: 'Identifier', size: 150, pin: "colPinStart", readonly: true, cellTemplate: Template(PatternCellTemplate, { prefix: 'S' }), cellProperties: () => {
            return {
                style: {
                    "border-right": "3px solid black"
                }
            }
        }
    },
    { prop: 'name', name: 'Title', size: 250 },
    { prop: 'description', name: 'Description', size: 510 },
    { prop: 'submissionDate', name: 'Submission Date', size: 250 },
    { prop: 'publicationDate', name: 'Publication Date', size: 250 }
];


export const StudySlide = forwardRef(({ onHeightChange, currentPage }, ref) => {

    const [selectedTab, setSelectedTab] = useState('simple-view'); // State to manage selected tab

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    const { setScreenWidth, studies, setStudies } = useGlobalDataContext();

     useEffect(() => {
            if (selectedTab === 'grid-view' && currentPage === 5) {
                setScreenWidth("max-w-[100rem]");
            } else if (currentPage === 5) {
                setScreenWidth("max-w-5xl");
            }
        }, [selectedTab, currentPage, setScreenWidth]);
    
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
                        { id: 'simple-view', label: 'Simple View', tooltip: 'View studies in a simple list format' },
                        { id: 'grid-view', label: 'Grid View', tooltip: 'View studies in a grid format for better data management' }
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
                    <GridTable
                        columns={columns}
                        items={studies}
                        setItems={setStudies}
                    />
                </TabPanel>
            </div>
        </div>
    );
});

StudySlide.displayName = "Studies"; // Set display name for better debugging

export default StudySlide;