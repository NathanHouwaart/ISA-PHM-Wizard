import React, { forwardRef, useEffect, useMemo, useState, useCallback } from 'react'

// Import hooks
import useVariables from '../../hooks/useVariables';
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

// Import the single global provider
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';

// Import components
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';
import TabSwitcher, { TabPanel } from '../TabSwitcher';
import EntityMappingPanel from '../EntityMappingPanel';
import useMappingsController from '../../hooks/useMappingsController';

// Data Grid Imports
import { Template } from '@revolist/react-datagrid';
import DataGrid from '../DataGrid';
import { GrayCell, BoldCell } from '../GridTable/CellTemplates';

// Import content data
import studyVariableSlideContent from '../../data/StudyVariableSlideContent.json'; // Assuming you have a JSON file for the content

import SelectTypePlugin from '@revolist/revogrid-column-select'
import { VARIABLE_TYPE_OPTIONS } from '../../constants/variableTypes';
import usePageTab from '../../hooks/usePageWidth';
import { WINDOW_HEIGHT } from '../../constants/slideWindowHeight';

// register column type
const plugin = { select: new SelectTypePlugin() }

// TODO: ADD PAGE NUMBER IN PARAMETERS
export const StudyVariableSlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {

    // Use persistent tab state that remembers across page navigation
    const [selectedTab, setSelectedTab] = usePageTab(pageIndex, 'simple-view');

    // Observe height changes
    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    // Access global context
    const {
        studies,
        studyVariables,
        setScreenWidth,
        setStudyVariables,
        studyToStudyVariableMapping,
        setStudyToStudyVariableMapping
    } = useGlobalDataContext();

    // Screen width is managed globally by IsaQuestionnaire based on persisted tab state.

    // Create a dropdown for the 'type' column (memoized)
    const dropdown = useMemo(() => ({
        labelKey: 'label',
        valueKey: 'value',
        source: VARIABLE_TYPE_OPTIONS.map(type => ({ label: type, value: type })),
    }), []);

    // Helper function to generate unique IDs
    const generateId = () => {
        return crypto.randomUUID();
    };

    const addNewVariable = useCallback(() => {
        setStudyVariables(prev => {
            const newVariable = {
                id: generateId(),
                name: `New Variable ${prev.length + 1}`,
                type: '',
                unit: '',
                description: ''
            };
            return [...prev, newVariable];
        });
    }, [setStudyVariables]);

    const removeLastVariable = useCallback(() => {
        setStudyVariables(prev => (prev.length > 0 ? prev.slice(0, -1) : prev));
    }, [setStudyVariables]);

    // We'll use a single mappings controller so both the simple view and the grid
    // operate on the exact same canonical mappings object.
    const mappingsController = useMappingsController();

    // Handle row data changes
    const handleDataGridRowDataChange = useCallback((newRowData) => {
        setStudyVariables(newRowData);
    }, [setStudyVariables]);

    // Note: simple view input updates will use mappingsController.updateMappingValue

    // Grid configuration for studies
    const studyVariableGridConfig = {
        title: 'Variables to Studies Grid',
        rowData: studyVariables,
        columnData: studies,
    mappings: mappingsController.mappings,
        fieldMappings: {
            rowId: 'id',
            rowName: 'name',
            columnId: 'id',
            columnName: 'name',
            columnUnit: '',
            mappingRowId: 'studyVariableId',
            mappingColumnId: 'studyId',
            mappingValue: 'value'
        },
        staticColumns: useMemo(() => ([
            {
                prop: 'name',
                name: 'Variable Name',
                size: 200,
                readonly: false,
                cellTemplate: Template(BoldCell),
                cellProperties: () => ({ style: { "border-right": "3px solid " } })
            },
            {
                prop: 'type',
                name: 'Type',
                size: 150,
                readonly: false,
                columnType: 'select',
                ...dropdown
            },
            {
                prop: 'unit',
                name: 'Unit',
                size: 100,
                readonly: false
            },
            {
                prop: 'description',
                name: 'Description',
                size: 300,
                readonly: false,
                cellProperties: () => ({ style: { "border-right": "3px solid " } })
            }
        ]), [dropdown]),
        customActions : useMemo(() => ([
            {
                label: '+ Add Variable',
                onClick: addNewVariable,
                className: 'px-3 py-1 text-sm bg-green-50 text-green-700 border border-green-300 rounded hover:bg-green-100',
                title: 'Add a new variable'
            },
            {
                label: '- Remove Last',
                onClick: removeLastVariable,
                disabled: studyVariables.length === 0,
                className: `px-3 py-1 text-sm border rounded ${studyVariables.length === 0
                    ? 'bg-gray-50 text-gray-400 border-gray-300 cursor-not-allowed'
                    : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                    }`,
                title: 'Remove the last variable'
            }
        ]), [addNewVariable, removeLastVariable, studyVariables.length])
    };

    return (
        <div ref={combinedRef}>
            <SlidePageTitle>{studyVariableSlideContent.pageTitle}</SlidePageTitle>
            <SlidePageSubtitle>{studyVariableSlideContent.pageSubtitle}</SlidePageSubtitle>

            <div className='bg-gray-50 p-3 border-gray-300 border rounded-lg pb-2 relative'>
                <TabSwitcher
                    selectedTab={selectedTab}
                    onTabChange={setSelectedTab}
                    tabs={[
                        { id: 'simple-view', label: 'Simple View', tooltip: 'View study variables in a simple list format' },
                        { id: 'grid-view', label: 'Grid View', tooltip: 'View study variables in a grid format for better data management' }
                    ]}
                />

                <TabPanel isActive={selectedTab === 'simple-view'}>
                        <EntityMappingPanel
                            minHeight={WINDOW_HEIGHT}
                            name={"Variables"}
                            itemHook={useVariables}
                            mappings={mappingsController.mappings}
                            handleInputChange={mappingsController.updateMappingValue}
                        />
                </TabPanel>

                <TabPanel isActive={selectedTab === 'grid-view'}>
                    <DataGrid
                        {...studyVariableGridConfig}
                        showControls={true}
                        plugins={plugin}
                        showDebug={false}
                        onDataChange={mappingsController.setMappings}
                        onRowDataChange={handleDataGridRowDataChange}
                        height={WINDOW_HEIGHT}
                        isActive={selectedTab === 'grid-view' && currentPage === pageIndex}
                    />
                </TabPanel>
            </div>
        </div>
    );
});

StudyVariableSlide.displayName = "Study Variables"; // Set display name for better debugging

export default StudyVariableSlide;