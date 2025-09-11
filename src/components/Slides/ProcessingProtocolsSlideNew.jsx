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
import {getGenericTransposedGridData, flattenGenericTransposedGridData } from '../../utils/utils';

import isEqual from 'lodash.isequal';

export const ProcessingProtocolsSlideNew = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {

    const [selectedTab, setSelectedTab] = useState('grid-view'); // State to manage selected tab

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    const {
        processingProtocols,
        setProcessingProtocols,
        testSetups,
        setScreenWidth,
        selectedTestSetupId,
        sensorToProcessingProtocolMapping,
        setSensorToProcessingProtocolMapping,
    } = useGlobalDataContext();

    const selectedTestSetup = testSetups.find(setup => setup.id === selectedTestSetupId);

    // Screen width is managed globally by IsaQuestionnaire based on persisted tab state.


    const [processedData, setProcessedData] = useState([]);
    const [columns, setColumns] = useState([]);
    const isUpdatingFromGlobal = useRef(false);

    // --------- Global → Grid Sync (Transposed) ---------
    const gridDataFromGlobal = useMemo(() => {
        const data = getGenericTransposedGridData(
            selectedTestSetup?.sensors,        // sourceItems (sensors)
            processingProtocols,               // targetItems (processing protocols)
            sensorToProcessingProtocolMapping  // mappings
        );

        console.log(selectedTestSetup?.sensors)
        console.log(processingProtocols)
        console.log(sensorToProcessingProtocolMapping)

        console.log("New Grid Data From Global:", data);
        return data;
    }, [processingProtocols, selectedTestSetup, sensorToProcessingProtocolMapping]); // Also fix dependencies

  

    // --- Global Data to Local Grid Data Sync ---
    useEffect(() => {
        if (!isEqual(processedData, gridDataFromGlobal)) {
            isUpdatingFromGlobal.current = true;
            setProcessedData(gridDataFromGlobal);
        }
    }, [gridDataFromGlobal]);

    // --------- Grid → Global Sync (Transposed) ---------
    useEffect(() => {
        if (isUpdatingFromGlobal.current) {
            isUpdatingFromGlobal.current = false;
            return;
        }

        // Use the new generic function with correct parameters
        const mappings = flattenGenericTransposedGridData(
            processedData,                    // gridData (processing protocols as rows)
            selectedTestSetup?.sensors || [], // sourceItems (sensors)
            'sourceId',                       // sourceKey
            'targetId'                        // targetKey
        );

        // UPDATE: Add this missing line to actually save the mappings!
        setSensorToProcessingProtocolMapping(mappings);

        console.log("Saving mappings to global state:", mappings);
    }, [processedData, selectedTestSetup]);

    useEffect(() => {
        console.log("Processed Data Updated:", processedData);
    }, [processedData]);


    // Transposed Column Structure
// Update your columns useEffect - REMOVE Template() wrapper
useEffect(() => {
    setColumns([
        {
            prop: 'id',
            name: 'Protocol ID',
            pin: 'colPinStart',
            readonly: true,
            size: 100,
            cellTemplate: Template(PatternCellTemplate, { prefix: "Protocol P" }),
            cellProperties: GrayCell
        },
        {
            prop: 'name',
            name: 'Protocol Name',
            size: 200,
        },
        {
            prop: 'description',
            name: 'Description',
            size: 300,
            cellProperties: () => ({
                style: { "border-right": "3px solid black" }
            })
        },
        // Use ArrayCellTemplate directly WITHOUT Template wrapper
...(selectedTestSetup?.sensors || []).map((sensor, index) => ({
    prop: sensor.id,
    name: `Sensor S${(index + 1).toString().padStart(2, '0')}`,
    children: [
        {
            prop: `${sensor.id}_spec`,
            name: "Specification",
            size: 138,
            editor: 'input'
        },
        {
            prop: `${sensor.id}_unit`,
            name: "Unit", 
            size: 50,
            editor: 'input',
            cellProperties: () => ({
                style: { "border-right": "3px solid black" }
            })
        }
    ],
    size: 150
}))
    ]);
}, [selectedTestSetup]);

// Add this BEFORE your return statement:
const handleGridChange = (updater) => {
    let newData;
    console.log("Grid Change Detected.");
    
    if (typeof updater === 'function') {
        newData = updater(processedData);
    } else {
        newData = updater;
    }

    console.log("Grid Change Detected. New Data:", newData);
    
    
    // Update global processing protocols
    const baseProtocols = fixedData.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        unit: row.unit,
        description: row.description
    }));
    setProcessingProtocols(baseProtocols);
};
    
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
                        { id: 'simple-view', label: 'Simple View', tooltip: 'View measurements in a simple list format' },
                        { id: 'grid-view', label: 'Grid View', tooltip: 'View measurements in a grid format for better data management' },
                    ]}
                />

                <TabPanel isActive={selectedTab === 'simple-view'}>
                    <p>MT for now</p>
                </TabPanel>

                <TabPanel isActive={selectedTab === 'grid-view'}>
                <GridTable
                    items={processedData}
                    setItems={handleGridChange} 
                    columns={columns}
                />
                </TabPanel>
            </div>
        </div>
    );
});

ProcessingProtocolsSlideNew.displayName = "Processing Protocols"; // Set display name for better debugging

export default ProcessingProtocolsSlideNew;