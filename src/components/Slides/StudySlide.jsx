// src/pages/StudyPage.js
import React, { forwardRef, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

// Import the single global provider
import { useProjectActions, useProjectData } from '../../contexts/GlobalDataContext';

import useStudies from '../../hooks/useStudies';
import Collection, {
    CollectionTitle,
    CollectionSubtitle,
    CollectionAddButtonText,
    CollectionEmptyStateTitle,
    CollectionEmptyStateSubtitle,
    CollectionEmptyStateAddButtonText,
    CollectionExtraActions
} from '../Collection';

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import { usePageTab } from '../../hooks/usePageWidth'; // Import the usePageTab hook

import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle, default as Paragraph } from '../Typography/Paragraph';
import TabSwitcher, { TabPanel } from '../TabSwitcher';

import DataGrid from '../DataGrid/DataGrid'; // Import the new DataGrid
import { HTML5DateCellTemplate, PatternCellTemplate, DeleteRowCellTemplate } from '../DataGrid/CellTemplates'; // Import cell templates
import { Template } from '@revolist/react-datagrid';
import SelectTypePlugin from '@revolist/revogrid-column-select';
import { WINDOW_HEIGHT } from '../../constants/slideWindowHeight';
import { getExperimentTypeConfig } from '../../constants/experimentTypes';
import generateId from '../../utils/generateId';
import { OUTPUT_MODE_RAW_ONLY, OUTPUT_MODE_OPTIONS } from '../../utils/studyOutputMode';

const plugins = { select: new SelectTypePlugin() };

