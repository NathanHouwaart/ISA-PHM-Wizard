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


export const StudyVariableSlide = forwardRef(({ onHeightChange }, ref) => {

    const [selectedTab, setSelectedTab] = useState('simple-view'); // State to manage selected tab

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);


    const { studyVariables, setStudyVariables, studies, studyToStudyVariableMapping, setStudyToStudyVariableMapping } = useGlobalDataContext();

    const [selectedVariableIndex, setSelectedVariableIndex] = useState(0); // State to track selected variable index

    const selectedVariable = studyVariables[selectedVariableIndex];

    // Function to render the appropriate input field for a specific study
    const renderInputField = (item, variableIndex, studyKey) => {
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
                    value={item.values[studyKey]}
                    onChange={(e) => handleInputChange(variableIndex, studyKey, e.target.value)}
                    className={`w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out pl-3 pr-3 text-sm`}
                    min={isNumeric && item.min !== undefined ? item.min : undefined}
                    max={isNumeric && item.max !== undefined ? item.max : undefined}
                    step={isNumeric && item.step !== undefined ? item.step : undefined}
                    placeholder={isNumeric ? 'Enter number' : 'Enter text'}
                    id={`${item.variable.replace(/\s/g, '-')}-${studyKey}-${variableIndex}`}
                />
            </div>
        );
    };


    const [processedData, setProcessedData] = useState([]);
    const [columns, setColumns] = useState([]);


    // Standalone Effect to initialize columns for grid view
    useEffect(() => {
        console.log('Initializing columns for grid view...');

        setColumns([
            { prop: 'variable', name: 'Variable', size: 90, cellTemplate: Template(BoldCell) },
            { prop: 'type', name: 'Variable Type' },
            { prop: 'unit', name: 'Unit' },
            { prop: 'description', name: 'Description', size: 350 },
            ...studies.map((_, index) => ({
                prop: `s${(index + 1).toString().padStart(2, '0')}`,
                name: `S${(index + 1).toString().padStart(2, '0')}`,
                size: 150
            }))
        ])
    }, [studies]);


    
    useEffect(() => {
        console.log('Processing study variables for grid view...');
        const newProcessedData = studyVariables.map(row => {
            const flattenedValues = {};
            row.values.forEach((val, index) => {
                flattenedValues[`s${(index + 1).toString().padStart(2, '0')}`] = val;
            });
            return {
                ...row,
                ...flattenedValues
            };
        });
        setProcessedData(newProcessedData);
    }, [studyVariables]);


    useEffect(() => {

        const unflattened = processedData.map(row => {
            const values = Object.entries(row)
                .filter(([key]) => /^s\d+$/.test(key))
                .sort(([a], [b]) => parseInt(a.slice(1)) - parseInt(b.slice(1)))
                .map(([, val]) => val);

            return {
                variable: row.variable ?? '',
                type: row.type ?? '',
                unit: row.unit ?? '',
                description: row.description ?? '',
                values
            };
        });

        if (JSON.stringify(studyVariables) === JSON.stringify(unflattened)) return; // Prevent unnecessary state update

        setStudyVariables(unflattened);

    }, [processedData]);



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
                        className={`cursor-pointer flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${selectedTab === 'simple-view'
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
                            onClick={() => { }}
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

                            {/* New: Fill All Studies Section
                                    <div className="mb-6 p-4 bg-gray-100 rounded-lg border border-gray-200 flex items-center shadow-inner">
                                        <label htmlFor="fill-all-studies" className="text-sm font-medium text-gray-700 mr-3 whitespace-nowrap">Fill all studies with:</label>
                                        <input
                                            type="text"
                                            id="fill-all-studies"
                                            value={fillValue}
                                            onChange={(e) => setFillValue(e.target.value)}
                                            className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 mr-3 text-sm"
                                            placeholder="Enter value"
                                        />
                                        <button
                                            onClick={handleFillAllStudies}
                                            className="px-5 py-2 bg-purple-600 text-white font-semibold rounded-md shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-200 ease-in-out text-sm transform hover:scale-105"
                                        >
                                            Apply
                                        </button>
                                    </div> */}

                            {/* Studies Grid - this is where the dynamic inputs are */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {Object.keys(selectedVariable.values).map((studyKey) => (
                                    <div key={studyKey} className="bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-sm">
                                        <label htmlFor={`${selectedVariable.variable.replace(/\s/g, '-')}-${studyKey}-${selectedVariableIndex}`} className="block text-xs font-semibold text-blue-800 mb-1">
                                            Study {studyKey.replace('s', '')}
                                        </label>
                                        {renderInputField(selectedVariable, selectedVariableIndex, studyKey)}
                                    </div>
                                ))}
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
                </div>
                <div
                    className={`transition-opacity overflow-hidden duration-500 ease-in-out ${selectedTab === 'grid-view' ? "opacity-100" : "opacity-0 max-h-0"
                        }`}
                >
                    <GridTable items={processedData} setItems={setProcessedData} columns={columns} ></GridTable>
                </div>
            </div>
        </div>
    );
});

export default StudyVariableSlide