// src/pages/StudyPage.js
import React, { forwardRef } from 'react';

// Import the single global provider
import { useProjectActions, useProjectData } from '../../contexts/GlobalDataContext';

import useStudies from '../../hooks/useStudies';
import Collection, {
    CollectionTitle,
    CollectionSubtitle,
    CollectionAddButtonText,
    CollectionEmptyStateTitle,
    CollectionEmptyStateSubtitle,
    CollectionEmptyStateAddButtonText
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
import { OUTPUT_MODE_RAW_ONLY } from '../../utils/studyOutputMode';

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
            }] : [])
        ]
    };
    
    return (
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
                        </Collection>
                    </div>
                </TabPanel>

                <TabPanel isActive={selectedTab === 'grid-view'} unmountOnHide>
                    <DataGrid
                        {...studiesGridConfig}
                        showControls={true}
                        showDebug={false}
                        onRowDataChange={handleStudyDataChange}
                        plugins={plugins}
                        height={"45vh"}
                        isActive={selectedTab === 'grid-view' && currentPage === pageIndex}
                    />
                </TabPanel>
            </div>
        </div>
    );
});

StudySlide.displayName = "Experiments"; // Set display name for better debugging

export default StudySlide;
