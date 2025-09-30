import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Import hooks
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import useProcessingProtocols from '../../hooks/useProcessingProtocols';

// Import the single global provider
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';

// Import components
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';
import TabSwitcher, { TabPanel } from '../TabSwitcher';

// Data Grid Imports
import { Template } from '@revolist/react-datagrid';
import { BoldCell, DeleteRowCellTemplate } from '../GridTable/CellTemplates';

// Import utility functions
import usePageTab from '../../hooks/usePageWidth';
import DataGrid from '../DataGrid';
import useMappingsController from '../../hooks/useMappingsController';
import EntityMappingPanel from '../EntityMappingPanel';
import { WINDOW_HEIGHT } from '../../constants/slideWindowHeight';


export const ProcessingProtocolsSlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {

    // Use persistent tab state that remembers across page navigation
    const [selectedTab, setSelectedTab] = usePageTab(pageIndex, 'simple-view'); // State to manage selected tab

    // Observe height changes
    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    // Access global context
    const {
        studies,
        testSetups,
        setScreenWidth,
        selectedTestSetupId,
        processingProtocols,
        setProcessingProtocols,
        sensorToProcessingProtocolMapping,
        setSensorToProcessingProtocolMapping,
        setTestSetups,
        studyToSensorMeasurementMapping,
        setStudyToSensorMeasurementMapping
    } = useGlobalDataContext();

    const selectedTestSetup = testSetups.find(setup => setup.id === selectedTestSetupId);

    
    // Manage the sensor <-> processing protocol mappings
    // Use canonical mapping field names (sourceId/targetId) so the grid and
    // global mappings stay consistent.
    const mappingsController = useMappingsController(
        'sensorToProcessingProtocolMapping',
        { sourceKey: 'sourceId', targetKey: 'targetId' }
    );

    // Handle data grid changes (use controller to keep canonical mapping)
    const handleDataGridMappingsChange = useCallback((newMappings) => {
        mappingsController.setMappings(newMappings);
    }, [mappingsController]);

    // Screen width is managed globally by IsaQuestionnaire based on persisted tab state.

    // Helper function to generate unique IDs
    const generateId = () => {
        return crypto.randomUUID();
    };

    // Handle input changes in EntityMappingPanel
    const addNewProtocol = () => {
        const newProtocol = {
            id: generateId(),
            name: `New Protocol ${processingProtocols.length + 1}`,
            type: 'Enter type...',
            unit: '',
            description: 'Enter description...'
        };
        // If the Processing Protocols grid is active, use DataGrid's history-aware API
        // if (gridMode === 'sensor-protocols' && callGridMethod('addRow', newProtocol)) return;
        setProcessingProtocols([...processingProtocols, newProtocol]);
    };

    const removeLastProtocol = () => {
        // if (gridMode === 'sensor-protocols' && callGridMethod('removeLastRow')) return;
        if (processingProtocols.length > 0) {
            setProcessingProtocols(processingProtocols.slice(0, -1));
        }
    };

    // // Handle cell edits in the grid
    // const handleDataGridMappingsChange = useCallback((newMappings) => {
    //     setSensorToProcessingProtocolMapping(newMappings);
    // }, [setSensorToProcessingProtocolMapping]);

    // Handle row data changes
    const handleDataGridRowDataChange = useCallback((newRowData) => {
        setProcessingProtocols(newRowData);
    }, [setProcessingProtocols]);

    // Grid configuration for processing protocols
    const processingProtocolsGridConfig = {
        title: 'Processing Protocols to Sensors Grid',
        rowData: processingProtocols,            // Protocols are now rows
        columnData: selectedTestSetup?.sensors || [],           // Sensors are now columns
        mappings: mappingsController.mappings, // Mappings from sensors to protocols
        fieldMappings: {
            rowId: 'id',
            rowName: 'name',
            columnId: 'id',
            columnName: 'alias',            // Sensors use 'alias' as name
            columnUnit: 'measurementUnit',  // Sensors have measurementUnit
            mappingRowId: 'targetId',       // Swapped: protocols are now rows (were targets)
            mappingColumnId: 'sourceId',    // Swapped: sensors are now columns (were sources)
            mappingValue: 'value',
            hasChildColumns: true           // Enable child columns for specification and unit
        },
        staticColumns: [
            {
                prop: 'actions',
                name: '',
                size: 80,
                readonly: true,
                pin: 'colPinStart',
                cellTemplate: Template(DeleteRowCellTemplate),
                cellProperties: () => ({ style: { 'text-align': 'center' } })
            },
            {
                prop: 'name',
                name: 'Protocol Name',
                size: 200,
                // readonly: true,
                pin: 'colPinStart',
                cellTemplate: Template(BoldCell),
            },
            {
                prop: 'description',
                name: 'Description',
                size: 300,
                // readonly: true,
                cellProperties: () => {
                    return {
                        style: {
                            "border-right": "3px solid "
                        }
                    }
                }
            }
        ],
        customActions: [
            {
                label: '+ Add Protocol',
                onClick: addNewProtocol,
                className: 'px-3 py-1 text-sm bg-purple-50 text-purple-700 border border-purple-300 rounded hover:bg-purple-100',
                title: 'Add a new protocol'
            },
            {
                label: '- Remove Last',
                onClick: removeLastProtocol,
                disabled: processingProtocols.length === 0,
                className: `px-3 py-1 text-sm border rounded ${processingProtocols.length === 0
                    ? 'bg-gray-50 text-gray-400 border-gray-300 cursor-not-allowed'
                    : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                    }`,
                title: 'Remove the last protocol'
            }
        ],
    };

    return (
        <div ref={combinedRef} >

            <SlidePageTitle>
                Data Processing Protocols
            </SlidePageTitle>

            <SlidePageSubtitle>
                Data processing protocols describe the processes undertaken to obtain processed data files from raw measurements. This slide allows you to view and manage the data processing protocols for the data derived from each sensor used in the studies. You can switch between a simple list view and a grid view.
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
                        itemHook={useProcessingProtocols}
                        mappings={mappingsController.mappings}
                        handleInputChange={mappingsController.updateMappingValue}
                        minHeight={WINDOW_HEIGHT}
                    />

                </TabPanel>

                <TabPanel isActive={selectedTab === 'grid-view'}>
                    <DataGrid
                        {...processingProtocolsGridConfig}
                        showControls={true}
                        showDebug={false}
                        onDataChange={handleDataGridMappingsChange}
                        onRowDataChange={handleDataGridRowDataChange}
                        height={WINDOW_HEIGHT}
                        isActive={selectedTab === 'grid-view' && currentPage === pageIndex}
                    />

                </TabPanel>
            </div>
        </div>
    );
});

ProcessingProtocolsSlide.displayName = "Processing Protocols";

export default ProcessingProtocolsSlide;