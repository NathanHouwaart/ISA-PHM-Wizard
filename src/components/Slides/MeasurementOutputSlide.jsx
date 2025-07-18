import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react'

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';
import { GridTable, BoldCell } from '../GridTable/GridTable';
import { Template } from '@revolist/react-datagrid';
import { flattenGridDataToMappings, getStructuredVariables } from '../../utils/utils';
import isEqual from 'lodash.isequal';
import TabSwitcher, { TabPanel } from '../TabSwitcher';
import EntityMappingPanel from '../EntityMappingPanel';
import useMeasurements from '../../hooks/useMeasurements';
import FormField from '../Form/FormField';
import { PlusCircleIcon } from 'lucide-react';

const GrayCell = () => {
    return {
        style: {
            "background-color": '#e7e8e9',
        }
    }
}

export const MeasurementOutputSlide = forwardRef(({ onHeightChange, currentPage }, ref) => {

    const [selectedTab, setSelectedTab] = useState('simple-view'); // State to manage selected tab

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);


    const {
        studies,
        testSetups,
        setScreenWidth,
        selectedTestSetup,
        isInitialized,
        studyToSensorMeasurementMapping,
        setStudyToSensorMeasurementMapping
    } = useGlobalDataContext();

    const [selectedStudyIndex, setSelectedStudyIndex] = useState(0); // State to track selected variable index

    useEffect(() => {
        if (selectedTab === 'grid-view' && currentPage === 7) {
            setScreenWidth("max-w-[100rem]");
        } else if (currentPage === 7) {
            setScreenWidth("max-w-5xl");
        }
    }, [selectedTab, currentPage, setScreenWidth]);

    const selectedStudy = studies[selectedStudyIndex];

    const [processedData, setProcessedData] = useState([]);
    const [columns, setColumns] = useState([]);

    // --------- Global → Grid Sync ---------
    const gridData = useMemo(() => {
        if (!selectedTestSetup || !studies || !studyToSensorMeasurementMapping) {
            return [];
        }
        console.log("Grid data input:", selectedTestSetup, studies, studyToSensorMeasurementMapping);
        const vars = getStructuredVariables(selectedTestSetup.sensors, studies, studyToSensorMeasurementMapping);
        console.log("Grid data generated:", vars);
        return vars;
    }, [studies, selectedTestSetup, studyToSensorMeasurementMapping]);

    // Apply flattened data to local state only when global data changes
    useEffect(() => {

        if (!isEqual(processedData, gridData)) {
            setProcessedData(gridData);
        }
    }, [selectedTestSetup, testSetups]);

    // --------- Grid → Global Sync ---------
    useEffect(() => {

        // const timeout = setTimeout(() => {
            const flattenedMappings = flattenGridDataToMappings(processedData, studies, 'sensorId');
            setStudyToSensorMeasurementMapping(flattenedMappings);
        // }, 0);

        // return () => clearTimeout(timeout);
    }, [processedData, studies]);


    // Standalone Effect to initialize columns for grid view
    useEffect(() => {
        setColumns([
            { prop: 'id', name: 'Id', pin: 'colPinStart', readonly: true, size: 100, cellTemplate: Template(BoldCell), cellProperties: GrayCell, },
            { prop: 'measurement_type', name: 'Type', size: 150, readonly: true },
            { prop: 'measurement_unit', name: 'Unit', readonly: true },
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
                name: `S${(index + 1).toString().padStart(2, '0')}`,
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
                        name={`Sensor output`}
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