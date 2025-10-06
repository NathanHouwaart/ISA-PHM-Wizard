import React from 'react';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import TooltipButton from './TooltipButton';
import { AlertTriangle } from 'lucide-react';

/**
 * TestSetupConflictDialog
 * 
 * Modal dialog shown when importing a project with a test setup that conflicts
 * with an existing test setup (same UUID but different version/content).
 * 
 * Props:
 * - conflict: { setupId, setupName, local: { version, lastModified, setup }, imported: { version, lastModified, setup } }
 * - onResolve: (resolution: 'keep-local' | 'use-imported' | 'keep-both') => void
 * - onCancel: () => void
 */
const TestSetupConflictDialog = ({ conflict, onResolve, onCancel }) => {
    if (!conflict) return null;

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Unknown';
        try {
            return new Date(timestamp).toLocaleString();
        } catch (e) {
            return 'Unknown';
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

            {/* Dialog */}
            <div className="relative z-[71] w-full max-w-2xl mx-4">
                <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                            <Heading3>Test Setup Conflict Detected</Heading3>
                            <Paragraph className="text-gray-600 mt-1">
                                The project you're importing contains a test setup that already exists in your workspace,
                                but with different content. Please choose how to resolve this conflict.
                            </Paragraph>
                        </div>
                    </div>

                    {/* Conflict Details */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <p className="font-semibold text-gray-900 mb-3">
                            Test Setup: <span className="text-blue-600">{conflict.setupName}</span>
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4">
                            {/* Local Version */}
                            <div className="bg-white rounded-md p-3 border border-gray-200">
                                <p className="text-sm font-semibold text-gray-700 mb-2">Your Current Version</p>
                                <div className="space-y-1 text-sm">
                                    <p className="text-gray-600">
                                        <span className="font-medium">Version:</span> {conflict.local.version}
                                    </p>
                                    <p className="text-gray-600">
                                        <span className="font-medium">Last Modified:</span>
                                    </p>
                                    <p className="text-xs text-gray-500 ml-2">
                                        {formatDate(conflict.local.lastModified)}
                                    </p>
                                </div>
                            </div>

                            {/* Imported Version */}
                            <div className="bg-white rounded-md p-3 border border-gray-200">
                                <p className="text-sm font-semibold text-gray-700 mb-2">Imported Version</p>
                                <div className="space-y-1 text-sm">
                                    <p className="text-gray-600">
                                        <span className="font-medium">Version:</span> {conflict.imported.version}
                                    </p>
                                    <p className="text-gray-600">
                                        <span className="font-medium">Last Modified:</span>
                                    </p>
                                    <p className="text-xs text-gray-500 ml-2">
                                        {formatDate(conflict.imported.lastModified)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Resolution Options */}
                    <div className="space-y-3 mb-6">
                        <Paragraph className="font-semibold text-gray-900">
                            Choose an action:
                        </Paragraph>

                        <button
                            onClick={() => onResolve('keep-local')}
                            className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                        >
                            <p className="font-semibold text-gray-900 group-hover:text-blue-700">
                                Keep Your Current Version
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                Discard the imported test setup and keep your existing version. The project will be imported
                                but will reference your current test setup.
                            </p>
                        </button>

                        <button
                            onClick={() => onResolve('use-imported')}
                            className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all group"
                        >
                            <p className="font-semibold text-gray-900 group-hover:text-green-700">
                                Use Imported Version
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                Replace your current test setup with the imported version. This will update the test setup
                                for all projects using it.
                            </p>
                        </button>

                        <button
                            onClick={() => onResolve('keep-both')}
                            className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all group"
                        >
                            <p className="font-semibold text-gray-900 group-hover:text-purple-700">
                                Keep Both (Create New)
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                Keep your current test setup unchanged and add the imported version as a new test setup
                                with a different ID. The imported project will use the new test setup.
                            </p>
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <TooltipButton
                            onClick={onCancel}
                            tooltipText="Cancel import and close dialog"
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </TooltipButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestSetupConflictDialog;
