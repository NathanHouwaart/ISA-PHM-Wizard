import React, { forwardRef, useCallback, useMemo } from 'react';

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import { useOperatingConditions } from '../../hooks/useVariables';
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
import {
    STUDY_VARIABLE_VALUE_MODE_OPTIONS,
    STUDY_VARIABLE_VALUE_MODE_SCALAR,
    normalizeStudyVariableValueMode,
    isFaultSpecification
} from '../../constants/variableTypes';
import TabSwitcher, { TabPanel } from '../TabSwitcher';
import { usePageTab } from '../../hooks/usePageWidth';
import { OPERATING_CONDITION_SUGGESTIONS } from '../../constants/suggestionCatalog';
import SuggestionStrip from '../Suggestions/SuggestionStrip';

const plugins = { select: new SelectTypePlugin() };

const OperatingConditionsSlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {
    const resizeRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, resizeRef);

    const { items: operatingConditions, setItems: setStudyVariables, addItem } = useOperatingConditions();
    const [selectedTab, setSelectedTab] = usePageTab(pageIndex, 'simple-view');

    const handleAddSuggestedOperatingCondition = useCallback((suggestion) => {
        if (!suggestion) return;
        addItem({
            name: suggestion.name || 'New Variable',
            valueMode: suggestion.valueMode || STUDY_VARIABLE_VALUE_MODE_SCALAR,
            unit: suggestion.unit || '',
            description: suggestion.description || ''
        });
    }, [addItem]);

    const handleRowDataChange = useCallback((newRows) => {
        const normalizedRows = (newRows || []).map((row) => ({
            ...row,
            valueMode: normalizeStudyVariableValueMode(row?.valueMode, STUDY_VARIABLE_VALUE_MODE_SCALAR)
        }));
        setStudyVariables(prevAll => {
            // Keep items that are NOT in this view (Fault Specifications)
            const otherItems = prevAll.filter(item => isFaultSpecification(item));
            // Combine with the new state of items in this view
            return [...otherItems, ...normalizedRows];
        });
    }, [setStudyVariables]);

    const variableGridConfig = useMemo(() => ({
        title: 'Operating Conditions',
        rowData: operatingConditions.map((variable) => ({
            ...variable,
            valueMode: normalizeStudyVariableValueMode(variable?.valueMode, STUDY_VARIABLE_VALUE_MODE_SCALAR)
        })),
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
                size: 200,
                readonly: true
            },
            {
                prop: 'valueMode',
                name: 'Value Mode',
                size: 140,
                readonly: false,
                columnType: 'select',
                labelKey: 'label',
                valueKey: 'value',
                source: STUDY_VARIABLE_VALUE_MODE_OPTIONS
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
                label: '+ Add Operating Condition',
                onClick: () => addItem(), 
                className: 'px-3 py-1 text-sm bg-green-50 text-green-700 border border-green-300 rounded hover:bg-green-100',
                title: 'Add a new operating condition'
            }
        ]
    }), [operatingConditions, addItem]);

    return (
        <div ref={combinedRef}>
            <SlidePageTitle>
                Operating Conditions
            </SlidePageTitle>

            <SlidePageSubtitle>
                Define the operating conditions for your experiments (e.g., speed, load, temperature). These are distinct from fault specifications.
            </SlidePageSubtitle>

            <div className="bg-gray-50 p-3 border-gray-300 border rounded-lg pb-2 relative">
                <TabSwitcher
                    selectedTab={selectedTab}
                    onTabChange={setSelectedTab}
                    tabs={[
                        { id: 'simple-view', label: 'Simple View', tooltip: 'Card-based view for managing operating conditions' },
                        { id: 'grid-view', label: 'Grid View', tooltip: 'Table-based view for bulk editing' }
                    ]}
                />

                <SuggestionStrip
                    className="mb-3"
                    title="Suggested operating conditions"
                    subtitle="Click to add one suggestion as a new variable. You can still add custom ones."
                    suggestions={OPERATING_CONDITION_SUGGESTIONS}
                    onSelect={handleAddSuggestedOperatingCondition}
                />

                <TabPanel isActive={selectedTab === 'simple-view'} unmountOnHide>
                    <div className="max-h-[45vh] overflow-y-auto">
                        <Collection
                            onHeightChange={() => {}}
                            itemHook={useOperatingConditions}
                            grid={true}
                        >
                            <CollectionTitle>Operating Conditions ({operatingConditions?.length || 0})</CollectionTitle>
                            <CollectionSubtitle>View, add and edit operating conditions</CollectionSubtitle>
                            <CollectionAddButtonText>Add Op Condition</CollectionAddButtonText>
                            <CollectionEmptyStateTitle>No Operating Conditions Defined</CollectionEmptyStateTitle>
                            <CollectionEmptyStateSubtitle>Get started by adding your first operating condition</CollectionEmptyStateSubtitle>
                            <CollectionEmptyStateAddButtonText>Add Op Condition Now</CollectionEmptyStateAddButtonText>
                        </Collection>
                    </div>
                </TabPanel>

                <TabPanel isActive={selectedTab === 'grid-view'} unmountOnHide>
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

OperatingConditionsSlide.displayName = 'Operating Conditions';

export default OperatingConditionsSlide;
