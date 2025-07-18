import React, { forwardRef, useEffect, useMemo, useState, useRef } from 'react';

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

import studyVariableSlideContent from '../../data/StudyVariableSlideContent.json'; // Assuming you have a JSON file for the content
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';
import { GridTable, BoldCell } from '../GridTable/GridTable';
import { Template } from '@revolist/react-datagrid';
import { flattenGridDataToMappings, getStructuredVariables } from '../../utils/utils';
import isEqual from 'lodash.isequal';
import TabSwitcher, { TabPanel } from '../TabSwitcher';
import EntityMappingPanel from '../EntityMappingPanel';
import { useVariables } from '../../hooks/useVariables';

const GrayCell = () => {
    return {
        style: {
            "background-color": '#e7e8e9',
        }
    }
}

export const StudyVariableSlide = forwardRef(({ onHeightChange, currentPage }, ref) => {

    const [selectedTab, setSelectedTab] = useState('simple-view'); // State to manage selected tab

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    const { 
        studies, 
        studyVariables, 
        setScreenWidth, 
        setStudyVariables, 
        studyToStudyVariableMapping, 
        setStudyToStudyVariableMapping 
    } = useGlobalDataContext(); 

    const [selectedVariableIndex, setSelectedVariableIndex] = useState(0); // State to track selected variable index

    useEffect(() => {
        if (selectedTab === 'grid-view' && currentPage === 6) {
            setScreenWidth("max-w-[100rem]");
        } else if (currentPage === 6) {
            setScreenWidth("max-w-5xl");
        }
    }, [selectedTab, currentPage, setScreenWidth]);

    // --------- Global → Grid Sync ---------
    const gridDataFromGlobal = useMemo(() => {
        // console.log("data for grid view:", studyVariables, studies, studyToStudyVariableMapping);
        const vars = getStructuredVariables(studyVariables, studies, studyToStudyVariableMapping);
        // console.log("Grid data generated 2:", vars);
        return vars;
    }, [studyVariables, studies, studyToStudyVariableMapping]);

    // Local state for the grid, initialized from global data
    const [processedData, setProcessedData] = useState([]);
    const [columns, setColumns] = useState([]);

    // Ref to track if the processedData update originated from user interaction or global state sync
    const isUpdatingFromGlobal = useRef(false);

    // --- Global Data to Local Grid Data Sync ---
    useEffect(() => {
        if (!isEqual(processedData, gridDataFromGlobal)) {
            console.log("Global data changed, updating processedData...");
            isUpdatingFromGlobal.current = true; // Set flag to indicate update from global
            setProcessedData(gridDataFromGlobal);
        }
    }, [gridDataFromGlobal]); // Depend on the memoized global data for updates


    // --- Local Grid Data to Global Data Sync ---
    useEffect(() => {
        if (isUpdatingFromGlobal.current) {
            isUpdatingFromGlobal.current = false;
            return;
        }

        // Only sync to global if processedData actually changed and it wasn't a global-initiated update
        // Using a timeout to debounce and prevent rapid updates during multi-cell edits (e.g., paste)
        const timeout = setTimeout(() => {
            console.log("ProcessedData changed locally, updating global state...");
            const flattened = flattenGridDataToMappings(processedData, studies);
            setStudyToStudyVariableMapping(flattened);

            // // Filter out UUID keys from processedData to update studyVariables
            // const updatedStudyVariables = processedData.map((variable) =>
            //     Object.fromEntries(
            //         Object.entries(variable).filter(([key]) => !isUUID(key))
            //     )
            // );
            // // Only update if truly different to avoid unnecessary renders and potential loops
            // if (!isEqual(studyVariables, updatedStudyVariables)) {
            //     setStudyVariables(updatedStudyVariables);
            // }
        }, 0); // Debounce time in ms

        return () => clearTimeout(timeout);
    }, [processedData, studies, studyVariables]); // Depend on processedData and relevant setters/state


    // Standalone Effect to initialize columns for grid view
    useEffect(() => {
        setColumns([
            { prop: 'name', name: 'Variable', pin: 'colPinStart', size: 100, cellTemplate: Template(BoldCell), cellProperties: GrayCell, },
            { prop: 'type', name: 'Variable Type', size: 150 },
            { prop: 'unit', name: 'Unit' },
            {
                prop: 'description', name: 'Description', size: 350, cellProperties: () => {
                    return {
                        style: {
                            "border-right": "3px solid black"
                        }
                    }
                }
            },
            ...studies.map((study, index) => ({
                prop: study.id,
                name: `S${(index + 1).toString().padStart(2, '0')}`,
                size: 150
            }))
        ])
    }, [studies]); // Depend on studies, so columns update if studies change

    const handleInputChange = (variableIndex, mapping, value) => {
        setProcessedData(prevData => {
            const newData = [...prevData];
            const entry = newData.find(variable => variable.id === mapping.studyVariableId)
            if (entry) { // Ensure entry exists
                entry[mapping.studyId] = value; // Update the specific study's value
            }
            return newData;
        });
    };

    
    return (
        <div ref={combinedRef} >

            <SlidePageTitle>
                {studyVariableSlideContent.pageTitle}
            </SlidePageTitle>

            <SlidePageSubtitle>
                {studyVariableSlideContent.pageSubtitle}
            </SlidePageSubtitle>

            <div className='bg-gray-50 p-3 border-gray-300 border rounded-lg pb-2 relative'>

                <TabSwitcher
                    selectedTab={selectedTab}
                    onTabChange={setSelectedTab}
                    tabs={[
                        { id: 'simple-view', label: 'Simple View', tooltip: 'View study variables in a simple list format' },
                        { id: 'grid-view', label: 'Grid View', tooltip: 'View study variables in a grid format for better data management' }
                    ]}
                />

                <TabPanel isActive={selectedTab === 'simple-view'}>
                    <EntityMappingPanel 
                        name={"Variables"} 
                        itemHook={useVariables}
                        mappings={studyToStudyVariableMapping} 
                        handleInputChange={handleInputChange}
                    />
                </TabPanel>
                   
                <TabPanel isActive={selectedTab === 'grid-view'}>
                    <GridTable
                        items={processedData} 
                        setItems={setProcessedData} 
                        columns={columns} 
                    />
                </TabPanel>
            </div>
        </div>
    );
});

StudyVariableSlide.displayName = "Study Variables"; // Set display name for better debugging

export default StudyVariableSlide;