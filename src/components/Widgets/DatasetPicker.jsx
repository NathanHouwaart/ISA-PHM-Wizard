import React, { useState, useEffect } from 'react';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import { useFileSystem } from '../../hooks/useFileSystem';

// Reusable DatasetPicker UI: pick a root folder, index it (count + walk), show progress
export default function DatasetPicker({ label = 'Index Root Folder', className = '' }) {
    const { selectedDataset, setSelectedDataset } = useGlobalDataContext();
    const [indexed, setIndexed] = useState(Boolean(selectedDataset));
    const fileSystem = useFileSystem();

    async function pickAndIndex() {
        try {
            setIndexed(false);
            
            const dataset = await fileSystem.pickAndIndexDirectory();
            
            if (!dataset) {
                // User cancelled
                return;
            }

            // Update global state with the selected dataset
            setSelectedDataset(dataset);
            setIndexed(true);
        } catch (err) {
            console.error('[DatasetPicker] Error:', err);
            const errorMsg = err && err.name === 'NotAllowedError'
                ? 'Permission denied. Please grant access to the folder.'
                : err && err.name === 'NotFoundError' 
                    ? 'The browser canceled the operation. Try selecting a different folder.'
                    : `Failed to index folder: ${err && err.message}`;
            alert(errorMsg);
        }
    }

    return (
        <div className={`dataset-picker ${className}`}>
            <div className="flex flex-col items-center w-full">
                <button
                    type="button"
                    onClick={pickAndIndex}
                    disabled={fileSystem.loading}
                    className={`mx-auto px-4 py-2 rounded-lg transition-colors duration-150 ${
                        indexed && !fileSystem.loading
                            ? 'bg-green-100 text-green-800' 
                            : fileSystem.loading
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                    }`}
                >
                    {indexed && !fileSystem.loading ? (
                        <span className="inline-flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414-1.414L7 12.172 4.707 9.879a1 1 0 00-1.414 1.415l3 3a1 1 0 001.414 0l9-9z" clipRule="evenodd" /></svg>
                            Selected: {selectedDataset?.rootName || 'Root'}
                        </span>
                    ) : fileSystem.loading ? (
                        <span className="inline-flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                            Indexing...
                        </span>
                    ) : (
                        label
                    )}
                </button>

                <div className='h-5'>
                    {fileSystem.loading && fileSystem.progress && (
                        <div className="mt-3 w-full max-w-md">
                            {fileSystem.progress.percent === 0 && fileSystem.progress.message && fileSystem.progress.message.toLowerCase().includes('count') ? (
                                <div className="flex items-center gap-3">
                                    <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                    </svg>
                                    <div className="flex-1">
                                        <div className="text-xs text-gray-500">{fileSystem.progress.message}</div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                                        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${fileSystem.progress.percent}%` }} />
                                    </div>
                                    <div className="mt-1 flex items-center justify-between">
                                        <div className="text-xs text-gray-500">
                                            {fileSystem.progress.message && fileSystem.progress.message !== 'Indexing complete!' 
                                                ? fileSystem.progress.message 
                                                : ''}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {fileSystem.progress.message === 'Indexing complete!' 
                                                ? 'Done' 
                                                : `${fileSystem.progress.percent}%`}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
