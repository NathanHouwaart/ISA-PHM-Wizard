import React from 'react';
import { RevoGrid } from '@revolist/react-datagrid';

export default function DataGridViewport({
    gridKey,
    setGridRef,
    gridData,
    rowsize,
    appliedColumns,
    handleBeforeEdit,
    handleAfterEdit,
    handleBeforeRangeEdit,
    handleAfterRangeEdit,
    showDebug = false,
    handlePasteRegion,
    handleClearRegion,
    handleClipboardRangePaste,
    handleBeforeKeyDown,
    plugins = {},
    gridProps = {}
}) {
    const {
        onBeforekeydown: externalBeforeKeyDown,
        ...passThroughGridProps
    } = gridProps || {};

    return (
        <div className="flex-1 min-h-0">
            <RevoGrid
                key={gridKey}
                ref={setGridRef}
                style={{ height: '100%' }}
                source={gridData}
                rowSize={rowsize}
                columns={appliedColumns}
                onBeforeedit={handleBeforeEdit}
                onAfteredit={handleAfterEdit}
                onBeforerangeedit={handleBeforeRangeEdit}
                onAfterangeedit={handleAfterRangeEdit}
                onBeforecopy={(event) => {
                    if (showDebug) {
                        console.log('[DataGrid] beforecopy:', event.detail);
                    }
                }}
                onBeforepaste={(event) => {
                    if (showDebug) {
                        console.log('[DataGrid] beforepaste:', event.detail);
                    }
                }}
                onBeforekeydown={(event) => {
                    handleBeforeKeyDown?.(event);
                    externalBeforeKeyDown?.(event);
                }}
                onBeforecut={(event) => {
                    if (showDebug) {
                        console.log('[DataGrid] beforecut:', event.detail);
                    }
                }}
                onCopyregion={(event) => {
                    if (showDebug) {
                        console.log('[DataGrid] copyregion:', event.detail);
                    }
                }}
                onPasteregion={(event) => {
                    if (showDebug) {
                        console.log('[DataGrid] pasteregion:', event.detail);
                    }
                    handlePasteRegion(event);
                }}
                onClearregion={(event) => {
                    if (showDebug) {
                        console.log('[DataGrid] clearregion:', event.detail);
                    }
                    handleClearRegion(event);
                }}
                onClipboardrangepaste={(event) => {
                    if (showDebug) {
                        const detail = event.detail || {};
                        const sample = detail.data ? Object.entries(detail.data)[0] : undefined;
                        console.log('[DataGrid] clipboardrangepaste (raw sample):', sample);
                    }
                    handleClipboardRangePaste(event);
                }}
                onBeforeautofill={(event) => {
                    if (showDebug) {
                        console.log('[DataGrid] beforeautofill (letting RevoGrid handle):', event.detail);
                    }
                }}
                readonly={false}
                resize={true}
                range={true}
                canFocus={true}
                columnTypes={plugins}
                editors={{
                    string: {
                        type: 'input',
                        validator: () => true
                    }
                }}
                {...passThroughGridProps}
            />
        </div>
    );
}
