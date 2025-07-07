import React, { forwardRef, useEffect, useMemo, useState, useRef } from 'react';

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

import studyVariableSlideContent from '../../data/StudyVariableSlideContent.json'; // Assuming you have a JSON file for the content
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import { Edit, Edit2, Trash2 } from 'lucide-react';
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';
import { GridTable, BoldCell } from '../GridTable/GridTable';
import { RevoGrid, Template } from '@revolist/react-datagrid';
import { flattenGridDataToMappings, getStructuredVariables } from '../../utils/utils';
import isEqual from 'lodash.isequal';
import { validate as isUUID } from 'uuid';
import EditVariableModal from '../EditModal';
import FormField from '../Form/FormField';

const GrayCell = () => {
    return {
        style: {
            "background-color": '#e7e8e9',
        }
    }
}

export const StudyVariableSlide = forwardRef(({ onHeightChange, currentPage }, ref) => {

    const [selectedTab, setSelectedTab] = useState('simple-view'); // State to manage selected tab

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    const { studyVariables, setStudyVariables, studies, studyToStudyVariableMapping, setStudyToStudyVariableMapping } = useGlobalDataContext();

    const [selectedVariableIndex, setSelectedVariableIndex] = useState(0); // State to track selected variable index

    // State for managing the edit modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentEditIndex, setCurrentEditIndex] = useState(null);
    // tempEditData is not being used in your provided code
    // const [tempEditData, setTempEditData] = useState({ variable: '', type: '', unit: '', description: '' });

    const { setScreenWidth } = useGlobalDataContext();

    // Define available variable types for the dropdown
    const variableTypes = [
        'Qualitative fault specification',
        'Quantitative fault specification',
        'Operating condition'
    ];

    useEffect(() => {
        if (selectedTab === 'grid-view' && currentPage === 6) {
            setScreenWidth("max-w-[100rem]");
        } else if (currentPage === 6) {
            setScreenWidth("max-w-5xl");
        }
    }, [selectedTab, currentPage, setScreenWidth]);

    // Derived selectedVariable for convenience
    const selectedVariable = useMemo(() => studyVariables[selectedVariableIndex], [studyVariables, selectedVariableIndex]);


    // Data derived from global state for the grid
    const gridDataFromGlobal = useMemo(() => {
        console.log("Processing study variables for grid data... with studies:", studies, "and mapping:", studyToStudyVariableMapping);
        const vars = getStructuredVariables(studyVariables, studies, studyToStudyVariableMapping);
        return vars;
    }, [studyVariables, studies, studyToStudyVariableMapping]);

    // Local state for the grid, initialized from global data
    const [processedData, setProcessedData] = useState([]);
    const [columns, setColumns] = useState([]);

    // Ref to track if the processedData update originated from user interaction or global state sync
    const isUpdatingFromGlobal = useRef(false);

    // --- Global Data to Local Grid Data Sync ---
    // This useEffect synchronizes `processedData` with `gridDataFromGlobal`
    // It runs when `gridDataFromGlobal` changes (i.e., when global state updates).
    // It uses a ref to prevent triggering the `processedData` to global sync.
    useEffect(() => {
        if (!isEqual(processedData, gridDataFromGlobal)) {
            console.log("Global data changed, updating processedData...");
            isUpdatingFromGlobal.current = true; // Set flag to indicate update from global
            setProcessedData(gridDataFromGlobal);
        }
    }, [gridDataFromGlobal]); // Depend on the memoized global data for updates


    // --- Local Grid Data to Global Data Sync ---
    // This useEffect synchronizes global state when `processedData` changes.
    // It checks the ref to ensure it only runs if the change *wasn't* initiated by `gridDataFromGlobal` (global sync).
    useEffect(() => {
        // If the update originated from `gridDataFromGlobal`, just reset the flag and don't re-sync to global.
        if (isUpdatingFromGlobal.current) {
            isUpdatingFromGlobal.current = false;
            console.log("ProcessedData updated from global, skipping global sync.");
            return;
        }

        // Only sync to global if processedData actually changed and it wasn't a global-initiated update
        // Using a timeout to debounce and prevent rapid updates during multi-cell edits (e.g., paste)
        const timeoutId = setTimeout(() => {
            console.log("ProcessedData changed locally, updating global state...");
            const flattened = flattenGridDataToMappings(processedData, studies);
            setStudyToStudyVariableMapping(flattened);

            // Filter out UUID keys from processedData to update studyVariables
            const updatedStudyVariables = processedData.map((variable) =>
                Object.fromEntries(
                    Object.entries(variable).filter(([key]) => !isUUID(key))
                )
            );
            // Only update if truly different to avoid unnecessary renders and potential loops
            if (!isEqual(studyVariables, updatedStudyVariables)) {
                setStudyVariables(updatedStudyVariables);
            }
        }, 100); // Debounce time in ms

        return () => clearTimeout(timeoutId);
    }, [processedData, studies, setStudyToStudyVariableMapping, setStudyVariables, studyVariables]); // Depend on processedData and relevant setters/state


    // Open the edit modal
    const openEditModal = (index) => {
        setCurrentEditIndex(index);
        setIsEditModalOpen(true);
    };

    // Close the edit modal
    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setCurrentEditIndex(null);
    };

    // Handler for when the EditVariableModal saves changes
    const handleVariableDetailsSave = (updatedData) => {
        if (currentEditIndex !== null) {
            setProcessedData(prevData => {
                const newData = [...prevData];
                // Update the specific variable with the new details
                newData[currentEditIndex] = {
                    ...newData[currentEditIndex], // Keep existing values, etc.
                    variable: updatedData.variable,
                    type: updatedData.type,
                    unit: updatedData.unit,
                    description: updatedData.description,
                };
                return newData;
            });
        }
    };

    // Remove a variable from processedData (which will then sync to global)
    const removeParameter = (indexToRemove) => {
        setProcessedData(prevData => {
            const newData = prevData.filter((_, index) => index !== indexToRemove);
            // Adjust selected index if the removed item was before it
            if (selectedVariableIndex >= newData.length && newData.length > 0) {
                setSelectedVariableIndex(newData.length - 1);
            } else if (newData.length === 0) {
                setSelectedVariableIndex(0); // No variables left
            }
            return newData;
        });
    };

    // Standalone Effect to initialize columns for grid view
    useEffect(() => {
        setColumns([
            { prop: 'variable', name: 'Variable', pin: 'colPinStart', size: 100, cellTemplate: Template(BoldCell), cellProperties: GrayCell, },
            { prop: 'type', name: 'Variable Type', size: 150 },
            { prop: 'unit', name: 'Unit' },
            {
                prop: 'description', name: 'Description', size: 350, cellProperties: () => {
                    return {
                        style: {
                            "border-right": "3px solid black"
                        }
                    }
                }
            },
            ...studies.map((study, index) => ({
                prop: study.id,
                name: `S${(index + 1).toString().padStart(2, '0')}`,
                size: 150
            }))
        ])
    }, [studies]); // Depend on studies, so columns update if studies change

    const handleInputChange = (variableIndex, mapping, value) => {
        setProcessedData(prevData => {
            const newData = [...prevData];
            const entry = newData.find(variable => variable.id === mapping.studyVariableId)
            if (entry) { // Ensure entry exists
                entry[mapping.studyId] = value; // Update the specific study's value
            }
            return newData;
        });
    };

    const addNewVariable = () => {
        const newVariable = {
            variable: 'New Variable',
            type: 'Qualitative fault specification',
            unit: '',
            description: '',
            id: crypto.randomUUID(), // Generate a unique ID
        };

        setProcessedData(prevData => {
            const updatedData = [...prevData, newVariable];
            setSelectedVariableIndex(updatedData.length - 1); // Select the new variable
            return updatedData;
        });

        setSelectedTab('details'); // Switch to details tab on new variable creation
        // The modal will open when selectedVariableIndex is set and processedData updates.
        // It's better to open the modal based on the newly selected index
        setIsEditModalOpen(true);
        setCurrentEditIndex(processedData.length); // This will be the index of the new variable
    };


    return (
        <div ref={combinedRef} >

            <SlidePageTitle>
                {studyVariableSlideContent.pageTitle}
            </SlidePageTitle>

            <SlidePageSubtitle>
                {studyVariableSlideContent.pageSubtitle}
            </SlidePageSubtitle>

            <div className='bg-gray-50 p-3 border-gray-300 border rounded-lg pb-2 relative'>

                {/* Tab Navigation */}
                <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-300 mb-4 shadow-sm">
                    <button
                        onClick={() => setSelectedTab('simple-view')}
                        className={`cursor-pointer flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${selectedTab === 'simple-view' || selectedTab === 'details'
                            ? 'bg-white text-blue-700 shadow-md'
                            : 'text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Simple View
                    </button>
                    <button
                        onClick={() => setSelectedTab('grid-view')}
                        className={`cursor-pointer flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${selectedTab === 'grid-view'
                            ? 'bg-white text-blue-700 shadow-md'
                            : 'text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Grid View
                    </button>
                </div>

                <div
                    className={`flex rounded transition-opacity overflow-hidden duration-500 ease-in-out ${selectedTab === 'simple-view' || selectedTab === 'details' ? "opacity-100 max-h-[50vh]" : "opacity-0 max-h-0"
                        }`}
                >
                    {/* Sidebar for Variable Navigation */}
                    <div className="w-full overflow-auto md:w-1/4  bg-white border border-gray-200 rounded-xl p-4 flex flex-col flex-shrink-0 mb-6 md:mb-0 md:mr-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">Variables</h3>
                        <div className="overflow-y-auto flex-grow">
                            {/* Use selectedVariable?.id as key if available, otherwise fallback to index */}
                            {studyVariables.map((item, index) => (
                                <button
                                    key={item.id || index}
                                    onClick={() => {
                                        setSelectedVariableIndex(index);
                                        setSelectedTab('details'); // Switch to details tab on variable select
                                    }}
                                    className={`w-full cursor-pointer text-left p-3 rounded-lg mb-2 transition-colors duration-200 ${index === selectedVariableIndex
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                                        }`}
                                >
                                    {item.variable}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={addNewVariable}
                            className="mt-4 px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 transition duration-200 ease-in-out flex items-center justify-center text-sm"
                        >
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"></path>
                            </svg>
                            Add New
                        </button>
                    </div>

                    {/* Conditional rendering of tab content */}
                    {selectedVariable ? (
                        <div className="w-full bg-white border border-gray-200 rounded-xl p-6 flex flex-col min-h-full">
                            {/* Variable Header, Edit/Remove Buttons */}
                            <div className="flex justify-between items-start mb-4 border-b pb-4">
                                <h2 className="text-3xl font-bold text-gray-800 flex-grow pr-4">
                                    {selectedVariable.variable}
                                </h2>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => openEditModal(selectedVariableIndex)}
                                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out flex items-center justify-center text-sm transform hover:scale-105"
                                        title="Edit Variable Details"
                                    >
                                        <Edit2 className="w-4 h-4 mr-2" />
                                        Edit Details
                                    </button>
                                    <button
                                        onClick={() => removeParameter(selectedVariableIndex)}
                                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition duration-200 ease-in-out flex items-center justify-center text-sm transform hover:scale-105"
                                        title="Remove Parameter"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Remove
                                    </button>
                                </div>
                            </div>
                            <p className="text-md text-gray-700 mb-4">{selectedVariable.description}</p>
                            <div className="flex justify-between items-center text-sm font-medium text-gray-600 bg-gray-50 px-4 py-2 rounded-md mb-6 border border-gray-200">
                                <span>Type: <span className="font-semibold text-gray-800">{selectedVariable.type}</span></span>
                                {selectedVariable.unit && <span>Unit: <span className="font-semibold text-gray-800">{selectedVariable.unit}</span></span>}
                            </div>

                            {/* Studies Grid - this is where the dynamic inputs are */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {studies.map((study, index) => {
                                    // Find the corresponding mapping in processedData for the selected variable and current study
                                    const processedDataEntry = processedData.find(
                                        (variable) => variable.id === selectedVariable.id
                                    );
                                    // Get the value for the current study from the processedData entry
                                    const value = processedDataEntry ? processedDataEntry[study.id] : '';

                                    return (
                                        <div
                                            key={index}
                                            className="bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-sm"
                                        >
                                            <FormField
                                                label={`Sensor S${(index + 1).toString().padStart(2, '0')}`}
                                                name={`Sensor S${(index + 1).toString().padStart(2, '0')}`}
                                                value={value || ''} // Ensure value is not undefined
                                                onChange={(e) => handleInputChange(selectedVariableIndex, { studyVariableId: selectedVariable.id, studyId: study.id }, e.target.value)}
                                                placeholder={"Enter value"}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center flex-grow text-gray-500 text-lg h-full">
                            <svg className="w-16 h-16 mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd"></path>
                            </svg>
                            <p>No parameter selected or available.</p>
                            <p>Click 'Add New' to get started!</p>
                        </div>
                    )}
                    {/* Edit Variable Details Modal */}
                    {isEditModalOpen && currentEditIndex !== null && (
                        <EditVariableModal
                            isOpen={isEditModalOpen}
                            onClose={closeEditModal}
                            onSave={handleVariableDetailsSave}
                            initialVariableData={processedData[currentEditIndex]}
                            variableTypes={variableTypes}
                        />
                    )}
                </div>
                <div
                    className={`revo-grid-container transition-opacity overflow-hidden duration-500 ease-in-out ${selectedTab === 'grid-view' ? "opacity-100" : "opacity-0 max-h-0"
                        }`}
                >
                    <GridTable items={processedData} setItems={setProcessedData} columns={columns} ></GridTable>
                </div>
            </div>
        </div>
    );
});

export default StudyVariableSlide;