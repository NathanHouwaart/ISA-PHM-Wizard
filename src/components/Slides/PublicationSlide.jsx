import React, { forwardRef, useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit2, Trash2, Save, X, User, Mail, MapPin, Calendar } from 'lucide-react';
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

import publicationFormFields from '../../data/PublicationFormFields.json'
import usePublications from '../../hooks/usePublications';

import Collection, {
    CollectionTitle,
    CollectionUndertitle,
    CollectionAddButtonText,
    CollectionEmptyStateTitle,
    CollectionEmptyStateUndertitle,
    CollectionEmptyStateAddButtonText
} from '../Collection';

export const PublicationSlide = forwardRef(({ onHeightChange}, ref) => {

    const resizeElementRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, resizeElementRef);

    return (
        <div ref={combinedRef}>
            <h2 className='text-2xl font-semibold text-gray-800 flex items-center justify-center mb-2'>
                {publicationFormFields.pageTitle}
            </h2>
            <p className='text-center text-sm font text-gray-700 mb-7 pb-7 border-b border-gray-300'>{publicationFormFields.pageUnderTitle}</p>

            <div className='bg-gray-50 p-4 border-gray-300 border rounded-lg pb-2'>
                <Collection
                    onHeightChange={() => { }}
                    itemHook={usePublications} // This hook will need to pull 'studies' from the global context
                >
                    <CollectionTitle>Publications</CollectionTitle>
                    <CollectionUndertitle>Add, Remove And Edit Publications</CollectionUndertitle>
                    <CollectionAddButtonText>Add Publication</CollectionAddButtonText>
                    <CollectionEmptyStateTitle>No Publication Found</CollectionEmptyStateTitle>
                    <CollectionEmptyStateUndertitle>Click below to add your first Publication</CollectionEmptyStateUndertitle>
                    <CollectionEmptyStateAddButtonText>Add Publication Now</CollectionEmptyStateAddButtonText>
                </Collection>
            </div>

        </div>
    );
});

export default PublicationSlide;