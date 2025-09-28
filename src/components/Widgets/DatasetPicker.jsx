import React, { useState } from 'react';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';

// Reusable DatasetPicker UI: pick a root folder, index it (count + walk), show progress
export default function DatasetPicker({ label = 'Index Root Folder', className = '' }) {
    const { selectedDataset, setSelectedDataset } = useGlobalDataContext();
    const [loading, setLoading] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const [recentFiles, setRecentFiles] = useState([]);
    const [indexed, setIndexed] = useState(Boolean(selectedDataset));

    async function countEntries(handle) {
        let total = 0;
        for await (const [, h] of handle.entries()) {
            total += 1;
            if (h.kind === 'directory') {
                try { total += await countEntries(h); } catch (err) { }
            }
        }
        return total;
    }

    function sortNodes(nodes) {
        return nodes
            .sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            })
            .map((n) => (n.isDirectory ? { ...n, children: sortNodes(n.children || []) } : n));
    }

    async function walkDir(handle, prefix = '', onProgress = () => { }) {
        const entries = [];
        for await (const [name, h] of handle.entries()) {
            const relPath = prefix ? `${prefix}/${name}` : name;
            try { onProgress({ current: relPath }); } catch (e) { }
            if (h.kind === 'directory') {
                const children = await walkDir(h, relPath, onProgress);
                entries.push({ name, relPath, isDirectory: true, children });
            } else {
                entries.push({ name, relPath, isDirectory: false });
            }
            try { onProgress({ processed: 1 }); } catch (e) { }
        }
        return sortNodes(entries);
    }

    async function pickAndIndex() {
        try {
            const rootHandle = await window.showDirectoryPicker();
            if (!rootHandle) return;

            setLoading(true);
            setProgressPercent(0);
            setProgressMessage('');
            setIndexed(false);

            let rootName = 'Root';
            try { rootName = rootHandle.name || 'Root'; } catch (err) { }

            setProgressMessage('Counting items...');
            setRecentFiles([]); // Initialize recentFiles to avoid undefined state
            let total = 0;
            try { total = await countEntries(rootHandle); } catch (err) { total = 1; }
            let processed = 0;
            const onProgress = ({ current, processed: p = 0 }) => {
                if (current) {
                    setProgressMessage(current);
                    setRecentFiles((prev) => [current, ...prev.filter((x) => x !== current)].slice(0, 8));
                }
                if (p) {
                    processed += p;
                    const percent = Math.min(100, Math.round((processed / Math.max(1, total)) * 100));
                    setProgressPercent(percent);
                }
            };

            const tree = await walkDir(rootHandle, '', onProgress);

            const dataset = { rootName, tree };
            // show completion state briefly
            setSelectedDataset(dataset);
            setProgressPercent(100);
            setProgressMessage('Indexing complete');
            setIndexed(true);
            // keep the message visible for a short moment so the user can see completion
            setTimeout(() => {
                setLoading(false);
                setProgressPercent(0);
                setProgressMessage('');
                setRecentFiles([]);
            }, 900);
        } catch (err) {
            // cancelled or error
        } finally {
            // always clear loading flag; success path may keep a short completion message
            setLoading(false);
            if (progressMessage !== 'Indexing complete') {
                setProgressPercent(0);
                setProgressMessage('');
                setRecentFiles([]);
            }
        }
    }

    return (
        <div className={`dataset-picker ${className}`}>
            <div className="flex flex-col items-center w-full">
                <button
                    type="button"
                    onClick={pickAndIndex}
                    className={`mx-auto px-4 py-2 rounded-lg transition-colors duration-150 ${indexed ? 'bg-green-100 text-green-800' : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'}`}
                >
                    {indexed ? (
                        <span className="inline-flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414-1.414L7 12.172 4.707 9.879a1 1 0 00-1.414 1.415l3 3a1 1 0 001.414 0l9-9z" clipRule="evenodd" /></svg>
                            Selected: {selectedDataset?.rootName || 'Root'}
                        </span>
                    ) : (
                        label
                    )}
                </button>

                <div className='h-5'>
                    {loading && (
                        <div className="mt-3 w-full max-w-md">
                            {progressPercent === 0 && progressMessage && progressMessage.toLowerCase().includes('count') ? (
                                <div className="flex items-center gap-3">
                                    <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                    </svg>
                                    <div className="flex-1">
                                        <div className="text-xs text-gray-500">{progressMessage}</div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                                        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progressPercent}%` }} />
                                    </div>
                                    <div className="mt-1 flex items-center justify-between">
                                        <div className="text-xs text-gray-500">{progressMessage && progressMessage !== 'Indexing complete' ? progressMessage : ''}</div>
                                        <div className="text-xs text-gray-500">{progressMessage === 'Indexing complete' ? 'Done' : `${progressPercent}%`}</div>
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
