import React, { cloneElement, isValidElement, useMemo } from 'react';
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
    pluginApi,
    // Column filter
    enableColFilter = false,
    colFilterText = '',
    colFilterOpen = false,
    onToggleColFilter,
    onColFilterChange,
    // Row filter
    enableRowFilter = false,
    rowFilterText = '',
    rowFilterOpen = false,
    onToggleRowFilter,
    onRowFilterChange,
}) {
    const colFilterRegexValid = useMemo(() => {
        if (!colFilterText) return true;
        try { new RegExp(colFilterText); return true; }
        catch { return false; }
    }, [colFilterText]);

    const rowFilterRegexValid = useMemo(() => {
        if (!rowFilterText) return true;
        try { new RegExp(rowFilterText); return true; }
        catch { return false; }
    }, [rowFilterText]);
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

                    {(enableColFilter || enableRowFilter) && (
                        <>
                            <div className="border-l border-gray-300 h-6 mx-2"></div>

                            {enableColFilter && (
                                <>
                                    <TooltipButton
                                        onClick={onToggleColFilter}
                                        className={`px-3 py-1 text-sm rounded border ${colFilterOpen
                                            ? 'bg-blue-100 text-blue-700 border-blue-400 hover:bg-blue-200'
                                            : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                                        }`}
                                        tooltipText={colFilterOpen ? 'Clear column filter' : 'Filter columns by regex'}
                                    >
                                        {colFilterOpen && colFilterText ? `Cols: /${colFilterText}/` : 'Filter Cols'}
                                    </TooltipButton>
                                    {colFilterOpen && (
                                        <input
                                            autoFocus
                                            type="text"
                                            value={colFilterText}
                                            onChange={(e) => onColFilterChange(e.target.value)}
                                            placeholder="col regex…"
                                            className={`px-2 py-1 text-sm border rounded w-36 focus:outline-none focus:ring-1 ${
                                                colFilterRegexValid
                                                    ? 'border-gray-300 focus:ring-blue-400'
                                                    : 'border-red-400 bg-red-50 focus:ring-red-400'
                                            }`}
                                        />
                                    )}
                                </>
                            )}

                            {enableRowFilter && (
                                <>
                                    <TooltipButton
                                        onClick={onToggleRowFilter}
                                        className={`px-3 py-1 text-sm rounded border ${rowFilterOpen
                                            ? 'bg-purple-100 text-purple-700 border-purple-400 hover:bg-purple-200'
                                            : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                                        }`}
                                        tooltipText={rowFilterOpen ? 'Clear row filter' : 'Filter rows by regex'}
                                    >
                                        {rowFilterOpen && rowFilterText ? `Rows: /${rowFilterText}/` : 'Filter Rows'}
                                    </TooltipButton>
                                    {rowFilterOpen && (
                                        <input
                                            autoFocus={!colFilterOpen}
                                            type="text"
                                            value={rowFilterText}
                                            onChange={(e) => onRowFilterChange(e.target.value)}
                                            placeholder="row regex…"
                                            className={`px-2 py-1 text-sm border rounded w-36 focus:outline-none focus:ring-1 ${
                                                rowFilterRegexValid
                                                    ? 'border-gray-300 focus:ring-purple-400'
                                                    : 'border-red-400 bg-red-50 focus:ring-red-400'
                                            }`}
                                        />
                                    )}
                                </>
                            )}
                        </>
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
