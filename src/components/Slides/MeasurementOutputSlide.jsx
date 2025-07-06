import React, { forwardRef, useEffect, useMemo, useState } from 'react'

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import { Edit, Edit2, Trash2 } from 'lucide-react';
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';
import { GridTable, BoldCell } from '../GridTable/GridTable';
import { RevoGrid, Template } from '@revolist/react-datagrid';
import { flattenGridDataToMappings, getStructuredVariables } from '../../utils/utils';
import isEqual from 'lodash.isequal';
import { validate as isUUID } from 'uuid';

const GrayCell = () => {
    return {
        style: {
            "background-color": '#e7e8e9',
        }
    }
}

export const MeasurementOutputSlide = forwardRef(({ onHeightChange, currentPage }, ref) => {

    const [selectedTab, setSelectedTab] = useState('simple-view'); // State to manage selected tab

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);


    const { selectedTestSetup, testSetups, studies, studyToSensorMeasurementMapping, setStudyToSensorMeasurementMapping } = useGlobalDataContext();


    const [selectedStudyIndex, setSelectedStudyIndex] = useState(0); // State to track selected variable index

    const { setScreenWidth } = useGlobalDataContext();

    useEffect(() => {
        if (selectedTab === 'grid-view' && currentPage === 7) {
            setScreenWidth("max-w-[100rem]");
            console.log("Setting screen width to max-w-7xl for grid view on MeasurementOutputSlide");
        } else if (currentPage === 7) {
            setScreenWidth("max-w-5xl");
            console.log("Setting screen width to max-w-5xl for simple view on MeasurementOutputSlide");
        }
    }, [selectedTab, currentPage, setScreenWidth]);

    const selectedStudy = studies[selectedStudyIndex];

    // Function to render the appropriate input field for a specific study
    const renderInputField = (item, variableIndex, mapping) => {


        return (
            <div className="relative flex items-center w-full">
                {item.unit && (
                    <span className="absolute right-2 text-gray-500 text-sm pointer-events-none">
                        {item.unit}
                    </span>
                )}
                <input
                    type="text"
                    value={mapping.value}
                    onChange={(e) => handleInputChange(variableIndex, mapping, e.target.value)}
                    className={`w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out pl-3 pr-3 text-sm`}
                    placeholder={'Enter text'}
                />
            </div>
        );
    };


    const [processedData, setProcessedData] = useState([]);
    const [columns, setColumns] = useState([]);

    // --------- Global → Grid Sync ---------
    const gridData = useMemo(() => {
        if (!selectedTestSetup || !studies || !studyToSensorMeasurementMapping) {
            console.warn("Missing data for grid processing:", { selectedTestSetup, studies, studyToSensorMeasurementMapping });
            return [];
        }
        const vars = getStructuredVariables(selectedTestSetup.sensors, studies, studyToSensorMeasurementMapping);
        console.log("Grid data processed:", vars);
        return vars;
    }, [studies, selectedTestSetup, studyToSensorMeasurementMapping]);

    // Apply flattened data to local state only when global data changes
    useEffect(() => {
        if (!isEqual(processedData, gridData)) {
            setProcessedData(gridData);
        }
        console.log("Processed data updated:", gridData);
    }, [selectedTestSetup, testSetups]);

    // --------- Grid → Global Sync ---------
    useEffect(() => {
        const timeout = setTimeout(() => {
            const flattenedMappings = flattenGridDataToMappings(processedData, studies, 'sensorId');
            console.log("Flattened mappings:", flattenedMappings);
            setStudyToSensorMeasurementMapping(flattenedMappings);

            // // Filter out UUID keys from processedData
            // setStudyVariables(
            //     processedData.map((variable) =>
            //         Object.fromEntries(
            //             Object.entries(variable).filter(([key]) => !isUUID(key))
            //         )
            //     )
            // );
        }, 0);

        return () => clearTimeout(timeout);
    }, [processedData, studies]);


    const className = 'bg-gray-500'
    // Standalone Effect to initialize columns for grid view
    useEffect(() => {
        setColumns([
            { prop: 'id', name: 'Id', pin: 'colPinStart', readonly: true, size: 100, cellTemplate: Template(BoldCell), cellProperties: GrayCell, },
            { prop: 'measurement_type', name: 'Variable Type', size: 150, readonly: true },
            { prop: 'measurement_unit', name: 'Unit', readonly: true },
            {
                prop: 'description', name: 'Description', size: 350, readonly: true, cellProperties: () => {
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
         
            const entry = newData.find(sensor => sensor.id === mapping.sensorId)
            entry[mapping.studyId] = value; // Update the specific study's value
         
            return newData;
        });
    };

    return (
        <div ref={combinedRef} >

            <SlidePageTitle>
                Measurement Output
            </SlidePageTitle>

            <SlidePageSubtitle>
                This slide allows you to view and edit the output of measurements across different studies. You can switch between a simple view and a grid view for better data management.
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
                        <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">Studies</h3>
                        <div className="overflow-y-auto flex-grow">
                            {studies.map((item, index) => (
                                <button
                                    key={index} // Use index in key as variable name can change
                                    onClick={() => {
                                        setSelectedStudyIndex(index);
                                        setSelectedTab('details'); // Switch to details tab on variable select
                                    }}
                                    className={`w-full cursor-pointer text-left p-3 rounded-lg mb-2 transition-colors duration-200 ${index === selectedStudyIndex
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                                        }`}
                                >
                                    {`Study S${(index + 1).toString().padStart(2, '0')}`}
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
                    {selectedStudy ? (
                        <div className="w-full bg-white border border-gray-200 rounded-xl p-6 flex flex-col min-h-full">
                            {/* Variable Header, Edit/Remove Buttons */}
                            <div className='mb-4 border-b pb-4'>
                                <div className="flex justify-between items-start ">
                                    <h2 className="text-3xl font-bold text-gray-800 flex-grow pr-4">
                                        {selectedStudy.title}
                                    </h2>
                                    <div className="flex space-x-3">
                                        <button
                                            onClick={() => openEditModal(selectedStudyIndex)}
                                            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out flex items-center justify-center text-sm transform hover:scale-105"
                                            title="Edit Variable Details"
                                        >
                                            <Edit2 className="w-4 h-4 mr-2" />
                                            Edit Details
                                        </button>
                                        <button
                                            onClick={() => removeParameter(selectedStudyIndex)}
                                            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition duration-200 ease-in-out flex items-center justify-center text-sm transform hover:scale-105"
                                            title="Remove Parameter"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Remove
                                        </button>
                                    </div>
                                </div>
                                <p className="text-md text-gray-700 mt-2">{selectedStudy.description ? selectedStudy.description : "no description available"}</p>
                            </div>
                            {/* Studies Grid - this is where the dynamic inputs are */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {selectedTestSetup?.sensors.map((sensor, index) => {
                                    const existingMapping = studyToSensorMeasurementMapping.find(
                                        (m) => m.studyId === selectedStudy.id && m.sensorId === sensor.id
                                    );

                                    // Fallback if no mapping exists yet
                                    const mapping = existingMapping || {
                                        sensorId: sensor.id,
                                        studyId: selectedStudy.id,
                                        value: ''
                                    };

                                    return (
                                        <div
                                            key={index}
                                            className="bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-sm"
                                        >
                                            <label
                                                // htmlFor={`${selectedVariable.variable.replace(/\s/g, '-')}-${study.id}-${selectedVariableIndex}`}
                                                className="block text-xs font-semibold text-blue-800 mb-1"
                                            >
                                                Sensor S{(index + 1).toString().padStart(2, '0')}
                                            </label>
                                            {renderInputField(selectedStudy, selectedStudyIndex, mapping)}
                                        </div>
                                    );
                                })}

                                {/* {Object.keys(selectedVariable.values).map((studyKey) => (
                                    <div key={studyKey} className="bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-sm">
                                        <label htmlFor={`${selectedVariable.variable.replace(/\s/g, '-')}-${studyKey}-${selectedVariableIndex}`} className="block text-xs font-semibold text-blue-800 mb-1">
                                            Study {studyKey.replace('s', '')}
                                        </label>
                                        {renderInputField(selectedVariable, selectedVariableIndex, studyKey)}
                                    </div>
                                ))} } */}
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
                    className={`revo-grid-container transition-opacity overflow-hidden duration-500 ease-in-out ${selectedTab === 'grid-view' ? "opacity-100" : "opacity-0 max-h-0"
                        }`}
                >
                    <GridTable items={processedData} setItems={setProcessedData} columns={columns} ></GridTable>
                    {/* <StudyDataTransformer studyVariables={studyVariables} studies={studies} rawMeasurements={studyToStudyVariableMapping} /> */}
                </div>
            </div>
        </div>
    );
});

export default MeasurementOutputSlide;