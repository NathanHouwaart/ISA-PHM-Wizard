import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react'

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

// Data Grid Imports
import { Template } from '@revolist/react-datagrid';
import { GridTable } from '../GridTable/GridTable';
import { GrayCell, BoldCell } from '../GridTable/CellTemplates';

// Import utility functions
import { flattenGridDataToMappings, getStructuredVariables } from '../../utils/utils';
import isEqual from 'lodash.isequal';

// Import content data
import studyVariableSlideContent from '../../data/StudyVariableSlideContent.json'; // Assuming you have a JSON file for the content


export const StudyVariableSlide = forwardRef(({ onHeightChange, currentPage }, ref) => {
    const [selectedTab, setSelectedTab] = useState('simple-view');
    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    const {
        studies,
        studyVariables, // This should be in flattened format
        setScreenWidth,
        setStudyVariables,
        studyToStudyVariableMapping,
        setStudyToStudyVariableMapping
    } = useGlobalDataContext();

    useEffect(() => {
        if (selectedTab === 'grid-view' && currentPage === 6) {
            setScreenWidth("max-w-[100rem]");
        } else if (currentPage === 6) {
            setScreenWidth("max-w-5xl");
        }
    }, [selectedTab, currentPage, setScreenWidth]);

    const [columns, setColumns] = useState([]);

    // --------- Simple One-Way Sync: Global State IS the Grid Data ---------
    const gridData = useMemo(() => {
        return getStructuredVariables(studyVariables, studies, studyToStudyVariableMapping);
    }, [studyVariables, studies, studyToStudyVariableMapping]);

    // Direct grid updates go to global state
    const handleGridChange = (updater) => {
        const newData = typeof updater === 'function' ? updater(gridData) : updater;
        
        // Update the flattened mappings
        const flattened = flattenGridDataToMappings(newData, studies);
        setStudyToStudyVariableMapping(flattened);
        
        // Update the base variables (without study-specific data)
        const baseVariables = newData.map(row => ({
            id: row.id,
            name: row.name || '',
            type: row.type || '',
            unit: row.unit || '',
            description: row.description || ''
        }));
        setStudyVariables(baseVariables);
    };

    // Columns setup
    useEffect(() => {
        setColumns([
            { prop: 'name', name: 'Variable', pin: 'colPinStart', size: 100, cellTemplate: Template(BoldCell), cellProperties: GrayCell },
            { prop: 'type', name: 'Variable Type', size: 150 },
            { prop: 'unit', name: 'Unit' },
            {
                prop: 'description', name: 'Description', size: 350, cellProperties: () => ({
                    style: { "border-right": "3px solid black" }
                })
            },
            ...studies.map((study, index) => ({
                prop: study.id,
                name: `Study S${(index + 1).toString().padStart(2, '0')}`,
                size: 150
            }))
        ]);
    }, [studies]);

    const handleInputChange = (variableIndex, mapping, value) => {
        const newData = [...gridData];
        const entry = newData.find(variable => variable.id === mapping.studyVariableId);
        if (entry) {
            entry[mapping.studyId] = value;
        }
        handleGridChange(newData);
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
                        name={"Variables"}
                        itemHook={useVariables}
                        mappings={studyToStudyVariableMapping}
                        handleInputChange={handleInputChange}
                    />
                </TabPanel>

                <TabPanel isActive={selectedTab === 'grid-view'}>
                    <GridTable
                        items={gridData}
                        setItems={handleGridChange}
                        itemHook={useVariables}
                        columns={columns}
                    />
                </TabPanel>
            </div>
        </div>
    );
});

StudyVariableSlide.displayName = "Study Variables"; // Set display name for better debugging

export default StudyVariableSlide;