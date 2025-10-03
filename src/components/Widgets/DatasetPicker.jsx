import React, { useState } from 'react';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import { directoryOpen } from 'browser-fs-access';

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
            // Use browser-fs-access to open a directory; recursive:true returns all files inside
            const files = await directoryOpen({ recursive: true });
            if (!files || files.length === 0) return;

            // Build a nested tree from the returned File objects using webkitRelativePath
            const rootName = files[0].webkitRelativePath ? files[0].webkitRelativePath.split('/')[0] : 'Root';

            const nodesByPath = new Map();
            // ensure root placeholder
            nodesByPath.set('', { children: [] });

            for (const f of files) {
                const rel = f.webkitRelativePath || f.name;
                const parts = rel.split('/');
                // top-level path without rootName if present
                let path = '';
                for (let i = 0; i < parts.length; i++) {
                    const name = parts[i];
                    const relPath = path ? `${path}/${name}` : name;
                    if (!nodesByPath.has(relPath)) {
                        nodesByPath.set(relPath, { name, relPath, isDirectory: i < parts.length - 1, children: [] });
                        // attach to parent
                        const parentPath = path;
                        const parent = nodesByPath.get(parentPath);
                        if (parent) parent.children.push(nodesByPath.get(relPath));
                    }
                    path = relPath;
                }
            }

            const tree = (nodesByPath.get('')?.children || []).map((n) => n);

            // convert children arrays to sorted structure
            function sortNodes(nodes) {
                return nodes
                    .sort((a, b) => {
                        if (a.isDirectory && !b.isDirectory) return -1;
                        if (!a.isDirectory && b.isDirectory) return 1;
                        return (a.name || '').localeCompare(b.name || '');
                    })
                    .map((n) => (n.isDirectory ? { ...n, children: sortNodes(n.children || []) } : n));
            }

            const dataset = { rootName, tree: sortNodes(tree) };

            setLoading(true);
            setProgressPercent(0);
            setProgressMessage('');
            setIndexed(false);

            setProgressMessage('Indexing...');
            setRecentFiles([]);
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
