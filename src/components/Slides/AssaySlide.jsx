import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Layers } from 'lucide-react';

// Import hooks
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

// Import the single global provider
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';

// Import components
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';
import TabSwitcher, { TabPanel } from '../TabSwitcher';
import WarningBanner from '../Widgets/WarningBanner';

// Data Grid Imports
import { Template } from '@revolist/react-datagrid';
import { PatternCellTemplate } from '../DataGrid/CellTemplates';


import usePageTab from '../../hooks/usePageWidth';
import DataGrid from '../DataGrid/DataGrid';
import useMappingsController from '../../hooks/useMappingsController';
import DualSidebarStudyRunPanel from '../Study/DualSidebarStudyRunPanel';
import StudyMeasurementMappingCard from '../StudyMeasurementMappingCard';
import { WINDOW_HEIGHT } from '../../constants/slideWindowHeight';
import useStudyRuns from '../../hooks/useStudyRuns';
import { buildStudyRunRowData } from '../../utils/studyRunLayouts';
import { studyCellTemplate, runCellTemplate, studyCellProperties, runCellProperties } from '../../utils/gridCellTemplates';


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
    const studyRuns = useStudyRuns();

    const sensors = Array.isArray(selectedTestSetup?.sensors)
        ? selectedTestSetup.sensors
        : (selectedTestSetup?.sensors ? Object.entries(selectedTestSetup.sensors).map(([id, s]) => ({ id, ...s })) : []);

    const mappingsController = useMappingsController(
        'studyToAssayMapping',
        { sourceKey: 'sensorId', targetKey: 'studyRunId' }
    );

    // Handle data grid changes (use controller to keep canonical mapping)
    const handleDataGridMappingsChange = useCallback((newMappings) => {
        mappingsController.setMappings(newMappings);
    }, [mappingsController]);

    // Grid configuration for mapping studies to processing protocols output
    const assayOutputGridConfig = {
        title: 'Mappings for assay output',
        rowData: buildStudyRunRowData(studies, studyRuns),
        columnData: selectedTestSetup?.sensors || [],
        mappings: mappingsController.mappings,
        fieldMappings: {
            rowId: 'id',
            rowName: 'name',
            columnId: 'id',
            columnName: 'alias',
            columnUnit: '',
            mappingRowId: 'studyRunId',
            mappingColumnId: 'sensorId',
            mappingValue: 'value'
        },
        customActions: [],
        staticColumns: useMemo(() => ([
            {
                prop: 'studyDisplayName',
                name: 'Study',
                size: 220,
                readonly: true,
                pin: 'colPinStart',
                cellTemplate: studyCellTemplate,
                cellProperties: studyCellProperties
            },
            {
                prop: 'runLabel',
                name: 'Run',
                size: 140,
                readonly: true,
                pin: 'colPinStart',
                cellTemplate: runCellTemplate,
                cellProperties: runCellProperties
            }
        ]), [studies, studyRuns])
    };

    return (
        <div ref={combinedRef} >

            <SlidePageTitle>
                Assay Output
            </SlidePageTitle>

            <SlidePageSubtitle>
                This slide allows you to view and edit the names of the created assay files. An assay is created for each sensor – study combination. Assay names are created automatically as they are only used on the back-end of the isafication, but assay names can be changed manually if desired. You can switch between a simple view and a grid view.
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

                {/* Warning banners */}
                {!selectedTestSetupId && (
                    <WarningBanner type="warning" icon={Layers}>
                        <strong>No test setup selected.</strong> Go to the project settings <Layers className="inline w-4 h-4 mx-1" /> and select a test setup for your project.
                    </WarningBanner>
                )}
                {selectedTestSetupId && sensors.length === 0 && (
                    <WarningBanner type="info">
                        <strong>No sensors in test setup.</strong> The selected test setup must contain one or more sensors to generate assay outputs. Add sensors to your test setup or select a different one.
                    </WarningBanner>
                )}

                <TabPanel isActive={selectedTab === 'simple-view'}>
                    <div className="h-[45vh] flex flex-col overflow-hidden">
                        <div className="flex-1 min-h-0 overflow-y-auto">
                            <DualSidebarStudyRunPanel
                                title="Assay Output Mapping"
                                studies={studies}
                                studyRuns={studyRuns}
                                mappings={mappingsController.mappings}
                                handleInputChange={mappingsController.updateMappingValue}
                                minHeight={WINDOW_HEIGHT}
                                MappingCardComponent={StudyMeasurementMappingCard}
                            />
                        </div>
                    </div>
                </TabPanel>

                <TabPanel isActive={selectedTab === 'grid-view'}>
                    <DataGrid
                        {...assayOutputGridConfig}
                        showControls={true}
                        showDebug={false}
                        onDataChange={handleDataGridMappingsChange}
                        height="45vh"
                        isActive={selectedTab === 'grid-view' && currentPage === pageIndex}
                        
                    />
                </TabPanel>
            </div>
        </div>
    );
});

AssaySlide.displayName = "Assay Slide"; // Set display name for better debugging

export default AssaySlide;
