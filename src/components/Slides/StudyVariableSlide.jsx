import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react'

// Import hooks
import useVariables from '../../hooks/useVariables';
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

// Import the single global provider
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';

// Import components
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';
import TabSwitcher, { TabPanel } from '../TabSwitcher';
import EntityMappingPanel from '../EntityMappingPanel';

// Data Grid Imports
import { Template } from '@revolist/react-datagrid';
import { GridTable } from '../GridTable/GridTable';
import { GrayCell, BoldCell } from '../GridTable/CellTemplates';

// Import utility functions
import { flattenGridDataToMappings, getStructuredVariables } from '../../utils/utils';
import isEqual from 'lodash.isequal';

// Import content data
import studyVariableSlideContent from '../../data/StudyVariableSlideContent.json'; // Assuming you have a JSON file for the content


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

    useEffect(() => {
        if (selectedTab === 'grid-view' && currentPage === 6) {
            setScreenWidth("max-w-[100rem]");
        } else if (currentPage === 6) {
            setScreenWidth("max-w-5xl");
        }
    }, [selectedTab, currentPage, setScreenWidth]);


    const [processedData, setProcessedData] = useState([]);
    const [columns, setColumns] = useState([]);
    const lastGlobalData = useRef(null); // Track last global state


    // --------- Global → Grid Sync ---------
    const gridDataFromGlobal = useMemo(() => {
        return getStructuredVariables(studyVariables, studies, studyToStudyVariableMapping);
    }, [studyVariables, studies, studyToStudyVariableMapping]);


    // --- Global Data to Local Grid Data Sync ---
    useEffect(() => {
        // Only sync if global data actually changed (not just processedData)
        if (!isEqual(lastGlobalData.current, gridDataFromGlobal)) {
            console.log("Updating grid data from global state:", gridDataFromGlobal);
            lastGlobalData.current = gridDataFromGlobal; // Store new global state
            setProcessedData(gridDataFromGlobal);
        }
    }, [gridDataFromGlobal]);

    // --------- Grid → Global Sync ---------
    useEffect(() => {
        // Skip if no data or if processedData matches last known global state
        if (processedData.length === 0 || isEqual(processedData, lastGlobalData.current)) {
            return;
        }

        // This update came from grid, sync to global
        const flattened = flattenGridDataToMappings(processedData, studies);
        setStudyToStudyVariableMapping(flattened);

    }, [processedData, studies]);


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
                name: `Study S${(index + 1).toString().padStart(2, '0')}`,
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
                        itemHook={useVariables}
                        columns={columns}
                    />
                </TabPanel>
            </div>
        </div>
    );
});

StudyVariableSlide.displayName = "Study Variables"; // Set display name for better debugging

export default StudyVariableSlide;