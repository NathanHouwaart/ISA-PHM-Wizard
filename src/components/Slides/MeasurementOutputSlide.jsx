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
import { getTransposedGridData, flattenTransposedGridData, getTransposedColumns } from '../../utils/utils';

import isEqual from 'lodash.isequal';


export const MeasurementOutputSlide = forwardRef(({ onHeightChange, currentPage }, ref) => {

    const [selectedTab, setSelectedTab] = useState('simple-view'); // State to manage selected tab

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    const {
        studies,
        testSetups,
        setScreenWidth,
        selectedTestSetupId,
        studyToSensorMeasurementMapping,
        setStudyToSensorMeasurementMapping
    } = useGlobalDataContext();

    const selectedTestSetup = testSetups.find(setup => setup.id === selectedTestSetupId);

    useEffect(() => {
        if (selectedTab === 'grid-view' && currentPage === 7) {
            setScreenWidth("max-w-[100rem]");
        } else if (currentPage === 7) {
            setScreenWidth("max-w-5xl");
        }
    }, [selectedTab, currentPage, setScreenWidth]);


    const [processedData, setProcessedData] = useState([]);
    const [columns, setColumns] = useState([]);
    const isUpdatingFromGlobal = useRef(false);

        // --------- Global → Grid Sync (Transposed) ---------
    const gridDataFromGlobal = useMemo(() => {
        return getTransposedGridData(studies, selectedTestSetup?.sensors, studyToSensorMeasurementMapping);
    }, [studies, selectedTestSetup, studyToSensorMeasurementMapping]);


    // --- Global Data to Local Grid Data Sync ---
    useEffect(() => {
        if (!isEqual(processedData, gridDataFromGlobal)) {
            isUpdatingFromGlobal.current = true; // Set flag to indicate update from global
            setProcessedData(gridDataFromGlobal);
        }
    }, [selectedTestSetup, testSetups]);

   // --------- Grid → Global Sync (Transposed) ---------
    useEffect(() => {
        if (isUpdatingFromGlobal.current) {
            isUpdatingFromGlobal.current = false;
            return;
        }

        const mappings = flattenTransposedGridData(processedData, selectedTestSetup?.sensors || []);
        setStudyToSensorMeasurementMapping(mappings);
    }, [processedData, selectedTestSetup]);


   // Transposed Column Structure
    useEffect(() => {
        setColumns([
            { 
                prop: 'id', 
                name: 'Study ID', 
                pin: 'colPinStart', 
                readonly: true, 
                size: 100, 
                cellTemplate: Template(PatternCellTemplate, { prefix: "Study S" }), 
                cellProperties: GrayCell 
            },
            { prop: 'name', name: 'Study Name', size: 200, readonly: true },
            { 
                prop: 'description', 
                name: 'Description', 
                size: 300, 
                readonly: true,
                cellProperties: () => ({
                    style: { "border-right": "3px solid black" }
                })
            },
            // Add sensors as columns
            ...(selectedTestSetup?.sensors || []).map((sensor, index) => ({
                prop: sensor.id,
                name: `Sensor S${(index + 1).toString().padStart(2, '0')}`,
                size: 150
            }))
        ]);
    }, [selectedTestSetup]);

    const handleInputChange = (studyIndex, mapping, value) => {
        setProcessedData(prevData => {
            const newData = [...prevData];
            const studyRow = newData.find(row => row.id === mapping.studyId);
            if (studyRow) {
                studyRow[mapping.sensorId] = value;
            }
            return newData;
        });
    };

    return (
        <div ref={combinedRef} >

            <SlidePageTitle>
                Measurement Output
            </SlidePageTitle>

            <SlidePageSubtitle>
                This slide allows you to view and edit the output of measurements across different studies. You can switch between a simple view and a grid view for better data management.
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
                        name={`Sensor Output Mapping`}
                        tileNamePrefix="Study S"
                        items={studies}
                        itemHook={useMeasurements}
                        mappings={studyToSensorMeasurementMapping}
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

MeasurementOutputSlide.displayName = "Measurement Output"; // Set display name for better debugging

export default MeasurementOutputSlide;