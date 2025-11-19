import { Edit2, Trash2 } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import FormField from './Form/FormField';
import EditEntityModal from './EditEntityModal';
import { VARIABLE_TYPE_OPTIONS } from '../constants/variableTypes';
import Heading3 from './Typography/Heading3';
import Paragraph from './Typography/Paragraph';
import useStudyRuns from '../hooks/useStudyRuns';
import TabSwitcher, { TabPanel } from './TabSwitcher';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';

export function StudyVariableMappingCard({ item, itemIndex, mappings, onSave, handleInputChange, removeParameter, openEdit, onOpenHandled }) {

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const studyRuns = useStudyRuns();
    const { studies } = useGlobalDataContext();

    // Open modal when parent signals an add-created item
    if (openEdit && !isEditModalOpen) {
        setIsEditModalOpen(true);
        onOpenHandled && onOpenHandled();
    }

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
            {/* Variable Header, Edit/Remove Buttons */}
            <div className="flex justify-between items-start mb-4 border-b pb-4">
                <Heading3 className="text-3xl font-bold text-gray-800 flex-grow pr-4">
                    {item.name}
                </Heading3>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out flex items-center justify-center text-sm transform hover:scale-105"
                        title="Edit Variable Details"
                    >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Details
                    </button>
                    <button
                        onClick={() => removeParameter(item.id)}
                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition duration-200 ease-in-out flex items-center justify-center text-sm transform hover:scale-105"
                        title="Remove Parameter"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                    </button>
                </div>
            </div>
            <Paragraph className="text-md text-gray-700 mb-4">
                {item.description}
            </Paragraph>
            <div className="flex justify-between items-center text-sm font-medium text-gray-600 bg-gray-50 px-4 py-2 rounded-md mb-6 border border-gray-200">
                <span>Type: <span className="font-semibold text-gray-800">{item.type}</span></span>
                {item.unit && <span>Unit: <span className="font-semibold text-gray-800">{item.unit}</span></span>}
            </div>

            {/* mappings Grid - this is where the dynamic inputs are */}
            {studyTabs.length === 0 ? (
                <Paragraph className="italic text-gray-500">
                    No studies with runs available. Add runs to start mapping this variable.
                </Paragraph>
            ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <TabSwitcher
                        selectedTab={activeStudyId}
                        onTabChange={setActiveStudyId}
                        tabs={studyTabs.map(study => ({
                            id: study.studyId,
                            label: study.label,
                            tooltip: `${study.label} (${study.runs.length} run${study.runs.length > 1 ? 's' : ''})`
                        }))}
                        className="mb-3 overflow-x-auto"
                    />

                    {studyTabs.map((study) => (
                        <TabPanel key={study.studyId} isActive={activeStudyId === study.studyId}>
                            {study.runs.length === 0 ? (
                                <Paragraph className="text-sm text-gray-500 italic">
                                    This study has no runs defined yet.
                                </Paragraph>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {study.runs.map((run) => {
                                        const mapping = mappingByRunId.get(run.runId);
                                        return (
                                            <div
                                                key={`${run.runId}-${item.id}`}
                                                className="bg-white border border-blue-100 rounded-lg p-4 shadow-sm"
                                            >
                                                <Heading3 className="text-sm font-semibold text-blue-900 mb-2">
                                                    {run.runCount > 1 ? `Run ${run.runNumber}` : 'Single run'}
                                                </Heading3>
                                                <FormField
                                                    label="Mapping value"
                                                    name={`mapping-${run.runId}`}
                                                    value={mapping?.value || ''}
                                                    commitOnBlur={true}
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
                                                    placeholder="Enter value"
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

            {/* Edit Variable Details Modal */}
            <div className={`transition-all duration-200 ${(isEditModalOpen) ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <EditEntityModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={onSave}
                    initialData={item}
                    title={`Edit Variable: ${item.name}`}
                    fields={[
                        { 
                            name: 'name', 
                            label: 'Variable Name', 
                            explanation: "Define all variables that can be varied in the experiments. As many variables can be added/removed as required to describe the experiment.",
                            example: ": Fault type, fault severity or motor speed or other."
                        
                        },
                        { 
                            name: 'type', 
                            label: 'Variable Type', 
                            type: 'select', 
                            options: VARIABLE_TYPE_OPTIONS,
                            explanation: "Describe the type of the variable (e.g. operating condition/fault specification).",
                            example: "Quantitative fault specification, qualitative fault specification, operational condition, environmental condition or other."
                        },
                        { 
                            name: 'unit', 
                            label: 'Unit',  
                            explanation: "Unit corresponding with the variable. Please leave empty if none.",
                            example: "Hz, RPM, m/s."
                        },
                        { 
                            name: 'description', 
                            label: 'Description', 
                            type: 'textarea',
                            explanation: "Description of the variable.",
                            example: "Measures the impact or intensity of the fault."
                        }
                    ]}
                />
            </div>
        </div >
    )
}

export default StudyVariableMappingCard
