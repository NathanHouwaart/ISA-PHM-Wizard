import React, { forwardRef, useCallback, useMemo } from 'react';

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
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
import { isFaultSpecification } from '../../constants/variableTypes';
import TabSwitcher, { TabPanel } from '../TabSwitcher';
import usePageTab from '../../hooks/usePageWidth';

const OperatingConditionsSlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {
    const resizeRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, resizeRef);

    const { items: operatingConditions, setItems: setStudyVariables, addItem } = useOperatingConditions();
    const [selectedTab, setSelectedTab] = usePageTab(pageIndex, 'simple-view');

    const handleRowDataChange = useCallback((newRows) => {
        setStudyVariables(prevAll => {
            // Keep items that are NOT in this view (Fault Specifications)
            const otherItems = prevAll.filter(item => isFaultSpecification(item));
            // Combine with the new state of items in this view
            return [...otherItems, ...newRows];
        });
    }, [setStudyVariables]);

    const variableGridConfig = useMemo(() => ({
        title: 'Operating Conditions',
        rowData: operatingConditions,
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
            // Type column removed or displayed as readonly text
            // Requirement: "OF Operating conditions TYPE should NOT be a dropdown anymore and should be fixed to operating condition."
            // We can just omit it to save space, or keep it strictly readonly.
            // Let's keep it but make it readonly and maybe shorter since it's always the same.
            /*
            {
                prop: 'type',
                name: 'Type',
                size: 160,
                readonly: true
            },
            */
            // Actually, hiding it completely is cleaner as per user requirement "fixed to operating condition" (which implies user doesn't interact with it).
            // But if I want to show it, I'll add it back. The prompt says "should NOT be a dropdown... fixed to operating condition".
            // Showing it confirms to the user what they are looking at.
             {
                prop: 'type',
                name: 'Type',
                size: 200,
                readonly: true
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

                <TabPanel isActive={selectedTab === 'simple-view'}>
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

                <TabPanel isActive={selectedTab === 'grid-view'}>
                    <DataGrid
                        {...variableGridConfig}
                        showControls={true}
                        showDebug={false}
                        onRowDataChange={handleRowDataChange}
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
