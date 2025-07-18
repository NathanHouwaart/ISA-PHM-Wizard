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


export const MeasurementOutputSlide = forwardRef(({ onHeightChange, currentPage }, ref) => {

    const [selectedTab, setSelectedTab] = useState('simple-view'); // State to manage selected tab

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    const {
        studies,
        testSetups,
        setScreenWidth,
        selectedTestSetup,
        studyToSensorMeasurementMapping,
        setStudyToSensorMeasurementMapping
    } = useGlobalDataContext();

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

    // --------- Global → Grid Sync ---------
    const gridDataFromGlobal = useMemo(() => {
        if (!selectedTestSetup || !studies || !studyToSensorMeasurementMapping) {
            return [];
        }
        return getStructuredVariables(selectedTestSetup.sensors, studies, studyToSensorMeasurementMapping);
    }, [studies, selectedTestSetup, studyToSensorMeasurementMapping]);

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

        const flattenedMappings = flattenGridDataToMappings(processedData, studies, 'sensorId');
        setStudyToSensorMeasurementMapping(flattenedMappings);

    }, [processedData, studies]);


    // Standalone Effect to initialize columns for grid view
    useEffect(() => {
        setColumns([
            { prop: 'id', name: 'Identifier', pin: 'colPinStart', readonly: true, size: 100, cellTemplate: Template(PatternCellTemplate, { prefix : "Sensor S"}), cellProperties: GrayCell, },
            { prop: 'measurementType', name: 'Type', size: 150, readonly: true },
            { prop: 'measurementUnit', name: 'Unit', readonly: true },
            {
                prop: 'description', name: 'Description', size: 350, readonly: true, cellProperties: () => {
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
    }, [studies]);

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