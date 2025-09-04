import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react'

// Import hooks
import useMeasurements from '../../hooks/useMeasurements';
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
import { GrayCell, PatternCellTemplate } from '../GridTable/CellTemplates';

// Import utility functions
import { flattenGridDataToMappings, getStructuredVariables } from '../../utils/utils';
import isEqual from 'lodash.isequal';

import { getTransposedGridData, flattenTransposedGridData, getTransposedColumns } from '../../utils/utils';


export const ProcessingOutputSlide = forwardRef(({ onHeightChange, currentPage }, ref) => {

    const [selectedTab, setSelectedTab] = useState('simple-view'); // State to manage selected tab

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    const {
        studies,
        testSetups,
        setScreenWidth,
        selectedTestSetupId,
        studyToSensorProcessingMapping,
        setStudyToSensorProcessingMapping,
    } = useGlobalDataContext();

    const selectedTestSetup = testSetups.find(setup => setup.id === selectedTestSetupId);

    useEffect(() => {
        if (selectedTab === 'grid-view' && currentPage === 9) {
            setScreenWidth("max-w-[100rem]");
        } else if (currentPage === 9) {
            setScreenWidth("max-w-5xl");
        }
    }, [selectedTab, currentPage, setScreenWidth]);


    const [processedData, setProcessedData] = useState([]);
    const [columns, setColumns] = useState([]);
    const isUpdatingFromGlobal = useRef(false);

    // --------- Global → Grid Sync ---------
    const gridDataFromGlobal = useMemo(() => {
        return getTransposedGridData(studies, selectedTestSetup?.sensors, studyToSensorProcessingMapping);
    }, [studies, selectedTestSetup, studyToSensorProcessingMapping]);


    // --- Global Data to Local Grid Data Sync ---
    useEffect(() => {
        if (!isEqual(processedData, gridDataFromGlobal)) {
            isUpdatingFromGlobal.current = true; // Set flag to indicate update from global
            setProcessedData(gridDataFromGlobal);
        }
    }, [selectedTestSetup, testSetups]);

    // --------- Grid → Global Sync ---------
    useEffect(() => {
        if (isUpdatingFromGlobal.current) {
            isUpdatingFromGlobal.current = false;
            return;
        }

        const mappings = flattenTransposedGridData(processedData, selectedTestSetup?.sensors || []);
        setStudyToSensorProcessingMapping(mappings);
    }, [processedData, selectedTestSetup]);


    // Standalone Effect to initialize columns for grid view
    useEffect(() => {
        const columns = getTransposedColumns(
            studies, 
            selectedTestSetup?.sensors,
            "Sensor S"
        );
        setColumns(columns);
    }, [selectedTestSetup, studies]);

    const handleInputChange = (variableIndex, mapping, value) => {
        setProcessedData(prevData => {
            const newData = [...prevData];

            const entry = newData.find(sensor => sensor.id === mapping.sensorId)
            entry[mapping.studyId] = value; // Update the specific study's value

            return newData;
        });
    };

    return (
        <div ref={combinedRef} >

            <SlidePageTitle>
                Processing Protocol Output
            </SlidePageTitle>

            <SlidePageSubtitle>
                This slide allows you to view and edit the output of processing protocols across different studies. You can switch between a simple view and a grid view for better data management.
            </SlidePageSubtitle>

            <div className='bg-gray-50 p-3 border-gray-300 border rounded-lg pb-2 relative'>

                <TabSwitcher
                    selectedTab={selectedTab}
                    onTabChange={setSelectedTab}
                    tabs={[
                        { id: 'simple-view', label: 'Simple View', tooltip: 'View measurements in a simple list format' },
                        { id: 'grid-view', label: 'Grid View', tooltip: 'View measurements in a grid format for better data management' }
                    ]}
                />

                <TabPanel isActive={selectedTab === 'simple-view'}>
                    
                    <EntityMappingPanel
                        name={`Processing Protocol Mapping`}
                        tileNamePrefix="Study S"
                        items={studies}
                        itemHook={useMeasurements}
                        mappings={studyToSensorProcessingMapping}
                        handleInputChange={handleInputChange}
                        disableAdd
                    />
             
                </TabPanel>

                <TabPanel isActive={selectedTab === 'grid-view'}>
                    <GridTable 
                        items={processedData} 
                        setItems={setProcessedData} 
                        columns={columns} 
                        disableAdd
                    />
                </TabPanel>
            </div>
        </div>
    );
});

ProcessingOutputSlide.displayName = "Processing Output Slide"; // Set display name for better debugging

export default ProcessingOutputSlide;