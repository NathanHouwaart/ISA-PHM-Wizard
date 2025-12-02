import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Layers } from 'lucide-react';

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
import WarningBanner from '../Widgets/WarningBanner';

// Data Grid Imports
import { Template } from '@revolist/react-datagrid';
import { BoldCell, DeleteRowCellTemplate} from '../DataGrid/CellTemplates';

// Import utility functions
import usePageTab from '../../hooks/usePageWidth';
import DataGrid from '../DataGrid/DataGrid';
import useMappingsController from '../../hooks/useMappingsController';
import EntityMappingPanel from '../EntityMappingPanel';
import { WINDOW_HEIGHT } from '../../constants/slideWindowHeight';
import generateId from '../../utils/generateId';

export const ProcessingProtocolsSlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {

    // Use persistent tab state that remembers across page navigation
    const [selectedTab, setSelectedTab] = usePageTab(pageIndex, 'simple-view'); // State to manage selected tab

    // Observe height changes
    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    // Access global context
    const {
        testSetups,
        selectedTestSetupId,
        processingProtocols,
        setProcessingProtocols,
    } = useGlobalDataContext();

    const selectedTestSetup = testSetups.find(setup => setup.id === selectedTestSetupId);

    const sensors = Array.isArray(selectedTestSetup?.sensors)
        ? selectedTestSetup.sensors
        : (selectedTestSetup?.sensors ? Object.entries(selectedTestSetup.sensors).map(([id, s]) => ({ id, ...s })) : []);

    
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

    // Handle input changes in EntityMappingPanel
    const addNewProtocol = () => {
        const newProtocol = {
            id: generateId(),
            name: `New Protocol ${processingProtocols.length + 1}`,
            unit: '',
            description: 'Enter description...'
        };
        // If the Processing Protocols grid is active, use DataGrid's history-aware API
        // if (gridMode === 'sensor-protocols' && callGridMethod('addRow', newProtocol)) return;
        setProcessingProtocols([...processingProtocols, newProtocol]);
    };

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

                {/* Warning banners */}
                {!selectedTestSetupId && (
                    <WarningBanner type="warning" icon={Layers}>
                        <strong>No test setup selected.</strong> Go to the project settings <Layers className="inline w-4 h-4 mx-1" /> and select a test setup for your project.
                    </WarningBanner>
                )}
                {selectedTestSetupId && sensors.length === 0 && (
                    <WarningBanner type="info">
                        <strong>No sensors in test setup.</strong> The selected test setup must contain one or more sensors to define processing protocols. Add sensors to your test setup or select a different one.
                    </WarningBanner>
                )}

                <TabPanel isActive={selectedTab === 'simple-view'}>
                    <div className="h-[45vh] overflow-y-auto">
                        <EntityMappingPanel
                            name={`Processing Protocols for ${selectedTestSetup?.name || 'Selected Test Setup'}`}
                            itemHook={useProcessingProtocols}
                            mappings={mappingsController.mappings}
                            handleInputChange={mappingsController.updateMappingValue}
                            minHeight={WINDOW_HEIGHT}
                        />
                    </div>
                </TabPanel>

                <TabPanel isActive={selectedTab === 'grid-view'}>
                    <DataGrid
                        {...processingProtocolsGridConfig}
                        height="45vh"
                        showControls={true}
                        showDebug={false}
                        onDataChange={handleDataGridMappingsChange}
                        onRowDataChange={handleDataGridRowDataChange}
                        isActive={selectedTab === 'grid-view' && currentPage === pageIndex}
                    />
                </TabPanel>
            </div>
        </div>
    );
});

ProcessingProtocolsSlide.displayName = "Processing Protocols";

export default ProcessingProtocolsSlide;
