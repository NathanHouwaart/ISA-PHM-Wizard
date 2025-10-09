import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Layers } from 'lucide-react';

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
import WarningBanner from '../Widgets/WarningBanner';

// Data Grid Imports
import { Template } from '@revolist/react-datagrid';
import { PatternCellTemplate } from '../DataGrid/CellTemplates';

import usePageTab from '../../hooks/usePageWidth';
import DataGrid from '../DataGrid/DataGrid';
import useMappingsController from '../../hooks/useMappingsController';
import { WINDOW_HEIGHT } from '../../constants/slideWindowHeight';
import FilePickerPlugin from '../DataGrid/FilePickerPlugin';


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
        selectedTestSetupId,
        selectedDataset,
    } = useGlobalDataContext();

    const selectedTestSetup = testSetups.find(setup => setup.id === selectedTestSetupId);
    
    const sensors = Array.isArray(selectedTestSetup?.sensors)
        ? selectedTestSetup.sensors
        : (selectedTestSetup?.sensors ? Object.entries(selectedTestSetup.sensors).map(([id, s]) => ({ id, ...s })) : []);

    // Manage the study<->sensor measurement mappings (same interface as StudyVariableSlide)
    const mappingsController = useMappingsController(
        'studyToSensorMeasurementMapping',
        { sourceKey: 'sensorId', targetKey: 'studyId' }
    );

    // Handle data grid changes (use controller to keep canonical mapping)
    const handleDataGridMappingsChange = useCallback((newMappings) => {
        mappingsController.setMappings(newMappings);
    }, [mappingsController]);

    // Grid configuration for mapping studies to sensor measurements
    const measurementOutputGridConfig = {
        title: 'Mappings for measurement output',
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

    // mappingsController already created above

    return (
        <div ref={combinedRef} >

            <SlidePageTitle>
                Raw Measurement Output
            </SlidePageTitle>

            <SlidePageSubtitle>
                This slide allows you to view and edit the output of measurements across different studies and sensors of the selected test set-up. You can switch between a simple view and a grid view. Please leave fields empty if no raw measurement data (i.e. if only processed measurement data) are available. Processed measurement data will be implemented in further sheets.
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
                    <WarningBanner type="warning">
                        <strong>No sensors in test setup.</strong> The selected test setup must contain one or more sensors to map measurement outputs. Add sensors to your test setup or select a different one.
                    </WarningBanner>
                )}
                {studies.length === 0 && (
                    <WarningBanner type="warning">
                        <strong>No studies available.</strong> There are no studies in the workspace. Create or import studies first so you can map measurement outputs to them.
                    </WarningBanner>
                )}

                <TabPanel isActive={selectedTab === 'simple-view'}>
                    <EntityMappingPanel
                        name={`Sensor Output Mapping`}
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
                    {!selectedDataset && (
                        <WarningBanner type="info">
                            <strong>No dataset indexed.</strong> To use the file assignment feature (<strong>📁 Assign files</strong> button), you need to index a dataset first. Go to the project settings <Layers className="inline w-4 h-4 mx-1" /> and index a folder containing your measurement files.
                        </WarningBanner>
                    )}
                    <DataGrid
                        {...measurementOutputGridConfig}
                        showControls={true}
                        // Debugging turned off by default
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

MeasurementOutputSlide.displayName = "Measurement Output"; // Set display name for better debugging

export default MeasurementOutputSlide;