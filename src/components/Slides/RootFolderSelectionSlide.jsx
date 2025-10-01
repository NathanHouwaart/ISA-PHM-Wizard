import React, { forwardRef } from 'react';
import DatasetPicker from '../Widgets/DatasetPicker';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';

export const RootFolderSelectionSlide = forwardRef(({onHeightChange}, ref) => {

    const resizeElementRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, resizeElementRef);

    const { selectedDataset } = useGlobalDataContext();

    // derive simple stats from the indexed tree
    const stats = { files: 0, folders: 0 };
    function walkCount(nodes) {
        if (!Array.isArray(nodes)) return;
        for (const n of nodes) {
            if (n.isDirectory) {
                stats.folders += 1;
                walkCount(n.children || []);
            } else {
                stats.files += 1;
            }
        }
    }
    if (selectedDataset && selectedDataset.tree) walkCount(selectedDataset.tree);

    return (
        <div ref={combinedRef} className="flex justify-center">
            <div className="w-full text-center">
                <SlidePageTitle>
                    Select Root Folder
                </SlidePageTitle>

                <SlidePageSubtitle>
                    Pick the folder containing your dataset. Indexing will make file selection simple in later steps.
                </SlidePageSubtitle>

                <div className='p-4 bg-gray-50 rounded-lg border border-gray-300'>
                    <div className="flex flex-col items-center gap-4">
                        <div className="text-sm text-gray-700">Dataset root</div>
                        <div className="w-full flex justify-center">
                            <DatasetPicker />
                        </div>

                        <div className="mt-4 flex items-center gap-8">
                            <div className="text-center">
                                <div className="text-xs text-gray-500">Files</div>
                                <div className="text-lg font-semibold">{stats.files}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-gray-500">Folders</div>
                                <div className="text-lg font-semibold">{stats.folders}</div>
                            </div>
                        </div>

                        <div className="mt-3 text-xs text-gray-500">Once indexed, go to the file explorer to pick and assign files.</div>
                    </div>
                </div>
            </div>
        </div>
    );
});

RootFolderSelectionSlide.displayName = "Root Folder Selection"; // Set display name for better debugging

export default RootFolderSelectionSlide;