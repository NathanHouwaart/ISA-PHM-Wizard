import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'

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
import useProcessingProtocols from '../../hooks/useProcessingProtocols';


export const ProcessingProtocolsSlide = forwardRef(({ onHeightChange, currentPage }, ref) => {

    const [selectedTab, setSelectedTab] = useState('simple-view'); // State to manage selected tab

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    const {
        studies,
        testSetups,
        setScreenWidth,
        selectedTestSetupId,
        setTestSetups,
        studyToSensorMeasurementMapping,
        setStudyToSensorMeasurementMapping,
        sensorToProcessingProtocolMapping,
        setSensorToProcessingProtocolMapping
    } = useGlobalDataContext();

        
    const selectedTestSetup = testSetups.find(setup => setup.id === selectedTestSetupId);

    useEffect(() => {
        if (selectedTab === 'grid-view' && currentPage === 8) {
            setScreenWidth("max-w-[100rem]");
        } else if (currentPage === 8) {
            setScreenWidth("max-w-5xl");
        }
    }, [selectedTab, currentPage, setScreenWidth]);


    const [processedData, setProcessedData] = useState([]);
    const [columns, setColumns] = useState([]);
    const isUpdatingFromGlobal = useRef(false);

    // --------- Global → Grid Sync ---------
    const gridDataFromGlobal = useMemo(() => {
        // Extract every field from the sensors in the selected test setup
       return Object.entries(selectedTestSetup?.sensors || {}).map(([sensorId, sensor]) => {
           return {
               id: sensorId,
               ...sensor
           };
       });

    }, [testSetups, selectedTestSetup]);

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

        setTestSetups(prev => {
            const updatedTestSetups = prev.map(testSetup => {
                if (testSetup.id === selectedTestSetupId) {
                    return {
                        ...testSetup,
                        sensors: processedData.map(sensor => {
                            return Object.entries(sensor).reduce((acc, [key, value]) => {
                                acc[key] = value;
                                return acc;
                            }, {});
                        })
                    };
                }
                return testSetup;
            });
            return updatedTestSetups;
        });

      
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
            { prop: 'filterType', name: 'Filter Type',
                 children : [
                    { prop: 'filterTypeSpecification', name: 'Specification', size: 138},
                    { prop: 'filterTypeUnit', name: 'Unit', size: 50, cellProperties: () =>{ return { style: { "border-right": "3px solid black" } } } }
                ]
            },
            { prop: 'chunkSize', name: 'Chunk Size',
                children : [
                    { prop: 'chunkSizeSpecification', name: 'Specification', size: 138},
                    { prop: 'chunkSizeUnit', name: 'Unit', size: 50, cellProperties: () =>{ return { style: { "border-right": "3px solid black" } } } }
                ]
            },
            { prop: 'scalingRange', name: 'Scaling Range', 
                children : [
                    { prop: 'scalingRangeSpecification', name: 'Specification', size: 138},
                    { prop: 'scalingRangeUnit', name: 'Unit', size: 50, cellProperties: () =>{ return { style: { "border-right": "3px solid black" } } } }
                ]
            },
            { prop: 'scalingResolution', name: 'Scaling Resolution', 
                children : [
                    { prop: 'scalingResolutionSpecification', name: 'Specification', size: 138},
                    { prop: 'scalingResolutionUnit', name: 'Unit', size: 50 }
                ]
            },
        ])
    }, [selectedTestSetup]);

    const handleInputChange = (index, event) => {
        setProcessedData(prevData => {
            const newData = [...prevData];

            const { name, value } = event.target;

            newData[index] = {
                ...newData[index],
                [name]: value
            };
            return newData;
        });
    };

    return (
        <div ref={combinedRef} >

            <SlidePageTitle>
                Processing Protocols
            </SlidePageTitle>

            <SlidePageSubtitle>
                This slide allows you to view and manage the processing protocols for each sensor used in the studies. You can switch between a simple list view and a grid view for better data management.
            </SlidePageSubtitle>

            <div className='bg-gray-50 p-3 border-gray-300 border rounded-lg pb-2 relative'>

                <TabSwitcher
                    selectedTab={selectedTab}
                    onTabChange={setSelectedTab}
                    tabs={[
                        { id: 'simple-view', label: 'Simple View', tooltip: 'View processing protocols in a simple list format' },
                        { id: 'grid-view', label: 'Grid View', tooltip: 'View processing protocols in a grid format for better data management' }
                    ]}
                />

                <TabPanel isActive={selectedTab === 'simple-view'}>
                    
                    <EntityMappingPanel
                        name={`Processing Protocols for ${selectedTestSetup?.name || 'Selected Test Setup'}`}
                        tileNamePrefix="Sensor S"
                        items={selectedTestSetup?.sensors || []}
                        itemHook={useProcessingProtocols}
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

ProcessingProtocolsSlide.displayName = "Processing Protocols"; // Set display name for better debugging

export default ProcessingProtocolsSlide;