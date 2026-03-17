import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { Layers } from 'lucide-react';

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import { useProjectData } from '../../contexts/GlobalDataContext';

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
import usePageTab from '../../hooks/usePageWidth';
import { WINDOW_HEIGHT } from '../../constants/slideWindowHeight';
import FilePickerPlugin from '../DataGrid/FilePickerPlugin';
import StudyVariableMappingPanel from '../Study/StudyVariableMappingPanel';
import { getExperimentTypeConfig } from '../../constants/experimentTypes';

import { isFaultSpecification, isOperatingCondition } from '../../constants/variableTypes';

const StudyVariableSlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {
    const resizeRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, resizeRef);

    const {
        studies,
        studyVariables,
        selectedDataset,
        experimentType
    } = useProjectData();

    const [selectedTab, setSelectedTab] = usePageTab(pageIndex, 'simple-view');
    const studyRuns = useStudyRuns();
    const experimentConfig = useMemo(() => getExperimentTypeConfig(experimentType), [experimentType]);
    const isSingleRunTemplate = !experimentConfig?.supportsMultipleRuns;
    const groupedRuns = useMemo(() => groupStudyRuns(studyRuns), [studyRuns]);

    const faultSpecs = useMemo(() => studyVariables.filter(isFaultSpecification), [studyVariables]);
    const opConds = useMemo(() => studyVariables.filter(isOperatingCondition), [studyVariables]);
    const sortedVariables = useMemo(() => [...faultSpecs, ...opConds], [faultSpecs, opConds]);

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

    const mergeScopedMappings = useCallback((incomingMappings, scopeRunIds) => {
        const scopeSet = new Set((scopeRunIds || []).map((id) => String(id)));
        if (scopeSet.size === 0) {
            return;
        }

        mappingsController.setMappings((previousMappings) => {
            const previous = Array.isArray(previousMappings) ? previousMappings : [];
            const incoming = Array.isArray(incomingMappings) ? incomingMappings : [];

            const preservedOutsideScope = previous.filter((mapping) => {
                const runId = String(mapping?.studyRunId ?? '');
                return !scopeSet.has(runId);
            });

            const normalizedIncomingScope = incoming.filter((mapping) => {
                const runId = String(mapping?.studyRunId ?? '');
                return scopeSet.has(runId);
            });

            return [...preservedOutsideScope, ...normalizedIncomingScope];
        });
    }, [mappingsController]);

    const singleRunScopeRunIds = useMemo(
        () => singleRunColumns.map((run) => run?.runId || run?.id).filter(Boolean),
        [singleRunColumns]
    );

    const handleSingleRunGridMappingsChange = useCallback((incomingMappings) => {
        mergeScopedMappings(incomingMappings, singleRunScopeRunIds);
    }, [mergeScopedMappings, singleRunScopeRunIds]);

    const scopeRunIdsByStudyId = useMemo(() => {
        const lookup = {};
        studies.forEach((study) => {
            const runsForStudy = groupedRuns.get(study.id) || [];
            lookup[study.id] = runsForStudy
                .map((run) => run?.runId || run?.id)
                .filter(Boolean);
        });
        return lookup;
    }, [studies, groupedRuns]);

    const onGridMappingsChangeByStudyId = useMemo(() => {
        const handlers = {};
        studies.forEach((study) => {
            const scopeRunIds = scopeRunIdsByStudyId[study.id] || [];
            handlers[study.id] = (incomingMappings) => {
                mergeScopedMappings(incomingMappings, scopeRunIds);
            };
        });
        return handlers;
    }, [studies, scopeRunIdsByStudyId, mergeScopedMappings]);

    const handleGridFocus = useCallback((studyId) => {
        setActiveStudyId(studyId);
    }, []);

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
                Test Matrix
            </SlidePageTitle>

            <SlidePageSubtitle>
                Assign values to fault specifications and operating conditions for each study run to complete your experiment&#39;s test matrix.
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

                <TabPanel isActive={selectedTab === 'simple-view'} unmountOnHide>
                    {studies.length === 0 && (
                        <WarningBanner type="warning">
                            <strong>No experiments available.</strong> Create experiments before mapping variables.
                        </WarningBanner>
                    )}
                    {studyVariables.length === 0 && (
                        <WarningBanner type="info">
                            <strong>No operating conditions or fault specifications defined.</strong> Add them in the previous slides to start mapping them.
                        </WarningBanner>
                    )}
                    <div className="h-[45vh] flex flex-col overflow-hidden">
                            <StudyVariableMappingPanel
                                studies={studies}
                                studyRuns={studyRuns}
                                studyVariables={studyVariables}
                                mappings={mappingsController.mappings}
                                handleInputChange={mappingsController.updateMappingValue}
                                minHeight={WINDOW_HEIGHT}
                                isSingleRunTemplate={isSingleRunTemplate}
                            />
                    </div>
                </TabPanel>

                <TabPanel isActive={selectedTab === 'grid-view'} unmountOnHide>
                    {studies.length === 0 && (
                        <WarningBanner type="warning">
                            <strong>No experiments available.</strong> Create experiments before mapping variables.
                        </WarningBanner>
                    )}

                    {studyVariables.length === 0 && (
                        <WarningBanner type="info">
                            <strong>No operating conditions or fault specifications defined.</strong> Add them in the previous slides to work in the grid view.
                        </WarningBanner>
                    )}
                    {!selectedDataset && (
                        <WarningBanner type="info">
                            <strong>No dataset indexed.</strong> To use the <strong>Assign files</strong> helper, index a dataset via the project settings <Layers className="inline w-4 h-4 mx-1" /> first.
                        </WarningBanner>
                    )}

                    <div className="space-y-4 mt-4">
                        {isSingleRunTemplate ? (
                            <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 space-y-6">
                                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                                    <Heading3 className="text-lg font-semibold text-gray-900">
                                        Test Matrix - All Experiments
                                    </Heading3>
                                    {singleRunColumns.length > 0 && (
                                        <span className="text-xs uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                            {singleRunColumns.length} experiment{singleRunColumns.length === 1 ? '' : 's'}
                                        </span>
                                    )}
                                </div>
                                {singleRunColumns.length === 0 ? (
                                    <Paragraph className="text-sm text-gray-500">
                                        This project has no experiments with runs to map.
                                    </Paragraph>
                                ) : (
                                    <>
                                    {/* Combined Grid */}
                                    {sortedVariables.length > 0 && (
                                        <div 
                                            onPointerDown={() => handleGridFocus('all-studies')}
                                            className="border border-gray-200 rounded-lg"
                                        >
                                            <DataGrid
                                                {...{
                                                    ...singleRunGridConfig,
                                                    rowData: sortedVariables
                                                }}
                                                showControls={true}
                                                showDebug={false}
                                                enableBulkFill={true}
                                                onDataChange={handleSingleRunGridMappingsChange}
                                                height={Math.min(600, (sortedVariables.length * 50) + 115)}
                                                isActive={currentPage === pageIndex && activeStudyId === 'all-studies'}
                                                actionPlugins={[FilePickerPlugin]}
                                            />
                                        </div>
                                    )}
                                    
                                    {sortedVariables.length === 0 && (
                                        <Paragraph className="text-sm text-gray-500 italic">No variables defined.</Paragraph>
                                    )}
                                    </>
                                )}
                            </section>
                        ) : (
                            studies.map((study) => {
                                const runsForStudy = groupedRuns.get(study.id) || [];
                                const hasRuns = runsForStudy.length > 0;

                                const baseGridConfig = {
                                    title: null,
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
                                        className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 space-y-6"
                                    >
                                        <div className="flex items-baseline justify-between gap-3 flex-wrap">
                                            <Heading3 className="text-lg font-semibold text-gray-900">
                                                Test Matrix - {study.name}
                                            </Heading3>
                                            {hasRuns && (
                                                <span className="text-xs uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                    {runsForStudy.length} run{runsForStudy.length > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                        {!hasRuns && (
                                            <Paragraph className="text-sm text-gray-500">
                                                This experiment has no runs defined yet.
                                            </Paragraph>
                                        )}

                                        {hasRuns ? (
                                            <>
                                            {/* Combined Grid */}
                                            {sortedVariables.length > 0 && (
                                                <div
                                                    onPointerDown={() => handleGridFocus(study.id)}
                                                    className="border border-gray-200 rounded-lg"
                                                >
                                                    <DataGrid
                                                        {...{...baseGridConfig, rowData: sortedVariables}}
                                                        showControls={true}
                                                        showDebug={false}
                                                        enableBulkFill={true}
                                                        onDataChange={onGridMappingsChangeByStudyId[study.id]}
                                                        height={Math.min(600, (sortedVariables.length * 50) + 115)}
                                                        isActive={currentPage === pageIndex && activeStudyId === study.id}
                                                        actionPlugins={[FilePickerPlugin]}
                                                    />
                                                </div>
                                            )}

                                            {sortedVariables.length === 0 && (
                                                <Paragraph className="text-sm text-gray-500 italic">No variables defined.</Paragraph>
                                            )}
                                            </>
                                        ) : (
                                            <Paragraph className="text-sm text-gray-500 italic">
                                                Add runs to this experiment to enable variable mappings.
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

StudyVariableSlide.displayName = 'Experiment Variable Mappings';

export default StudyVariableSlide;
