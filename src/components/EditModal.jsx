import React, { useState, useEffect } from 'react';

// EditVariableModal Component
const EditVariableModal = ({ isOpen, onClose, onSave, initialVariableData, variableTypes }) => {
    // Internal state for the data being edited in the modal
    const [tempEditData, setTempEditData] = useState(initialVariableData);

    // Update tempEditData when initialVariableData prop changes (i.e., when a new variable is selected for editing)
    useEffect(() => {
        setTempEditData(initialVariableData);
    }, [initialVariableData]);

    // Handle input changes within the modal
    const handleModalInputChange = (e) => {
        const { name, value } = e.target;
        setTempEditData(prev => ({ ...prev, [name]: value }));
    };

    // Handle saving changes
    const handleSave = () => {
        onSave(tempEditData); // Pass the updated data back to the parent
        onClose(); // Close the modal
    };

    // if (!isOpen || !initialVariableData) return null; // Don't render if not open or no data

    return (
        <div className="absolute inset-0 p-0 rounded-md bg-blue-500/25 flex items-center justify-center z-999 overflow-auto">
            <div  style={{scale: 0.9}} className="bg-white rounded-lg m-0 shadow-xl p-6 w-full max-w-md transform scale-100 transition-transform duration-300 ease-out">
                <h4 className="text-2xl font-bold text-gray-800 text-center ">
                    Edit Details for: 
                </h4>
                <h4 className="text-2xl font-bold text-gray-800 mb-5 py-2 border-b text-center">
                    <span className="text-blue-700">{initialVariableData?.name}</span>
                </h4>

                <div className="mb-4">
                    <label htmlFor="variable-name" className="block text-sm font-medium text-gray-700 mb-1">Variable Name:</label>
                    <input
                        type="text"
                        id="variable-name"
                        name="name"
                        value={tempEditData?.name}
                        onChange={handleModalInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div className="mb-4">
                    <label htmlFor="variable-type" className="block text-sm font-medium text-gray-700 mb-1">Variable Type:</label>
                    <select
                        id="variable-type"
                        name="type"
                        value={tempEditData?.type}
                        onChange={handleModalInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        {variableTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                <div className="mb-4">
                    <label htmlFor="variable-unit" className="block text-sm font-medium text-gray-700 mb-1">Unit:</label>
                    <input
                        type="text"
                        id="variable-unit"
                        name="unit"
                        value={tempEditData?.unit}
                        onChange={handleModalInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., RPM, bar, m^3/h"
                    />
                </div>

                <div className="mb-6">
                    <label htmlFor="variable-description" className="block text-sm font-medium text-gray-700 mb-1">Description:</label>
                    <textarea
                        id="variable-description"
                        name="description"
                        value={tempEditData?.description}
                        onChange={handleModalInputChange}
                        rows="3"
                        
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-y"
                        placeholder="A brief description of this variable."
                    ></textarea>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditVariableModal;