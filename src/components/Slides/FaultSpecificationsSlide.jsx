import React, { forwardRef, useCallback, useMemo } from 'react';

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import { useFaultSpecifications } from '../../hooks/useVariables';
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
import { FAULT_SPEC_TYPES, isOperatingCondition } from '../../constants/variableTypes';
import TabSwitcher, { TabPanel } from '../TabSwitcher';
import { usePageTab } from '../../hooks/usePageWidth';

const plugins = { select: new SelectTypePlugin() };

const FaultSpecificationsSlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {
    const resizeRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, resizeRef);

    const { items: faultSpecs, setItems: setStudyVariables, addItem } = useFaultSpecifications();
    const [selectedTab, setSelectedTab] = usePageTab(pageIndex, 'simple-view');

    const handleRowDataChange = useCallback((newRows) => {
        setStudyVariables(prevAll => {
            // Keep items that are NOT in this view (Operating conditions)
            const otherItems = prevAll.filter(item => isOperatingCondition(item));
            // Combine with the new state of items in this view
            return [...otherItems, ...newRows];
        });
    }, [setStudyVariables]);

    const typeOptions = useMemo(
        () => FAULT_SPEC_TYPES.map((type) => ({ label: type, value: type })),
        []
    );

    const variableGridConfig = useMemo(() => ({
        title: 'Fault Specifications',
        rowData: faultSpecs,
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
                label: '+ Add Fault Spec',
                onClick: () => addItem(), // Helper already sets default type
                className: 'px-3 py-1 text-sm bg-green-50 text-green-700 border border-green-300 rounded hover:bg-green-100',
                title: 'Add a new fault specification'
            }
        ]
    }), [faultSpecs, addItem, typeOptions]);

    return (
        <div ref={combinedRef}>
            <SlidePageTitle>
                Fault Specifications
            </SlidePageTitle>

            <SlidePageSubtitle>
                Define the fault specifications for your experiments. These variables describe the faults or conditions being tested, excluding operating conditions.
            </SlidePageSubtitle>

            <div className="bg-gray-50 p-3 border-gray-300 border rounded-lg pb-2 relative">
                <TabSwitcher
                    selectedTab={selectedTab}
                    onTabChange={setSelectedTab}
                    tabs={[
                        { id: 'simple-view', label: 'Simple View', tooltip: 'Card-based view for managing fault specs' },
                        { id: 'grid-view', label: 'Grid View', tooltip: 'Table-based view for bulk editing' }
                    ]}
                />

                <TabPanel isActive={selectedTab === 'simple-view'} unmountOnHide>
                    <div className="max-h-[45vh] overflow-y-auto">
                        <Collection
                            onHeightChange={() => {}}
                            itemHook={useFaultSpecifications}
                            grid={true}
                        >
                            <CollectionTitle>Fault Specifications ({faultSpecs?.length || 0})</CollectionTitle>
                            <CollectionSubtitle>View, add and edit fault specifications</CollectionSubtitle>
                            <CollectionAddButtonText>Add Fault Spec</CollectionAddButtonText>
                            <CollectionEmptyStateTitle>No Fault Specs Defined</CollectionEmptyStateTitle>
                            <CollectionEmptyStateSubtitle>Get started by adding your first fault specification</CollectionEmptyStateSubtitle>
                            <CollectionEmptyStateAddButtonText>Add Fault Spec Now</CollectionEmptyStateAddButtonText>
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

FaultSpecificationsSlide.displayName = 'Fault Specifications';

export default FaultSpecificationsSlide;
