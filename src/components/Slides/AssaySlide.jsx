import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Import hooks
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
import useMeasurements from '../../hooks/useMeasurements';
import { WINDOW_HEIGHT } from '../../constants/slideWindowHeight';


export const AssaySlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {

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
        studyToAssayMapping,
    } = useGlobalDataContext();

    const selectedTestSetup = testSetups.find(setup => setup.id === selectedTestSetupId);

    const mappingsController = useMappingsController(
        'studyToAssayMapping',
        { sourceKey: 'sensorId', targetKey: 'studyId' }
    );

    // Handle data grid changes (use controller to keep canonical mapping)
    const handleDataGridMappingsChange = useCallback((newMappings) => {
        mappingsController.setMappings(newMappings);
    }, [mappingsController]);

    // Grid configuration for mapping studies to processing protocols output
    const assayOutputGridConfig = {
        title: 'Mappings for assay output',
        rowData: studies,
        columnData: selectedTestSetup?.sensors || [],
        mappings: studyToAssayMapping,
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
            cellTemplate: Template(PatternCellTemplate, { prefix: 'Study S' }),
        },
        {
            prop: 'name',
            name: 'Study Name',
            size: 200,
            readonly: true,
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
                Assay Output
            </SlidePageTitle>

            <SlidePageSubtitle>
                This slide allows you to view and edit the Assay Outputs across different studies. You can switch between a simple view and a grid view for better data management.
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
                        minHeight={WINDOW_HEIGHT}
                        disableAdd
                    />

                </TabPanel>

                <TabPanel isActive={selectedTab === 'grid-view'}>
                    <DataGrid
                        {...assayOutputGridConfig}
                        showControls={true}
                        showDebug={false}
                        onDataChange={handleDataGridMappingsChange}
                        height={WINDOW_HEIGHT}
                        isActive={selectedTab === 'grid-view' && currentPage === pageIndex}
                        
                    />
                </TabPanel>
            </div>
        </div>
    );
});

AssaySlide.displayName = "Assay Slide"; // Set display name for better debugging

export default AssaySlide;