import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Import hooks
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import useMeasurementProtocols from '../../hooks/useMeasurementProtocols';

// Import the single global provider
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';

// Import components
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';
import TabSwitcher, { TabPanel } from '../TabSwitcher';

// Data Grid Imports
import { Template } from '@revolist/react-datagrid';
import { BoldCell, DeleteRowCellTemplate} from '../DataGrid/CellTemplates';

// Import utility functions
import usePageTab from '../../hooks/usePageWidth';
import DataGrid from '../DataGrid/DataGrid';
import useMappingsController from '../../hooks/useMappingsController';
import EntityMappingPanel from '../EntityMappingPanel';
import { WINDOW_HEIGHT } from '../../constants/slideWindowHeight';


export const MeasurementProtocolSlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {

    // Use persistent tab state that remembers across page navigation
    const [selectedTab, setSelectedTab] = usePageTab(pageIndex, 'simple-view'); // State to manage selected tab

    // Observe height changes
    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    // Access global context
    const {
        testSetups,
        selectedTestSetupId,
        measurementProtocols,
        setMeasurementProtocols
    } = useGlobalDataContext();

    const selectedTestSetup = testSetups.find(setup => setup.id === selectedTestSetupId);

    
    // Manage the sensor <-> processing protocol mappings
    // Use canonical mapping field names (sourceId/targetId) so the grid and
    // global mappings stay consistent.
    const mappingsController = useMappingsController(
        'sensorToMeasurementProtocolMapping',
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
            name: `New Protocol ${measurementProtocols.length + 1}`,
            unit: '',
            description: 'Enter description...'
        };
        // If the Measurement Protocols grid is active, use DataGrid's history-aware API
        // if (gridMode === 'sensor-protocols' && callGridMethod('addRow', newProtocol)) return;
        setMeasurementProtocols([...measurementProtocols, newProtocol]);
    };

    // Handle row data changes
    const handleDataGridRowDataChange = useCallback((newRowData) => {
        setMeasurementProtocols(newRowData);
    }, [setMeasurementProtocols]);

    // Grid configuration for measurement protocols
    const measurementProtocolsGridConfig = {
        title: 'Measurement Protocols to Sensors Grid',
        rowData: measurementProtocols,            // Protocols are now rows
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
            }
        ],
    };

    return (
        <div ref={combinedRef} >

            <SlidePageTitle>
                Measurement Protocols
            </SlidePageTitle>

            <SlidePageSubtitle>
                Measurement protocols describe how raw measurement data is acquired. Use this slide to view and manage per-sensor measurement protocol records and acquisition metadata such as sampling rate, phase, data acquisition unit, orientation, calibration parameters, and other sensor-specific settings.
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
                        name={`Measurement Protocols for ${selectedTestSetup?.name || 'Selected Test Setup'}`}
                        itemHook={useMeasurementProtocols}
                        mappings={mappingsController.mappings}
                        handleInputChange={mappingsController.updateMappingValue}
                        minHeight={WINDOW_HEIGHT}
                    />

                </TabPanel>

                <TabPanel isActive={selectedTab === 'grid-view'}>
                    <DataGrid
                        {...measurementProtocolsGridConfig}
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

MeasurementProtocolSlide.displayName = "Measurement Protocols";

export default MeasurementProtocolSlide;