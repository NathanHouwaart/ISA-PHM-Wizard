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

import {
    STUDY_VARIABLE_VALUE_MODE_SCALAR,
    isFaultSpecification,
    isOperatingCondition,
    normalizeStudyVariableValueMode
} from '../../constants/variableTypes';

const ALL_STUDIES_ID = 'all-studies';

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
    const normalizedSortedVariables = useMemo(() => (
        sortedVariables.map((variable) => ({
            ...variable,
            valueMode: normalizeStudyVariableValueMode(variable?.valueMode, STUDY_VARIABLE_VALUE_MODE_SCALAR)
        }))
    ), [sortedVariables]);

    const mappingsController = useMappingsController(
        'studyToStudyVariableMapping',
        { sourceKey: 'studyVariableId', targetKey: 'studyRunId' }
    );

    const [activeStudyId, setActiveStudyId] = useState(() => (studies?.length > 0 ? ALL_STUDIES_ID : null));
    const [activeGridScopeId, setActiveGridScopeId] = useState(() => {
        if (!studies?.length) return null;
        return isSingleRunTemplate ? ALL_STUDIES_ID : (studies[0]?.id || null);
    });

    useEffect(() => {
        if (studies.length === 0) {
            setActiveStudyId(null);
            setActiveGridScopeId(null);
            return;
        }

        if (isSingleRunTemplate) {
            setActiveStudyId(ALL_STUDIES_ID);
            setActiveGridScopeId(ALL_STUDIES_ID);
            return;
        }

        if (activeStudyId !== ALL_STUDIES_ID && (!activeStudyId || !studies.some(study => study.id === activeStudyId))) {
            setActiveStudyId(ALL_STUDIES_ID);
        }

        setActiveGridScopeId((previous) => {
            if (previous && previous !== ALL_STUDIES_ID && studies.some((study) => study.id === previous)) {
                return previous;
            }
            return studies[0]?.id || null;
        });
    }, [studies, activeStudyId, isSingleRunTemplate]);

    const staticColumns = useMemo(() => ([
        {
            prop: 'name',
            name: 'Variable',
            size: 180,
            readonly: true,
            pin: 'colPinStart',
            cellTemplate: Template(BoldCell),
            cellProperties: () => ({ style: { "border-right": "3px solid " } })
        },
        {
            prop: 'type',
            name: 'Type',
            size: 120,
            readonly: true
        },
        {
            prop: 'unit',
            name: 'Unit',
            size: 90,
            readonly: true
        },
        {
            prop: 'valueMode',
            name: 'Value Mode',
            size: 110,
            readonly: true
        },
        {
            prop: 'description',
            name: 'Description',
            size: 260,
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

            // Reference-equality fast-path: if every in-scope item is the same object in the
            // same position as what's already in `previous`, the merge result would be
            // semantically identical. Return the original array reference so that
            // useMappingsController.setMappings bails out (nextValue === base) and avoids
            // triggering a re-render -> re-emit -> re-merge infinite loop.
            const prevScopeItems = previous.filter(
                (m) => scopeSet.has(String(m?.studyRunId ?? ''))
            );
            if (
                normalizedIncomingScope.length === prevScopeItems.length
                && preservedOutsideScope.length === previous.length - prevScopeItems.length
                && normalizedIncomingScope.every((item, i) => item === prevScopeItems[i])
            ) {
                return previous;
            }

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
        lookup[ALL_STUDIES_ID] = studyRuns
            .map((run) => run?.runId || run?.id)
            .filter(Boolean);

        studies.forEach((study) => {
            const runsForStudy = groupedRuns.get(study.id) || [];
            lookup[study.id] = runsForStudy
                .map((run) => run?.runId || run?.id)
                .filter(Boolean);
        });
        return lookup;
    }, [studies, groupedRuns, studyRuns]);

    const onGridMappingsChangeByStudyId = useMemo(() => {
        const handlers = {};
        const scopeIds = [ALL_STUDIES_ID, ...studies.map((study) => study.id)];
        scopeIds.forEach((scopeId) => {
            const scopeRunIds = scopeRunIdsByStudyId[scopeId] || [];
            handlers[scopeId] = (incomingMappings) => {
                mergeScopedMappings(incomingMappings, scopeRunIds);
            };
        });
        return handlers;
    }, [studies, scopeRunIdsByStudyId, mergeScopedMappings]);

    const handleGridFocus = useCallback((scopeId) => {
        setActiveGridScopeId(scopeId);
    }, []);

    const handleScopeChange = useCallback((event) => {
        const nextScopeId = event.target.value;
        setActiveStudyId(nextScopeId);
        if (nextScopeId === ALL_STUDIES_ID) {
            setActiveGridScopeId((previous) => {
                if (previous && previous !== ALL_STUDIES_ID && studies.some((study) => study.id === previous)) {
                    return previous;
                }
                return studies[0]?.id || null;
            });
            return;
        }
        setActiveGridScopeId(nextScopeId);
    }, [studies]);

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
                        { id: 'grid-view', label: 'Grid View', tooltip: isSingleRunTemplate ? 'See mappings per study in a single grid' : 'See mappings for one study/run set at a time' }
                    ]}
                />
                <Paragraph className="text-sm text-blue-900 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-4">
                    Value Mode controls expected input: use scalar values for <strong>Scalar</strong> rows and relative <code>.csv</code> paths for <strong>Timeseries</strong> rows.
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
                                            onPointerDown={() => handleGridFocus(ALL_STUDIES_ID)}
                                            className="border border-gray-200 rounded-lg"
                                        >
                                            <DataGrid
                                                {...{
                                                    ...singleRunGridConfig,
                                                    rowData: normalizedSortedVariables
                                                }}
                                                showControls={true}
                                                showDebug={false}
                                                enableBulkFill={true}
                                                onDataChange={handleSingleRunGridMappingsChange}
                                                height={Math.min(600, (normalizedSortedVariables.length * 50) + 115)}
                                                isActive={currentPage === pageIndex && activeGridScopeId === ALL_STUDIES_ID}
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
                        ) : (() => {
                            const selectedScopeId = (
                                activeStudyId === ALL_STUDIES_ID
                                || studies.some((study) => study.id === activeStudyId)
                            )
                                ? activeStudyId
                                : ALL_STUDIES_ID;
                            const showingAllStudies = selectedScopeId === ALL_STUDIES_ID;
                            const activeStudy = showingAllStudies
                                ? null
                                : (studies.find((study) => study.id === selectedScopeId) || null);
                            const activeStudyLabel = activeStudy?.name || 'All experiments';
                            const runsForSelectedScope = showingAllStudies
                                ? studyRuns
                                : (groupedRuns.get(activeStudy?.id) || []);
                            const hasRuns = runsForSelectedScope.length > 0;
                            const studiesInScope = showingAllStudies
                                ? studies
                                : (activeStudy ? [activeStudy] : []);
                            const activeGridStudy = studies.find((study) => study.id === activeGridScopeId) || null;
                            const focusedGridLabel = activeGridStudy?.name || 'None';
                            const experimentCount = studiesInScope.length;
                            const buildGridConfig = (runsForStudy) => ({
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
                            });

                            return (
                                <section
                                    key={selectedScopeId || 'all'}
                                    className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 space-y-6"
                                >
                                    <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                                        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                                            <div className="w-full xl:max-w-md space-y-1">
                                                <label className="text-xs uppercase tracking-wide font-semibold text-blue-700">
                                                    Active experiment scope
                                                </label>
                                                <select
                                                    value={selectedScopeId || ALL_STUDIES_ID}
                                                    onChange={handleScopeChange}
                                                    className="w-full px-3 py-2 border border-blue-300 rounded-md bg-white text-sm text-gray-900 shadow-sm"
                                                >
                                                    <option value={ALL_STUDIES_ID}>All experiments</option>
                                                    {studies.map((study) => (
                                                        <option key={study.id} value={study.id}>
                                                            {study.name || 'Untitled study'}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex flex-wrap gap-2 xl:justify-end">
                                                <div className="rounded-md border border-gray-200 bg-white px-3 py-2 min-w-[120px]">
                                                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Scope</p>
                                                    <p className="text-sm font-semibold text-gray-900 truncate max-w-[170px]">{activeStudyLabel}</p>
                                                </div>
                                                <div className="rounded-md border border-gray-200 bg-white px-3 py-2 min-w-[110px]">
                                                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Experiments</p>
                                                    <p className="text-sm font-semibold text-gray-900">{experimentCount}</p>
                                                </div>
                                                <div className="rounded-md border border-gray-200 bg-white px-3 py-2 min-w-[90px]">
                                                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Runs</p>
                                                    <p className="text-sm font-semibold text-gray-900">{runsForSelectedScope.length}</p>
                                                </div>
                                                {showingAllStudies && (
                                                    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 min-w-[150px]">
                                                        <p className="text-[11px] uppercase tracking-wide text-gray-500">Focused Grid</p>
                                                        <p className="text-sm font-semibold text-gray-900 truncate max-w-[170px]">{focusedGridLabel}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {!hasRuns && (
                                        <Paragraph className="text-sm text-gray-500">
                                            This experiment scope has no runs defined yet.
                                        </Paragraph>
                                    )}

                                    {hasRuns ? (
                                        <>
                                            {sortedVariables.length === 0 && (
                                                <Paragraph className="text-sm text-gray-500 italic">No variables defined.</Paragraph>
                                            )}

                                            {sortedVariables.length > 0 && (
                                                <div className="space-y-4">
                                                    {studiesInScope.map((study, studyIndex) => {
                                                        const runsForStudy = groupedRuns.get(study.id) || [];
                                                        const hasStudyRuns = runsForStudy.length > 0;
                                                        const studyLabel = study?.name || `Untitled study ${studyIndex + 1}`;
                                                        return (
                                                            <section
                                                                key={study.id || `study-${studyIndex}`}
                                                                className="rounded-lg border border-gray-200 bg-white p-3 space-y-3"
                                                            >
                                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                                    <Heading3 className="text-base font-semibold text-gray-900">
                                                                        {studyLabel}
                                                                    </Heading3>
                                                                    <span className="text-xs uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                                        {runsForStudy.length} run{runsForStudy.length === 1 ? '' : 's'}
                                                                    </span>
                                                                </div>

                                                                {!hasStudyRuns ? (
                                                                    <Paragraph className="text-sm text-gray-500 italic">
                                                                        No runs defined for this experiment.
                                                                    </Paragraph>
                                                                ) : (
                                                                    <div
                                                                        onPointerDown={() => handleGridFocus(study.id)}
                                                                        className="border border-gray-200 rounded-lg"
                                                                    >
                                                                        <DataGrid
                                                                            {...{ ...buildGridConfig(runsForStudy), rowData: normalizedSortedVariables }}
                                                                            showControls={true}
                                                                            showDebug={false}
                                                                            enableBulkFill={true}
                                                                            onDataChange={onGridMappingsChangeByStudyId[study.id]}
                                                                            height={Math.min(600, (normalizedSortedVariables.length * 50) + 115)}
                                                                            isActive={currentPage === pageIndex && activeGridScopeId === study.id}
                                                                            actionPlugins={[FilePickerPlugin]}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </section>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <Paragraph className="text-sm text-gray-500 italic">
                                            Add runs to this experiment scope to enable variable mappings.
                                        </Paragraph>
                                    )}
                                </section>
                            );
                        })()}
                    </div>
                </TabPanel>
            </div>
        </div>
    );
});

StudyVariableSlide.displayName = 'Experiment Variable Mappings';

export default StudyVariableSlide;
