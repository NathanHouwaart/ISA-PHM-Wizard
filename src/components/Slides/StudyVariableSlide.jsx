import React, { forwardRef, useEffect, useMemo, useState } from 'react'

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
    const [tempEditData, setTempEditData] = useState({ variable: '', type: '', unit: '', description: '' });

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

    const selectedVariable = studyVariables[selectedVariableIndex];

    // Function to render the appropriate input field for a specific study
    const renderInputField = (item, variableIndex, mapping) => {
        const isNumeric = item.type.includes('Quantitative') || item.type.includes('Operating');
        const inputType = isNumeric ? 'number' : 'text';

        return (
            <div className="relative flex items-center w-full">
                {item.unit && (
                    <span className="absolute right-2 text-gray-500 text-sm pointer-events-none">
                        {item.unit}
                    </span>
                )}
                <input
                    type={inputType}
                    value={mapping.value}
                    onChange={(e) => handleInputChange(variableIndex, mapping, e.target.value)}
                    className={`w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out pl-3 pr-3 text-sm`}
                    min={isNumeric && item.min !== undefined ? item.min : undefined}
                    max={isNumeric && item.max !== undefined ? item.max : undefined}
                    step={isNumeric && item.step !== undefined ? item.step : undefined}
                    placeholder={isNumeric ? 'Enter number' : 'Enter text'}
                />
            </div>
        );
    };


    const [processedData, setProcessedData] = useState([]);
    const [columns, setColumns] = useState([]);

    // --------- Global → Grid Sync ---------
    const gridData = useMemo(() => {
        console.log("Processing study variables for grid data... with studies:", studies, "and mapping:", studyToStudyVariableMapping);
        const vars = getStructuredVariables(studyVariables, studies, studyToStudyVariableMapping);
        return vars;
    }, [studyVariables, studies, studyToStudyVariableMapping]);

    // Apply flattened data to local state only when global data changes
    useEffect(() => {
        if (!isEqual(processedData, gridData)) {
            setProcessedData(gridData);
        }
    }, []);

    // --------- Grid → Global Sync ---------
    useEffect(() => {
        const timeout = setTimeout(() => {
            const flattened = flattenGridDataToMappings(processedData, studies) 
            setStudyToStudyVariableMapping(flattened);

            // Filter out UUID keys from processedData
            setStudyVariables(
                processedData.map((variable) =>
                    Object.fromEntries(
                        Object.entries(variable).filter(([key]) => !isUUID(key))
                    )
                )
            );
        }, 0);

        return () => clearTimeout(timeout);
    }, [processedData, studies]);

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
            const newData = [...processedData];
            // Update the specific variable with the new details
            newData[currentEditIndex] = {
                ...newData[currentEditIndex], // Keep existing values, etc.
                variable: updatedData.variable,
                type: updatedData.type,
                unit: updatedData.unit,
                description: updatedData.description,
            };
            setProcessedData(newData);
        }
    };

    const className = 'bg-gray-500'
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
    }, [studies]);

    const handleInputChange = (variableIndex, mapping, value) => {
        setProcessedData(prevData => {
            const newData = [...prevData];

            const entry = newData.find(variable => variable.id === mapping.studyVariableId)
            entry[mapping.studyId] = value; // Update the specific study's value

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
        setProcessedData(prevData => [...prevData, newVariable]);

        setSelectedVariableIndex(processedData.length); // Select the new variable
        setSelectedTab('details'); // Switch to details tab on new variable creation
        openEditModal(processedData.length); // Open edit modal for new variable
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
                            {studyVariables.map((item, index) => (
                                <button
                                    key={item.variable + index} // Use index in key as variable name can change
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
                                    const existingMapping = studyToStudyVariableMapping.find(
                                        (m) => m.studyVariableId === selectedVariable.id && m.studyId === study.id
                                    );

                                    // Fallback if no mapping exists yet
                                    const mapping = existingMapping || {
                                        studyVariableId: selectedVariable.id,
                                        studyId: study.id,
                                        value: ''
                                    };

                                    return (
                                        <div
                                            key={index}
                                            className="bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-sm"
                                        >
                                            <FormField 
                                                label={`Sensor S${(index + 1).toString().padStart(2, '0')}`}
                                                name={`Sensor S${(index + 1).toString().padStart(2, '0')}`}
                                                value={mapping.value}
                                                onChange={(e) => handleInputChange(selectedVariableIndex, mapping, e.target.value)}
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

export default StudyVariableSlide