import React, { useMemo, useEffect, useState } from 'react';

import FormField from './Form/FormField';
import Heading3 from './Typography/Heading3';
import Paragraph from './Typography/Paragraph';
import useStudyRuns from '../hooks/useStudyRuns';
import ItemSelector from './Selectors/ItemSelector';
import { TabPanel } from './TabSwitcher';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';

const StudyVariableMappingCard = ({ item, itemIndex, mappings, handleInputChange, singleRunMode = false }) => {
    const studyRuns = useStudyRuns();
    const { studies, studyVariables } = useGlobalDataContext();

    // When singleRunMode is true, item is the active run passed from DualSidebarStudyRunPanel
    // In that case, we just display that single run's mapping
    const activeVariable = singleRunMode ? studyVariables[itemIndex] : item;


    const runsByStudy = useMemo(() => {
        const grouped = new Map();
        studyRuns.forEach((run) => {
            if (!grouped.has(run.studyId)) {
                grouped.set(run.studyId, []);
            }
            grouped.get(run.studyId).push(run);
        });
        return grouped;
    }, [studyRuns]);

    const studyTabs = useMemo(() => {
        return studies
            .map((study) => ({
                studyId: study.id,
                label: study.name || 'Untitled study',
                runs: runsByStudy.get(study.id) || []
            }))
            .filter((group) => group.runs.length > 0);
    }, [studies, runsByStudy]);

    const [activeStudyId, setActiveStudyId] = useState(studyTabs[0]?.studyId);

    useEffect(() => {
        if (!studyTabs.length) {
            setActiveStudyId(undefined);
            return;
        }
        if (!activeStudyId || !studyTabs.some((tab) => tab.studyId === activeStudyId)) {
            setActiveStudyId(studyTabs[0].studyId);
        }
    }, [studyTabs, activeStudyId]);

    const mappingByRunId = useMemo(() => {
        const lookup = new Map();
        studyRuns.forEach((run) => {
            const match = mappings.find((m) => {
                if (m.studyRunId) {
                    return m.studyVariableId === item.id && m.studyRunId === run.runId;
                }
                return m.studyVariableId === item.id && m.studyId === run.studyId;
            });
            lookup.set(run.runId, match || {
                studyVariableId: item.id,
                studyRunId: run.runId,
                studyId: run.studyId,
                value: ''
            });
        });
        return lookup;
    }, [studyRuns, mappings, item.id]);

    return (
        <div className="w-full bg-white border border-gray-200 rounded-xl p-6 flex flex-col min-h-full">
            <div className="mb-4 border-b pb-4">
                <Heading3 className="text-3xl font-bold text-gray-800">
                    {activeVariable?.name || 'Unnamed variable'}
                </Heading3>
            </div>
            <Paragraph className="text-md text-gray-700 mb-4">
                {activeVariable?.description}
            </Paragraph>
            <div className="flex justify-between items-center text-sm font-medium text-gray-600 bg-gray-50 px-4 py-2 rounded-md mb-6 border border-gray-200">
                <span>Type: <span className="font-semibold text-gray-800">{activeVariable?.type}</span></span>
                {activeVariable?.unit && <span>Unit: <span className="font-semibold text-gray-800">{activeVariable?.unit}</span></span>}
            </div>

            {singleRunMode ? (
                // When used in DualSidebarStudyRunPanel: item is the active run
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    {studyVariables.map((variable, varIndex) => {
                        const mapping = mappings.find((m) => 
                            m.studyVariableId === variable.id && 
                            (m.studyRunId === item.runId || m.studyRunId === item.id)
                        ) || {
                            studyVariableId: variable.id,
                            studyRunId: item.runId || item.id,
                            studyId: item.studyId,
                            value: ''
                        };

                        return (
                            <div key={variable.id} className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm mb-3">
                                <div className="mb-2">
                                    <Heading3 className="text-base font-semibold text-blue-900">
                                        {variable.name}
                                    </Heading3>
                                    <Paragraph className="text-xs text-gray-600">{variable.description}</Paragraph>
                                </div>
                                <FormField
                                    label=""
                                    name={`mapping-${variable.id}`}
                                    value={mapping.value || ''}
                                    commitOnBlur
                                    className="w-full"
                                    onChange={(e) =>
                                        handleInputChange(
                                            varIndex,
                                            {
                                                studyVariableId: variable.id,
                                                studyRunId: item.runId || item.id,
                                                studyId: item.studyId
                                            },
                                            e.target.value
                                        )
                                    }
                                    placeholder="Enter mapped value"
                                />
                            </div>
                        );
                    })}
                </div>
            ) : (
                // Original EntityMappingPanel usage: item is a variable, show all runs
                <>
                    {studyTabs.length === 0 ? (
                <Paragraph className="italic text-gray-500">
                    No studies with runs available. Add runs to start mapping this variable.
                </Paragraph>
            ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <ItemSelector
                        items={studyTabs}
                        selectedId={activeStudyId}
                        onChange={setActiveStudyId}
                        idKey="studyId"
                        labelKey="label"
                        getBadgeContent={(study) => `${study.runs.length} run${study.runs.length !== 1 ? 's' : ''}`}
                        placeholder="Search studies..."
                        searchLabel="Search Studies"
                        className="mb-3"
                    />

                    {studyTabs.map((study) => (
                        <TabPanel key={study.studyId} isActive={activeStudyId === study.studyId}>
                            {study.runs.length === 0 ? (
                                <Paragraph className="text-sm text-gray-500 italic">
                                    This study has no runs defined yet.
                                </Paragraph>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {study.runs.map((run) => {
                                        const mapping = mappingByRunId.get(run.runId);
                                        return (
                                            <div
                                                key={`${run.runId}-${item.id}`}
                                                className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm flex flex-col gap-3"
                                                >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[11px] uppercase tracking-wide text-blue-500">
                                                            {study.label}
                                                        </p>
                                                        <Heading3 className="text-base font-semibold text-blue-900">
                                                            {run.runCount > 1 ? `Run ${run.runNumber}` : 'Single run'}
                                                        </Heading3>
                                                    </div>
                                                    <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700">
                                                        {run.studyIndex !== undefined ? `S${run.studyIndex + 1}` : 'Run'}
                                                    </span>
                                                </div>
                                                <FormField
                                                    label=""
                                                    name={`mapping-${run.runId}`}
                                                    value={mapping?.value || ''}
                                                    commitOnBlur
                                                    className="w-full min-w-[160px]"
                                                    onChange={(e) =>
                                                        handleInputChange(
                                                            itemIndex,
                                                            {
                                                                studyVariableId: mapping.studyVariableId,
                                                                studyRunId: mapping.studyRunId || run.runId,
                                                                studyId: run.studyId
                                                            },
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Enter mapped value"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </TabPanel>
                    ))}
                </div>
            )}
                </>
            )}
        </div >
    );
};

export default StudyVariableMappingCard;
