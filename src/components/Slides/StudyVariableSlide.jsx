import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { Layers } from 'lucide-react';

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';

import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle, default as Paragraph } from '../Typography/Paragraph';
import Heading3 from '../Typography/Heading3';
import WarningBanner from '../Widgets/WarningBanner';
import DataGrid from '../DataGrid/DataGrid';
import { Template } from '@revolist/react-datagrid';
import { BoldCell } from '../DataGrid/CellTemplates';
import useMappingsController from '../../hooks/useMappingsController';
import useStudyRuns from '../../hooks/useStudyRuns';
import { createStudyRunId, groupStudyRuns } from '../../utils/studyRuns';
import TabSwitcher, { TabPanel } from '../TabSwitcher';
import EntityMappingPanel from '../EntityMappingPanel';
import useVariables from '../../hooks/useVariables';
import usePageTab from '../../hooks/usePageWidth';
import FilePickerPlugin from '../DataGrid/FilePickerPlugin';
import StudyVariableMappingPanel from '../Study/StudyVariableMappingPanel';
import { getExperimentTypeConfig } from '../../constants/experimentTypes';

const StudyVariableSlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {
    const resizeRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, resizeRef);

    const {
        studies,
        studyVariables,
        selectedDataset,
        experimentType
    } = useGlobalDataContext();

    const [selectedTab, setSelectedTab] = usePageTab(pageIndex, 'simple-view');
    const studyRuns = useStudyRuns();
    const experimentConfig = useMemo(() => getExperimentTypeConfig(experimentType), [experimentType]);
    const isSingleRunTemplate = !experimentConfig?.supportsMultipleRuns;
    const groupedRuns = useMemo(() => groupStudyRuns(studyRuns), [studyRuns]);

    const mappingsController = useMappingsController(
        'studyToStudyVariableMapping',
        { sourceKey: 'studyVariableId', targetKey: 'studyRunId' }
    );

    const [activeStudyId, setActiveStudyId] = useState(() => studies?.[0]?.id || null);

    useEffect(() => {
        if (studies.length === 0) {
            setActiveStudyId(null);
            return;
        }

        if (isSingleRunTemplate) {
            setActiveStudyId('all-studies');
            return;
        }

        if (!activeStudyId || !studies.some(study => study.id === activeStudyId)) {
            setActiveStudyId(studies[0].id);
        }
    }, [studies, activeStudyId, isSingleRunTemplate]);

    const staticColumns = useMemo(() => ([
        {
            prop: 'name',
            name: 'Variable',
            size: 220,
            readonly: true,
            pin: 'colPinStart',
            cellTemplate: Template(BoldCell),
            cellProperties: () => ({ style: { "border-right": "3px solid " } })
        },
        {
            prop: 'type',
            name: 'Type',
            size: 160,
            readonly: true
        },
        {
            prop: 'unit',
            name: 'Unit',
            size: 120,
            readonly: true
        },
        {
            prop: 'description',
            name: 'Description',
            size: 360,
            readonly: true
        }
    ]), []);

    const singleRunColumns = useMemo(() => {
        if (!isSingleRunTemplate) {
            return [];
        }

        return studies.map((study, studyIndex) => {
            const runsForStudy = groupedRuns.get(study.id) || [];
            const firstRun = runsForStudy[0];
            if (firstRun) {
                return {
                    ...firstRun,
                    runId: firstRun.runId || firstRun.id,
                    studyName: firstRun.studyName || study.name
                };
            }

            const fallbackRunId = createStudyRunId(study.id, 1);
            const studyName = study?.name || `Study ${studyIndex + 1}`;
            return {
                id: fallbackRunId,
                runId: fallbackRunId,
                studyId: study?.id,
                studyName,
                shortLabel: studyName,
                name: studyName,
                runNumber: 1,
                runCount: 1
            };
        });
    }, [groupedRuns, isSingleRunTemplate, studies]);

    const handleGridFocus = useCallback((studyId) => {
        setActiveStudyId(studyId);
    }, []);

    const gridHeight = useMemo(() => {
        const rows = Math.max(1, studyVariables.length);
        const rowHeight = 50;
        const structuralPadding = 115;
        const desired = (rows * rowHeight) + structuralPadding;
        const maxHeight = 500;
        return Math.min(maxHeight, desired);
    }, [studyVariables.length]);

    const singleRunGridConfig = useMemo(() => {
        if (!isSingleRunTemplate) {
            return null;
        }

        return {
            title: null,
            rowData: studyVariables,
            columnData: singleRunColumns,
            mappings: mappingsController.mappings,
            fieldMappings: {
                rowId: 'id',
                rowName: 'name',
                columnId: 'runId',
                columnName: 'studyName',
                mappingRowId: 'studyVariableId',
                mappingColumnId: 'studyRunId',
                mappingValue: 'value'
            },
            staticColumns,
            customActions: []
        };
    }, [isSingleRunTemplate, mappingsController.mappings, singleRunColumns, staticColumns, studyVariables]);

    return (
        <div ref={combinedRef}>
            <SlidePageTitle>
                Study Variable Mappings
            </SlidePageTitle>

            <SlidePageSubtitle>
                Map each defined variable to the runs that belong to your studies. Variable definitions are read-only in this view to keep the focus on assigning run-specific values.
            </SlidePageSubtitle>

            <div className="bg-gray-50 p-3 border-gray-300 border rounded-lg pb-2 relative">
                <TabSwitcher
                    selectedTab={selectedTab}
                    onTabChange={setSelectedTab}
                    tabs={[
                        { id: 'simple-view', label: 'Simple View', tooltip: 'Work variable by variable with per-run tabs' },
                        { id: 'grid-view', label: 'Grid View', tooltip: isSingleRunTemplate ? 'See mappings per study in a single grid' : 'See mappings per study/run in stacked grids' }
                    ]}
                />
                <Paragraph className="text-sm text-blue-900 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-4">
                    Each cell can contain either a literal value (e.g. a threshold) or the filename of a run-specific time-series dataset. Pick the approach that best documents the study.
                </Paragraph>

                <TabPanel isActive={selectedTab === 'simple-view'}>
                    {studies.length === 0 && (
                        <WarningBanner type="warning">
                            <strong>No studies available.</strong> Create studies before mapping variables.
                        </WarningBanner>
                    )}
                    {studyVariables.length === 0 && (
                        <WarningBanner type="info">
                            <strong>No variables defined.</strong> Add variables in the Study Variable Definitions slide to start mapping them.
                        </WarningBanner>
                    )}
                    <div className="h-[45vh]">
                        <StudyVariableMappingPanel
                            studies={studies}
                            studyRuns={studyRuns}
                            studyVariables={studyVariables}
                            mappings={mappingsController.mappings}
                            handleInputChange={mappingsController.updateMappingValue}
                            minHeight={Math.max(400, studyVariables.length * 120)}
                        />
                    </div>
                </TabPanel>

                <TabPanel isActive={selectedTab === 'grid-view'}>
                    {studies.length === 0 && (
                        <WarningBanner type="warning">
                            <strong>No studies available.</strong> Create studies before mapping variables.
                        </WarningBanner>
                    )}

                    {studyVariables.length === 0 && (
                        <WarningBanner type="info">
                            <strong>No variables defined.</strong> Add variables first to work in the grid view.
                        </WarningBanner>
                    )}
                    {!selectedDataset && (
                        <WarningBanner type="info">
                            <strong>No dataset indexed.</strong> To use the <strong>Assign files</strong> helper, index a dataset via the project settings <Layers className="inline w-4 h-4 mx-1" /> first.
                        </WarningBanner>
                    )}

                    <div className="space-y-4 mt-4">
                        {isSingleRunTemplate ? (
                            <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 space-y-2">
                                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                                    <Heading3 className="text-lg font-semibold text-gray-900">
                                        Study variable mappings - All studies
                                    </Heading3>
                                    {singleRunColumns.length > 0 && (
                                        <span className="text-xs uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                            {singleRunColumns.length} stud{singleRunColumns.length === 1 ? 'y' : 'ies'}
                                        </span>
                                    )}
                                </div>
                                {singleRunColumns.length === 0 ? (
                                    <Paragraph className="text-sm text-gray-500">
                                        This project has no studies with runs to map.
                                    </Paragraph>
                                ) : (
                                    <div
                                        onPointerDown={() => handleGridFocus('all-studies')}
                                        className="border border-gray-100 rounded-lg"
                                    >
                                        <DataGrid
                                            {...singleRunGridConfig}
                                            showControls={true}
                                            showDebug={false}
                                            onDataChange={mappingsController.setMappings}
                                            height={gridHeight}
                                            isActive={currentPage === pageIndex && activeStudyId === 'all-studies'}
                                            actionPlugins={[FilePickerPlugin]}
                                        />
                                    </div>
                                )}
                            </section>
                        ) : (
                            studies.map((study) => {
                                const runsForStudy = groupedRuns.get(study.id) || [];
                                const hasRuns = runsForStudy.length > 0;

                                const gridConfig = {
                                    title: null,
                                    rowData: studyVariables,
                                    columnData: runsForStudy,
                                    mappings: mappingsController.mappings,
                                    fieldMappings: {
                                        rowId: 'id',
                                        rowName: 'name',
                                        columnId: 'runId',
                                        columnName: 'shortLabel',
                                        columnParentId: 'studyId',
                                        columnParentName: 'studyName',
                                        columnChildNameFormatter: (run) => run?.shortLabel || `Run ${run?.runNumber}`,
                                        enableColumnGroups: true,
                                        mappingRowId: 'studyVariableId',
                                        mappingColumnId: 'studyRunId',
                                        mappingValue: 'value'
                                    },
                                    staticColumns,
                                    customActions: []
                                };

                                return (
                                    <section
                                        key={study.id}
                                        className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 space-y-2"
                                    >
                                        <div className="flex items-baseline justify-between gap-3 flex-wrap">
                                            <Heading3 className="text-lg font-semibold text-gray-900">
                                                Study variable mappings - {study.name}
                                            </Heading3>
                                            {hasRuns && (
                                                <span className="text-xs uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                    {runsForStudy.length} run{runsForStudy.length > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                        {!hasRuns && (
                                            <Paragraph className="text-sm text-gray-500">
                                                This study has no runs defined yet.
                                            </Paragraph>
                                        )}

                                        {hasRuns ? (
                                            <div
                                                onPointerDown={() => handleGridFocus(study.id)}
                                                className="border border-gray-100 rounded-lg"
                                            >
                                                <DataGrid
                                                    {...gridConfig}
                                                    showControls={true}
                                                    showDebug={false}
                                                    onDataChange={mappingsController.setMappings}
                                                    height={gridHeight}
                                                    isActive={currentPage === pageIndex && activeStudyId === study.id}
                                                    actionPlugins={[FilePickerPlugin]}
                                                />
                                            </div>
                                        ) : (
                                            <Paragraph className="text-sm text-gray-500 italic">
                                                Add runs to this study to enable variable mappings.
                                            </Paragraph>
                                        )}
                                    </section>
                                );
                            })
                        )}
                    </div>
                </TabPanel>
            </div>
        </div>
    );
});

StudyVariableSlide.displayName = 'Study Variable Mappings';

export default StudyVariableSlide;