export const StudySlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {

    // Use persistent tab state that remembers across page navigation
    const [selectedTab, setSelectedTab] = usePageTab(pageIndex, 'simple-view'); // Page 5 for StudySlide

    // Observe height changes
    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    // Access global context
    const {
        studies,
        experimentType,
        testSetups,
        selectedTestSetupId
    } = useProjectData();
    const { setStudies } = useProjectActions();

    const experimentConfig = getExperimentTypeConfig(experimentType);
    // Screen width is managed centrally by IsaQuestionnaire; no per-slide effect needed here.

    // Add new study function
    const addNewStudy = () => {
        const newStudy = {
            id: generateId(),
            name: `New Experiment ${studies.length + 1}`,
            description: 'Enter description...',
            submissionDate: "",
            publicationDate: "", 
            configurationId: '',
            runCount: 1,
            outputMode: OUTPUT_MODE_RAW_ONLY
        };
        setStudies([...studies, newStudy]);
    };

    // Bulk add
    const [showBulkAdd, setShowBulkAdd] = useState(false);
    const [bulkAddInput, setBulkAddInput] = useState('10');
    const bulkInputRef = useRef(null);

    const bulkAddStudies = () => {
        const count = parseInt(bulkAddInput, 10);
        if (!count || count < 1) return;
        const base = studies.length;
        const newStudies = Array.from({ length: count }, (_, i) => ({
            id: generateId(),
            name: `New Experiment ${base + i + 1}`,
            description: 'Enter description...',
            submissionDate: '',
            publicationDate: '',
            configurationId: '',
            runCount: 1,
            outputMode: OUTPUT_MODE_RAW_ONLY
        }));
        setStudies([...studies, ...newStudies]);
        setShowBulkAdd(false);
        setBulkAddInput('10');
    };

    // Handle study data changes from the grid
    const handleStudyDataChange = (newStudyData) => {
        setStudies(newStudyData || []);
    };

    // Get configurations from selected test setup for dropdown
    const selectedSetup = testSetups?.find(t => t.id === selectedTestSetupId);
    const configurationOptions = (selectedSetup?.configurations || []).map(c => ({
        value: c.id,
        label: (c.name || c.replaceableComponentId)
            ? [c.name, c.replaceableComponentId].filter(Boolean).join(' - ')
            : 'Unnamed'
    }));

    // Grid configuration for studies
    const studiesGridConfig = {
        title: 'Experiment Grid',
        rowData: studies,
        columnData: [], // No dynamic columns for standalone grid
        mappings: [], // No mappings for standalone grid
        customActions: [
            {
                label: '+ Add Experiment',
                onClick: addNewStudy,
                className: 'px-3 py-1 text-sm bg-green-50 text-green-700 border border-green-300 rounded hover:bg-green-100',
                title: 'Add a new experiment'
            },
            {
                label: '+ Add X Experiments',
                onClick: () => setShowBulkAdd(true),
                className: 'px-3 py-1 text-sm bg-blue-50 text-blue-700 border border-blue-300 rounded hover:bg-blue-100',
                title: 'Bulk-add multiple experiments at once'
            }
        ],
            staticColumns: [
            {
                prop: 'actions',
                name: '',
                size: 80,
                readonly: true,
                cellTemplate: Template(DeleteRowCellTemplate),
                cellProperties: () => ({ style: { 'text-align': 'center' } })
            },
            {
                prop: 'id',
                name: 'Identifier',
                size: 150,
                readonly: true,
                cellTemplate: Template(PatternCellTemplate, { prefix: 'Experiment S' }),
                cellProperties: () => ({
                    style: {
                        "border-right": "3px solid "
                    }
                })
            },
            {
                prop: 'name',
                name: 'Experiment Name',
                size: 200,
                readonly: false
            },
            {
                prop: 'description',
                name: 'Description',
                size: 300,
                readonly: false
            },
            {
                prop: 'submissionDate',
                name: 'Experiment Date',
                size: 180,
                readonly: false,
                cellTemplate: Template(HTML5DateCellTemplate),
            },
            {
                prop: 'publicationDate',
                name: 'Publication Date',
                size: 180,
                readonly: false,
                cellTemplate: Template(HTML5DateCellTemplate),
            },
            {
                prop: 'configurationId',
                name: 'Configuration',
                size: 220,
                readonly: false,
                columnType: 'select',
                labelKey: 'label',
                valueKey: 'value',
                source: configurationOptions
            },
            ...(experimentConfig.supportsMultipleRuns ? [{
                prop: 'runCount',
                name: 'Number of runs',
                size: 160,
                readonly: false,
            }] : []),
            {
                prop: 'outputMode',
                name: 'Data Types',
                size: 180,
                readonly: false,
                columnType: 'select',
                labelKey: 'label',
                valueKey: 'value',
                source: OUTPUT_MODE_OPTIONS
            }
        ]
    };
    
    return (
        <>
        <div ref={combinedRef}>

            <SlidePageTitle>
                Experiment descriptions
            </SlidePageTitle>

            <SlidePageSubtitle>
                Describe the experiments performed within the research project. For example, each test with a different tested component (e.g. bearing) is described in a new experiment. The associated faults and operating conditions can be described on the following page.
            </SlidePageSubtitle>
          
            <div className='bg-gray-50 p-3 border-gray-300 border rounded-lg pb-2 relative'>
               <TabSwitcher
                    selectedTab={selectedTab}
                    onTabChange={setSelectedTab}
                    tabs={[
                        { id: 'simple-view', label: 'Simple View', tooltip: 'View studies in a simple list format' },
                        { id: 'grid-view', label: 'Grid View', tooltip: 'View studies in a grid format for better data management' }
                    ]}
                />

                <TabPanel isActive={selectedTab === 'simple-view'} unmountOnHide>
                    <div className="max-h-[45vh] overflow-y-auto">
                        <Collection
                            onHeightChange={() => { }}
                            itemHook={useStudies} // This hook will need to pull 'studies' from the global context
                            grid={true}
                        >
                            <CollectionTitle>Experiments ({studies?.length || 0})</CollectionTitle>
                            <CollectionSubtitle>View, add and edit Experiments</CollectionSubtitle>
                            <CollectionAddButtonText>Add Experiment</CollectionAddButtonText>
                            <CollectionEmptyStateTitle>No Experiments Found</CollectionEmptyStateTitle>
                            <CollectionEmptyStateSubtitle>Get started by adding your first Experiment</CollectionEmptyStateSubtitle>
                            <CollectionEmptyStateAddButtonText>Add Experiment Now</CollectionEmptyStateAddButtonText>
                            <CollectionExtraActions>
                                <button
                                    onClick={() => setShowBulkAdd(true)}
                                    title="Bulk-add multiple experiments at once"
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-300 rounded hover:bg-blue-100"
                                >
                                    + Add X Experiments
                                </button>
                            </CollectionExtraActions>
                        </Collection>
                    </div>
                </TabPanel>

                <TabPanel isActive={selectedTab === 'grid-view'} unmountOnHide>
                    <DataGrid
                        {...studiesGridConfig}
                        showControls={true}
                        showDebug={false}
                        enableBulkFill={true}
                        enableColFilter={true}
                        enableRowFilter={true}
                        onRowDataChange={handleStudyDataChange}
                        plugins={plugins}
                        height={"45vh"}
                        isActive={selectedTab === 'grid-view' && currentPage === pageIndex}
                    />
                </TabPanel>
            </div>
        </div>

        {/* Bulk Add Dialog */}
        {showBulkAdd && createPortal(
            <div
                className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
                onClick={() => setShowBulkAdd(false)}
            >
                <div
                    className="bg-white rounded-lg shadow-xl p-6 w-80"
                    onClick={e => e.stopPropagation()}
                >
                    <h3 className="text-base font-semibold text-gray-800 mb-1">Bulk Add Experiments</h3>
                    <p className="text-sm text-gray-500 mb-3">How many experiments would you like to add?</p>
                    <input
                        ref={bulkInputRef}
                        type="number"
                        min="1"
                        max="2000"
                        value={bulkAddInput}
                        onChange={e => setBulkAddInput(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        autoFocus
                        onKeyDown={e => {
                            if (e.key === 'Enter') bulkAddStudies();
                            if (e.key === 'Escape') setShowBulkAdd(false);
                        }}
                    />
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => setShowBulkAdd(false)}
                            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={bulkAddStudies}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Add {parseInt(bulkAddInput, 10) > 0 ? parseInt(bulkAddInput, 10) : ''} Experiments
                        </button>
                    </div>
                </div>
            </div>
        , document.body)}
        </>
    );
});

StudySlide.displayName = "Experiments"; // Set display name for better debugging

export default StudySlide;
