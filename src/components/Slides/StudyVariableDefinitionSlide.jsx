import React, { forwardRef, useCallback, useMemo } from 'react';

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import generateId from '../../utils/generateId';
import useVariables from '../../hooks/useVariables';
import Collection, {
    CollectionTitle,
    CollectionSubtitle,
    CollectionAddButtonText,
    CollectionEmptyStateTitle,
    CollectionEmptyStateSubtitle,
    CollectionEmptyStateAddButtonText
} from '../Collection';

import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';
import DataGrid from '../DataGrid/DataGrid';
import { Template } from '@revolist/react-datagrid';
import { BoldCell, DeleteRowCellTemplate } from '../DataGrid/CellTemplates';
import SelectTypePlugin from '@revolist/revogrid-column-select';
import { VARIABLE_TYPE_OPTIONS } from '../../constants/variableTypes';
import { WINDOW_HEIGHT } from '../../constants/slideWindowHeight';
import TabSwitcher, { TabPanel } from '../TabSwitcher';
import usePageTab from '../../hooks/usePageWidth';

const plugins = { select: new SelectTypePlugin() };

const StudyVariableDefinitionSlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {
    const resizeRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, resizeRef);

    const { studyVariables, setStudyVariables } = useGlobalDataContext();
    const [selectedTab, setSelectedTab] = usePageTab(pageIndex, 'simple-view');



    const addNewVariable = useCallback(() => {
        setStudyVariables(prev => {
            const nextIndex = prev.length + 1;
            return [
                ...prev,
                {
                    id: generateId(),
                    name: `New Variable ${nextIndex}`,
                    type: VARIABLE_TYPE_OPTIONS[0] || '',
                    unit: '',
                    description: ''
                }
            ];
        });
    }, [setStudyVariables]);

    const handleRowDataChange = useCallback((newRows) => {
        setStudyVariables(newRows);
    }, [setStudyVariables]);

    const typeOptions = useMemo(
        () => VARIABLE_TYPE_OPTIONS.map((type) => ({ label: type, value: type })),
        []
    );

    const variableGridConfig = useMemo(() => ({
        title: 'Study Variable Definitions',
        rowData: studyVariables,
        columnData: [],
        mappings: [],
        staticColumns: [
            {
                prop: 'actions',
                name: '',
                size: 70,
                readonly: true,
                pin: 'colPinStart',
                cellTemplate: Template(DeleteRowCellTemplate),
                cellProperties: () => ({ style: { 'text-align': 'center' } })
            },
            {
                prop: 'name',
                name: 'Variable Name',
                size: 220,
                readonly: false,
                pin: 'colPinStart',
                cellTemplate: Template(BoldCell),
                cellProperties: () => ({ style: { "border-right": "3px solid " } })
            },
            {
                prop: 'type',
                name: 'Type',
                size: 280,
                readonly: false,
                columnType: 'select',
                labelKey: 'label',
                valueKey: 'value',
                source: typeOptions
            },
            {
                prop: 'unit',
                name: 'Unit',
                size: 120,
                readonly: false
            },
            {
                prop: 'description',
                name: 'Description',
                size: 750,
                readonly: false
            }
        ],
        customActions: [
            {
                label: '+ Add Variable',
                onClick: addNewVariable,
                className: 'px-3 py-1 text-sm bg-green-50 text-green-700 border border-green-300 rounded hover:bg-green-100',
                title: 'Add a new study variable'
            }
        ]
    }), [studyVariables, addNewVariable, typeOptions]);

    return (
        <div ref={combinedRef}>
            <SlidePageTitle>
                Study Variable Definitions
            </SlidePageTitle>

            <SlidePageSubtitle>
                Define the variables that describe your studies, including their type, units, and descriptive notes. These definitions are shared across all mappings.
            </SlidePageSubtitle>

            <div className="bg-gray-50 p-3 border-gray-300 border rounded-lg pb-2 relative">
                <TabSwitcher
                    selectedTab={selectedTab}
                    onTabChange={setSelectedTab}
                    tabs={[
                        { id: 'simple-view', label: 'Simple View', tooltip: 'Card-based view for managing variables' },
                        { id: 'grid-view', label: 'Grid View', tooltip: 'Table-based view for bulk editing' }
                    ]}
                />

                <TabPanel isActive={selectedTab === 'simple-view'}>
                    <div className="max-h-[45vh] overflow-y-auto">
                        <Collection
                            onHeightChange={() => {}}
                            itemHook={useVariables}
                            grid={true}
                        >
                            <CollectionTitle>Study Variables ({studyVariables?.length || 0})</CollectionTitle>
                            <CollectionSubtitle>View, add and edit study variable definitions</CollectionSubtitle>
                            <CollectionAddButtonText>Add Variable</CollectionAddButtonText>
                            <CollectionEmptyStateTitle>No Variables Defined</CollectionEmptyStateTitle>
                            <CollectionEmptyStateSubtitle>Get started by adding your first variable</CollectionEmptyStateSubtitle>
                            <CollectionEmptyStateAddButtonText>Add Variable Now</CollectionEmptyStateAddButtonText>
                        </Collection>
                    </div>
                </TabPanel>

                <TabPanel isActive={selectedTab === 'grid-view'}>
                    <DataGrid
                        {...variableGridConfig}
                        showControls={true}
                        showDebug={false}
                        onRowDataChange={handleRowDataChange}
                        plugins={plugins}
                        height={"45vh"}
                        isActive={currentPage === pageIndex && selectedTab === 'grid-view'}
                    />
                </TabPanel>
            </div>
        </div>
    );
});

StudyVariableDefinitionSlide.displayName = 'Study Variable Definitions';

export default StudyVariableDefinitionSlide;
