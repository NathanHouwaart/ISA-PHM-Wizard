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
import { getTransposedGridData, flattenTransposedGridData, getTransposedColumns } from '../../utils/utils';

import isEqual from 'lodash.isequal';
import usePageTab from '../../hooks/usePageWidth';
import DataGrid from '../DataGrid';


export const MeasurementOutputSlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {

    // Use persistent tab state that remembers across page navigation
    const [selectedTab, setSelectedTab] = usePageTab(pageIndex, 'simple-view');

    // Observe height changes
    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    // Access global context
    const {
        studies,
        testSetups,
        setScreenWidth,
        selectedTestSetupId,
        studyToSensorMeasurementMapping,
        setStudyToSensorMeasurementMapping
    } = useGlobalDataContext();

    const selectedTestSetup = testSetups.find(setup => setup.id === selectedTestSetupId);

    // Screen width is managed centrally by IsaQuestionnaire; no per-slide effect needed here.

    // Handle data grid changes
    const handleDataGridMappingsChange = useCallback((newMappings) => {
        setStudyToSensorMeasurementMapping(newMappings);
    }, [setStudyToSensorMeasurementMapping]);

    // Grid configuration for mapping studies to sensor measurements
    const measurementOutputGridConfig = {
        title: 'Mappings for measurement output',
        rowData: studies,
        columnData: selectedTestSetup?.sensors || [],
        mappings: studyToSensorMeasurementMapping,
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

                    {/* <EntityMappingPanel
                        name={`Sensor Output Mapping`}
                        tileNamePrefix="Study S"
                        items={studies}
                        itemHook={useMeasurements}
                        mappings={studyToSensorMeasurementMapping}
                        // handleInputChange={handleInputChange}
                        disableAdd
                    /> */}

                </TabPanel>

                <TabPanel isActive={selectedTab === 'grid-view'}>
                    <DataGrid
                        {...measurementOutputGridConfig}
                        showControls={true}
                        showDebug={false}
                        onDataChange={handleDataGridMappingsChange}
                        // onRowDataChange={handleDataGridRowDataChange}
                        height="500px"
                        isActive={selectedTab === 'grid-view' && currentPage === pageIndex}
                    />
                </TabPanel>
            </div>
        </div>
    );
});

MeasurementOutputSlide.displayName = "Measurement Output"; // Set display name for better debugging

export default MeasurementOutputSlide;