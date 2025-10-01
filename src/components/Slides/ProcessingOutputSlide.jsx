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

// Data Grid Imports
import { Template } from '@revolist/react-datagrid';
import { PatternCellTemplate } from '../DataGrid/CellTemplates';

import usePageTab from '../../hooks/usePageWidth';
import DataGrid from '../DataGrid/DataGrid';
import useMappingsController from '../../hooks/useMappingsController';
import EntityMappingPanel from '../EntityMappingPanel';
import { WINDOW_HEIGHT } from '../../constants/slideWindowHeight';
import FilePickerPlugin from '../DataGrid/FilePickerPlugin';


export const ProcessingOutputSlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {

    // Use persistent tab state that remembers across page navigation
    const [selectedTab, setSelectedTab] = usePageTab(pageIndex, 'simple-view'); // State to manage selected tab

    // Observe height changes
    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    // Access global context
    const {
        studies,
        testSetups,
        selectedTestSetupId,
        studyToSensorProcessingMapping,
        setStudyToSensorProcessingMapping,
    } = useGlobalDataContext();

    const selectedTestSetup = testSetups.find(setup => setup.id === selectedTestSetupId);

    const mappingsController = useMappingsController(
        'studyToSensorProcessingMapping',
        { sourceKey: 'sensorId', targetKey: 'studyId' }
    );

    // Screen width is managed globally by IsaQuestionnaire based on persisted tab state.

    // Handle data grid changes
    const handleDataGridMappingsChange = useCallback((newMappings) => {
        mappingsController.setMappings(newMappings);
    }, [setStudyToSensorProcessingMapping]);

    // Grid configuration for mapping studies to processing protocols output
    const processingOutputGridConfig = {
        title: 'Mappings for processing protocol output',
        rowData: studies,
        columnData: selectedTestSetup?.sensors || [],
        mappings: mappingsController.mappings,
        fieldMappings: {
            rowId: 'id',
            rowName: 'name',
            columnId: 'id',
            columnName: 'alias',
            columnUnit: '',
            mappingRowId: 'studyId',
            mappingColumnId: 'sensorId',
            mappingValue: 'value'
        },
        customActions: [],
        staticColumns: useMemo(() => ([{
            prop: 'id',
            name: 'Identifier',
            size: 150,
            readonly: true,
            pin: 'colPinStart',
            cellTemplate: Template(PatternCellTemplate, { prefix: 'Study S' }),
        },
        {
            prop: 'name',
            name: 'Study Name',
            size: 200,
            readonly: true,
            pin: 'colPinStart',
            cellProperties: () => {
                return {
                    style: {
                        "border-right": "3px solid "
                    }
                }
            }
        }
        ]), [])
    };

    return (
        <div ref={combinedRef} >

            <SlidePageTitle>
                Processing Protocol Output
            </SlidePageTitle>

            <SlidePageSubtitle>
                This slide allows you to view and edit the processed data files across different studies and sensors of the selected test set-up. You can switch between a simple view and a grid view. Please leave fields empty if no processed data (i.e. if only raw measurement data) are available. 
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
                        mappings={mappingsController.mappings}
                        handleInputChange={mappingsController.updateMappingValue}
                        disableAdd
                        minHeight={WINDOW_HEIGHT}
                    />

                </TabPanel>

                <TabPanel isActive={selectedTab === 'grid-view'}>
                    <DataGrid
                        {...processingOutputGridConfig}
                        showControls={true}
                        showDebug={false}
                        onDataChange={handleDataGridMappingsChange}
                        height={WINDOW_HEIGHT}
                        isActive={selectedTab === 'grid-view' && currentPage === pageIndex}
                        actionPlugins={[FilePickerPlugin]}
                    />
                </TabPanel>
            </div>
        </div>
    );
});

ProcessingOutputSlide.displayName = "Processing Output Slide"; // Set display name for better debugging

export default ProcessingOutputSlide;