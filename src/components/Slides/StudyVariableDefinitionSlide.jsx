import React, { forwardRef, useCallback, useMemo } from 'react';

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';

import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';
import DataGrid from '../DataGrid/DataGrid';
import { Template } from '@revolist/react-datagrid';
import { BoldCell, DeleteRowCellTemplate } from '../DataGrid/CellTemplates';
import SelectTypePlugin from '@revolist/revogrid-column-select';
import { VARIABLE_TYPE_OPTIONS } from '../../constants/variableTypes';
import { WINDOW_HEIGHT } from '../../constants/slideWindowHeight';

const plugins = { select: new SelectTypePlugin() };

const StudyVariableDefinitionSlide = forwardRef(({ onHeightChange, currentPage, pageIndex }, ref) => {
    const resizeRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, resizeRef);

    const { studyVariables, setStudyVariables } = useGlobalDataContext();

    const addNewVariable = useCallback(() => {
        setStudyVariables(prev => {
            const nextIndex = prev.length + 1;
            return [
                ...prev,
                {
                    id: crypto.randomUUID(),
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
                size: 170,
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
                size: 400,
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

            <div className="bg-gray-50 p-3 border border-gray-200 rounded-lg">
                <DataGrid
                    {...variableGridConfig}
                    showControls={true}
                    showDebug={false}
                    onRowDataChange={handleRowDataChange}
                    plugins={plugins}
                    height={WINDOW_HEIGHT}
                    isActive={currentPage === pageIndex}
                />
            </div>
        </div>
    );
});

StudyVariableDefinitionSlide.displayName = 'Study Variable Definitions';

export default StudyVariableDefinitionSlide;
