import React, { cloneElement, isValidElement } from 'react';
import Heading2 from '../../Typography/Heading2';
import TooltipButton from '../../Widgets/TooltipButton';

function renderActionPlugins(actionPlugins, pluginApi) {
    if (!Array.isArray(actionPlugins) || actionPlugins.length === 0) {
        return null;
    }

    return actionPlugins.map((plugin, index) => {
        if (isValidElement(plugin)) {
            return cloneElement(plugin, { key: `plugin-${index}`, api: pluginApi });
        }

        if (typeof plugin === 'function') {
            const PluginComponent = plugin;
            return <PluginComponent key={`plugin-${index}`} api={pluginApi} />;
        }

        return null;
    });
}

export default function DataGridControls({
    title,
    showControls,
    canUndo,
    canRedo,
    undo,
    redo,
    customActions = [],
    hideClearAllMappings = false,
    stats,
    handleClearAllMappings,
    showDebug = false,
    onDebugSelection,
    actionPlugins = [],
    pluginApi
}) {
    return (
        <div className="mb-4 flex-shrink-0">
            {title && (
                <Heading2 className="text-xl font-bold">{title}</Heading2>
            )}

            {showControls && (
                <div className="flex items-center gap-2 mt-2">
                    <TooltipButton
                        onClick={undo}
                        disabled={!canUndo}
                        className={`px-3 py-1 text-sm rounded ${canUndo
                            ? 'bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100'
                            : 'bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed'
                        }`}
                        tooltipText="Undo (Ctrl+Z)"
                    >
                        Undo
                    </TooltipButton>

                    <TooltipButton
                        onClick={redo}
                        disabled={!canRedo}
                        className={`px-3 py-1 text-sm rounded ${canRedo
                            ? 'bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100'
                            : 'bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed'
                        }`}
                        tooltipText="Redo (Ctrl+Y or Ctrl+Shift+Z)"
                    >
                        Redo
                    </TooltipButton>

                    {customActions.length > 0 && (
                        <>
                            <div className="border-l border-gray-300 h-6 mx-2"></div>
                            {customActions.map((action, index) => (
                                <TooltipButton
                                    key={index}
                                    onMouseDown={action.onMouseDown}
                                    onClick={action.onClick}
                                    disabled={action.disabled}
                                    className={action.className || `px-3 py-1 text-sm rounded border ${action.disabled
                                        ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                        : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                                    }`}
                                    tooltipText={action.title}
                                >
                                    {action.label}
                                </TooltipButton>
                            ))}
                        </>
                    )}

                    {!hideClearAllMappings && (
                        <>
                            <div className="border-l border-gray-300 h-6 mx-2"></div>
                            <TooltipButton
                                onClick={handleClearAllMappings}
                                disabled={!(stats && stats.totalMappings > 0)}
                                className={`px-3 py-1 text-sm rounded border ${stats && stats.totalMappings > 0
                                    ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                                    : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                }`}
                                tooltipText={stats && stats.totalMappings > 0 ? 'Clear all mappings' : 'No mappings to clear'}
                            >
                                Clear all mappings
                            </TooltipButton>
                        </>
                    )}

                    {(showDebug || actionPlugins.length > 0) && (
                        <div className="border-l border-gray-300 h-6 mx-2"></div>
                    )}

                    {showDebug && (
                        <TooltipButton
                            onClick={onDebugSelection}
                            className="px-3 py-1 text-sm rounded border bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                            tooltipText="Debug selection"
                        >
                            Debug Selection
                        </TooltipButton>
                    )}

                    {renderActionPlugins(actionPlugins, pluginApi)}
                </div>
            )}
        </div>
    );
}
