import React, { forwardRef, useCallback, useMemo } from 'react'
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
import usePageTab from '../../hooks/usePageWidth';
import DataGrid from '../DataGrid/DataGrid';
import useMappingsController from '../../hooks/useMappingsController';
import { WINDOW_HEIGHT } from '../../constants/slideWindowHeight';
import FilePickerPlugin from '../DataGrid/FilePickerPlugin';
import useStudyRuns from '../../hooks/useStudyRuns';
import DualSidebarStudyRunPanel from '../Study/DualSidebarStudyRunPanel';
import StudyMeasurementMappingCard from '../StudyMeasurementMappingCard';
import { buildStudyRunRowData } from '../../utils/studyRunLayouts';
import { studyCellTemplate, runCellTemplate, studyCellProperties, runCellProperties } from '../../utils/gridCellTemplates';
import SelectTypePlugin from '@revolist/revogrid-column-select';

const plugins = { select: new SelectTypePlugin() };

export const ProcessingOutputSlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {

    // Use persistent tab state that remembers across page navigation
    const [selectedTab, setSelectedTab] = usePageTab(pageIndex, 'simple-view'); // State to manage selected tab

    // Observe height changes
    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    // Access global context
    const {
        studies,
        setStudies,
        testSetups,
        selectedTestSetupId,
        selectedDataset,
        studyToProcessingProtocolSelection,
        setStudyToProcessingProtocolSelection
    } = useGlobalDataContext();

    const selectedTestSetup = testSetups.find(setup => setup.id === selectedTestSetupId);
    const studyRuns = useStudyRuns();

    const sensors = Array.isArray(selectedTestSetup?.sensors)
        ? selectedTestSetup.sensors
        : (selectedTestSetup?.sensors ? Object.entries(selectedTestSetup.sensors).map(([id, s]) => ({ id, ...s })) : []);

    const processingProtocolOptions = useMemo(
        () => (selectedTestSetup?.processingProtocols || []).map((protocol) => ({
            value: protocol.id,
            label: protocol.name || 'Unnamed protocol'
        })),
        [selectedTestSetup]
    );

    const selectedProcessingProtocolByStudy = useMemo(() => {
        const byStudy = {};
        (studyToProcessingProtocolSelection || []).forEach((entry) => {
            if (!entry?.studyId) return;
            byStudy[entry.studyId] = entry.protocolId || '';
        });
        studies.forEach((study) => {
            if (!study?.id) return;
            if (study.processingProtocolId && !byStudy[study.id]) {
                byStudy[study.id] = study.processingProtocolId;
            }
        });
        return byStudy;
    }, [studyToProcessingProtocolSelection, studies]);

    const updateStudyProcessingProtocol = useCallback((studyId, protocolId) => {
        if (!studyId) return;
        setStudies((prevStudies) => (prevStudies || []).map((study) => (
            study.id === studyId ? { ...study, processingProtocolId: protocolId || '' } : study
        )));
        setStudyToProcessingProtocolSelection((prev) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            const withoutStudy = safePrev.filter((entry) => entry?.studyId !== studyId);
            return [...withoutStudy, { studyId, protocolId: protocolId || '' }];
        });
    }, [setStudies, setStudyToProcessingProtocolSelection]);

    const mappingsController = useMappingsController(
        'studyToSensorProcessingMapping',
        { sourceKey: 'sensorId', targetKey: 'studyRunId' }
    );

    // Screen width is managed globally by IsaQuestionnaire based on persisted tab state.

    // Handle data grid changes
    const handleDataGridMappingsChange = useCallback((newMappings) => {
        mappingsController.setMappings(newMappings);
    }, [mappingsController]);

    // Grid configuration for mapping studies to processing protocols output
    const hierarchicalRows = useMemo(
        () => buildStudyRunRowData(studies, studyRuns),
        [studies, studyRuns]
    );



    const processingOutputGridConfig = {
        title: 'Mappings for processing protocol output',
        rowData: hierarchicalRows,
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
        staticColumns: useMemo(() => ([{
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
        },
        {
            prop: 'processingProtocolId',
            name: 'Processing Protocol',
            size: 260,
            readonly: false,
            pin: 'colPinStart',
            columnType: 'select',
            labelKey: 'label',
            valueKey: 'value',
            source: processingProtocolOptions,
            cellProperties: (props) => {
                const model = props?.model;
                const style = {
                    "border-right": "3px solid black"
                };
                if (model?.isLastRunInStudy) {
                    style["border-bottom"] = "3px solid black";
                }
                return { style };
            }
        }
        ]), [processingProtocolOptions])
    };

    const handleGridRowDataChange = useCallback((nextRows) => {
        const currentProtocolByStudy = new Map(
            (studies || []).map((study) => [study.id, study.processingProtocolId || ''])
        );

        const seenValuesByStudy = new Map();
        (nextRows || []).forEach((row) => {
            if (!row?.studyId) return;
            if (!seenValuesByStudy.has(row.studyId)) {
                seenValuesByStudy.set(row.studyId, new Set());
            }
            seenValuesByStudy.get(row.studyId).add(row.processingProtocolId || '');
        });

        const protocolByStudy = new Map();
        seenValuesByStudy.forEach((valueSet, studyId) => {
            const values = Array.from(valueSet);
            const currentValue = currentProtocolByStudy.get(studyId) || '';
            const changedValue = values.find((value) => value !== currentValue);
            const nextValue = changedValue ?? (values[0] ?? currentValue);
            if (nextValue !== currentValue) {
                protocolByStudy.set(studyId, nextValue);
            }
        });

        if (!protocolByStudy.size) return;

        setStudies((prevStudies) => {
            let changed = false;
            const nextStudies = (prevStudies || []).map((study) => {
                if (!protocolByStudy.has(study.id)) return study;
                const nextProtocolId = protocolByStudy.get(study.id) || '';
                if ((study.processingProtocolId || '') === nextProtocolId) return study;
                changed = true;
                return {
                    ...study,
                    processingProtocolId: nextProtocolId
                };
            });
            return changed ? nextStudies : prevStudies;
        });

        setStudyToProcessingProtocolSelection((prev) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            const filtered = safePrev.filter((entry) => !protocolByStudy.has(entry?.studyId));
            const nextSelections = [...filtered];
            protocolByStudy.forEach((protocolId, studyId) => {
                nextSelections.push({ studyId, protocolId: protocolId || '' });
            });
            const unchanged = safePrev.length === nextSelections.length && safePrev.every((entry, index) => (
                entry?.studyId === nextSelections[index]?.studyId &&
                (entry?.protocolId || '') === (nextSelections[index]?.protocolId || '')
            ));
            if (unchanged) return safePrev;
            return nextSelections;
        });
    }, [studies, setStudies, setStudyToProcessingProtocolSelection]);

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

                {/* Warning banners */}
                {!selectedTestSetupId && (
                    <WarningBanner type="warning" icon={Layers}>
                        <strong>No test setup selected.</strong> Go to the project settings <Layers className="inline w-4 h-4 mx-1" /> and select a test setup for your project.
                    </WarningBanner>
                )}
                {selectedTestSetupId && sensors.length === 0 && (
                    <WarningBanner type="warning">
                        <strong>No sensors in test setup.</strong> The selected test setup must contain one or more sensors to map processing outputs. Add sensors to your test setup or select a different one.
                    </WarningBanner>
                )}
                {selectedTestSetupId && processingProtocolOptions.length === 0 && (
                    <WarningBanner type="info">
                        <strong>No processing protocols in test setup.</strong> Define one or more processing protocol variants in the Test Setup page to select them per study.
                    </WarningBanner>
                )}
                {studies.length === 0 && (
                    <WarningBanner type="warning">
                        <strong>No studies available.</strong> There are no studies in the workspace. Create or import studies first so you can map processing outputs to them.
                    </WarningBanner>
                )}

                <TabPanel isActive={selectedTab === 'simple-view'}>
                    <div className="h-[45vh] flex flex-col overflow-hidden">
                        <div className="flex-1 min-h-0 overflow-y-auto">
                            <DualSidebarStudyRunPanel
                                title="Studies"
                                studies={studies}
                                studyRuns={studyRuns}
                                mappings={mappingsController.mappings}
                                handleInputChange={mappingsController.updateMappingValue}
                                minHeight={WINDOW_HEIGHT}
                                MappingCardComponent={StudyMeasurementMappingCard}
                                mappingCardProps={{
                                    protocolLabel: 'Processing Protocol',
                                    protocolOptions: processingProtocolOptions,
                                    selectedProtocolByStudy: selectedProcessingProtocolByStudy,
                                    onStudyProtocolChange: updateStudyProcessingProtocol,
                                    fileFieldLabel: 'Processed Data File'
                                }}
                            />
                        </div>
                    </div>
                </TabPanel>

                <TabPanel isActive={selectedTab === 'grid-view'}>
                    {!selectedDataset && (
                        <WarningBanner type="info">
                            <strong>No dataset indexed.</strong> To use the file assignment feature (<strong>📁 Assign files</strong> button), you need to index a dataset first. Go to the project settings <Layers className="inline w-4 h-4 mx-1" /> and index a folder containing your processed data files.
                        </WarningBanner>
                    )}
                    <DataGrid
                        {...processingOutputGridConfig}
                        showControls={true}
                        showDebug={false}
                        onDataChange={handleDataGridMappingsChange}
                        onRowDataChange={handleGridRowDataChange}
                        height={"45vh"}
                        isActive={selectedTab === 'grid-view' && currentPage === pageIndex}
                        actionPlugins={[FilePickerPlugin]}
                        plugins={plugins}
                    />
                </TabPanel>
            </div>
        </div>
    );
});

ProcessingOutputSlide.displayName = "Processing Output Slide"; // Set display name for better debugging

export default ProcessingOutputSlide;
