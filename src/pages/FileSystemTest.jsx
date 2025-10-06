// Test file for useFileSystem hook
// This file can be deleted - it's just for quick manual testing

import React from 'react';
import { useFileSystem } from '../hooks/useFileSystem';

export default function FileSystemTest() {
  const fileSystem = useFileSystem();

  async function handleTest() {
    try {
      console.log('Native API supported:', fileSystem.isNativeSupported);
      
      const dataset = await fileSystem.pickAndIndexDirectory((progress) => {
        console.log('Progress:', progress);
      });

      if (dataset) {
        console.log('Dataset indexed successfully:', dataset);
        console.log('Root name:', dataset.rootName);
        console.log('File count:', countFiles(dataset.tree));
      } else {
        console.log('User cancelled');
      }
    } catch (err) {
      console.error('Error:', err);
    }
  }

  function countFiles(nodes) {
    let count = 0;
    for (const node of nodes) {
      if (node.isDirectory && node.children) {
        count += countFiles(node.children);
      } else {
        count += 1;
      }
    }
    return count;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">File System Hook Test</h1>
      
      <div className="space-y-4">
        <div>
          <strong>Native API Supported:</strong> {fileSystem.isNativeSupported ? '✅ Yes' : '❌ No (using fallback)'}
        </div>

        <button
          onClick={handleTest}
          disabled={fileSystem.loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
        >
          {fileSystem.loading ? 'Indexing...' : 'Test Directory Picker'}
        </button>

        {fileSystem.loading && (
          <div className="space-y-2">
            <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all" 
                style={{ width: `${fileSystem.progress.percent}%` }} 
              />
            </div>
            <div className="text-sm text-gray-600">
              {fileSystem.progress.message}
            </div>
            <div className="text-sm text-gray-500">
              {fileSystem.progress.percent}%
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">Instructions:</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Click "Test Directory Picker"</li>
          <li>Select a folder (try with 65,000+ files)</li>
          <li>Watch the progress bar</li>
          <li>Check browser console for detailed output</li>
          <li>Verify no crashes or memory errors</li>
        </ol>
      </div>
    </div>
  );
}
