import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';

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
import { groupStudyRuns } from '../../utils/studyRuns';
import TabSwitcher, { TabPanel } from '../TabSwitcher';
import EntityMappingPanel from '../EntityMappingPanel';
import useVariables from '../../hooks/useVariables';
import usePageTab from '../../hooks/usePageWidth';

const StudyVariableSlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {
    const resizeRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, resizeRef);

    const {
        studies,
        studyVariables,
        setScreenWidth
    } = useGlobalDataContext();

    const [selectedTab, setSelectedTab] = usePageTab(pageIndex, 'simple-view');
    const studyRuns = useStudyRuns();
    const groupedRuns = useMemo(() => groupStudyRuns(studyRuns), [studyRuns]);

    const mappingsController = useMappingsController(
        'studyToStudyVariableMapping',
        { sourceKey: 'studyVariableId', targetKey: 'studyRunId' }
    );

    const [activeStudyId, setActiveStudyId] = useState(() => studies?.[0]?.id || null);

    useEffect(() => {
        setScreenWidth(selectedTab === 'grid-view' ? 'max-w-[100rem]' : 'max-w-5xl');
    }, [selectedTab, setScreenWidth]);

    useEffect(() => {
        if (studies.length === 0) {
            setActiveStudyId(null);
            return;
        }
        if (!activeStudyId || !studies.some(study => study.id === activeStudyId)) {
            setActiveStudyId(studies[0].id);
        }
    }, [studies, activeStudyId]);

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

    const handleGridFocus = useCallback((studyId) => {
        setActiveStudyId(studyId);
    }, []);

    const gridHeight = useMemo(() => {
        const rows = Math.max(1, studyVariables.length);
        const rowHeight = 50;
        const structuralPadding = 60;
        const desired = (rows * rowHeight) + structuralPadding;
        const maxHeight = 500;
        return Math.min(maxHeight, desired);
    }, [studyVariables.length]);

    return (
        <div ref={combinedRef}>
            <SlidePageTitle>
                Study Variable Mappings
            </SlidePageTitle>

            <SlidePageSubtitle>
                Map each defined variable to the runs that belong to your studies. Variable definitions are read-only in this view to keep the focus on assigning run-specific values.
            </SlidePageSubtitle>

            <TabSwitcher
                selectedTab={selectedTab}
                onTabChange={setSelectedTab}
                tabs={[
                    { id: 'simple-view', label: 'Simple View', tooltip: 'Work variable by variable with per-run tabs' },
                    { id: 'grid-view', label: 'Grid View', tooltip: 'See mappings per study/run in stacked grids' }
                ]}
                className="mb-4"
            />

            <TabPanel isActive={selectedTab === 'simple-view'}>
                {studyVariables.length === 0 && (
                    <WarningBanner type="info">
                        <strong>No variables defined.</strong> Add variables in the Study Variable Definitions slide to start mapping them.
                    </WarningBanner>
                )}
                <EntityMappingPanel
                    minHeight={Math.max(400, studyVariables.length * 120)}
                    name="Variables"
                    itemHook={useVariables}
                    mappings={mappingsController.mappings}
                    handleInputChange={mappingsController.updateMappingValue}
                />
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

                <div className="space-y-4 mt-4">
                    {studies.map((study) => {
                        const runsForStudy = groupedRuns.get(study.id) || [];
                        const hasRuns = runsForStudy.length > 0;

                        const gridConfig = {
                            title: `${study.name} variable mappings`,
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
                                        {study.name}
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
                                        />
                                    </div>
                                ) : (
                                    <Paragraph className="text-sm text-gray-500 italic">
                                        Add runs to this study to enable variable mappings.
                                    </Paragraph>
                                )}
                            </section>
                        );
                    })}
                </div>
            </TabPanel>
        </div>
    );
});

StudyVariableSlide.displayName = 'Study Variable Mappings';

export default StudyVariableSlide;
