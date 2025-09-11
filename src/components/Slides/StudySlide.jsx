// src/pages/StudyPage.js
import React, { useEffect, forwardRef, useState } from 'react';

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

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import { usePageTab } from '../../hooks/usePageWidth'; // Import the usePageTab hook

import studySlideContent from '../../data/studySlideContent.json'; // Assuming you have a JSON file for the content
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';
import TabSwitcher, { TabPanel } from '../TabSwitcher';
import useCarouselNavigation from '../../hooks/useCarouselNavigation';
import DataGrid from '../DataGrid'; // Import the new DataGrid
import { BoldCell, HTML5DateCellTemplate, PatternCellTemplate } from '../GridTable/CellTemplates'; // Import cell templates
import { Template } from '@revolist/react-datagrid';

export const StudySlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {

    // Use persistent tab state that remembers across page navigation
    const [selectedTab, setSelectedTab] = usePageTab(pageIndex, 'simple-view'); // Page 5 for StudySlide

    // Observe height changes
    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    // Access global context
    const { 
        setScreenWidth, 
        studies, 
        setStudies 
    } = useGlobalDataContext();

    // Screen width is managed centrally by IsaQuestionnaire; no per-slide effect needed here.

    // Helper function to generate unique IDs
    const generateId = () => {
        return crypto.randomUUID();
    };

    // Add new study function
    const addNewStudy = () => {
        const newStudy = {
            id: generateId(),
            name: `New Study ${studies.length + 1}`,
            description: 'Enter description...',
            submissionDate: "",
            publicationDate: ""
        };
        setStudies([...studies, newStudy]);
    };

    // Remove last study function
    const removeLastStudy = () => {
        if (studies.length > 0) {
            setStudies(studies.slice(0, -1));
        }
    };

    // Handle study data changes from the grid
    const handleStudyDataChange = (newStudyData) => {
        setStudies(newStudyData);
    };

    // Grid configuration for studies
    const studiesGridConfig = {
        title: 'Studies Data',
        rowData: studies,
        columnData: [], // No dynamic columns for standalone grid
        mappings: [], // No mappings for standalone grid
        customActions: [
            {
                label: '+ Add Study',
                onClick: addNewStudy,
                className: 'px-3 py-1 text-sm bg-green-50 text-green-700 border border-green-300 rounded hover:bg-green-100',
                title: 'Add a new study'
            },
            {
                label: '- Remove Last',
                onClick: removeLastStudy,
                disabled: studies.length === 0,
                className: `px-3 py-1 text-sm border rounded ${studies.length === 0
                    ? 'bg-gray-50 text-gray-400 border-gray-300 cursor-not-allowed'
                    : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                }`,
                title: 'Remove the last study'
            }
        ],
        staticColumns: [
            {
                prop: 'id',
                name: 'Identifier',
                size: 150,
                readonly: true,
                cellTemplate: Template(PatternCellTemplate, { prefix: 'Study S' }),
                cellProperties: () => {
                    return {
                        style: {
                            "border-right": "3px solid "
                        }
                    }
                }
            },
            {
                prop: 'name',
                name: 'Study Name',
                size: 200,
                readonly: false
            },
            {
                prop: 'description',
                name: 'Description',
                size: 300,
                readonly: false
            },
            {
                prop: 'submissionDate',
                name: 'Submission Date',
                size: 250,
                readonly: false,
                cellTemplate: Template(HTML5DateCellTemplate),
            },
            {
                prop: 'publicationDate',
                name: 'Publication Date',
                size: 250,
                readonly: false,
                cellTemplate: Template(HTML5DateCellTemplate),
            }
        ]
    };
    
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
                    <DataGrid
                        {...studiesGridConfig}
                        showControls={true}
                        showDebug={false}
                        onRowDataChange={handleStudyDataChange}
                        height="500px"
                        isActive={selectedTab === 'grid-view' && currentPage === pageIndex}
                    />
                </TabPanel>
            </div>
        </div>
    );
});

StudySlide.displayName = "Studies"; // Set display name for better debugging

export default StudySlide;