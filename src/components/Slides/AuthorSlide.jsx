import React, { forwardRef, useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit2, Trash2, Save, X, User, Mail, MapPin, Calendar } from 'lucide-react';
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

import authorFormFields from '../../data/AuthorFormFields.json'
import useAuthors from '../../hooks/useAuthors';

import Collection, {
    CollectionTitle,
    CollectionUndertitle,
    CollectionAddButtonText,
    CollectionEmptyStateTitle,
    CollectionEmptyStateUndertitle,
    CollectionEmptyStateAddButtonText
} from '../Collection';

export const AuthorSlide = forwardRef(({ onHeightChange}, ref) => {

    const resizeElementRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, resizeElementRef);

    return (
        <div ref={combinedRef}>
            <h2 className='text-2xl font-semibold text-gray-800 flex items-center justify-center mb-2'>
                {authorFormFields.pageTitle}
            </h2>
            <p className='text-center text-sm font text-gray-700 mb-7 pb-7 border-b border-gray-300'>{authorFormFields.pageUnderTitle}</p>

            <div className='bg-gray-50 p-4 border-gray-300 border rounded-lg pb-4'>
                <Collection
                    onHeightChange={() => { }}
                    itemHook={useAuthors} // This hook will need to pull 'studies' from the global context
                >
                    <CollectionTitle>Authors</CollectionTitle>
                    <CollectionUndertitle>Add, Remove And Edit Authors</CollectionUndertitle>
                    <CollectionAddButtonText>Add Author</CollectionAddButtonText>
                    <CollectionEmptyStateTitle>No Authors Found</CollectionEmptyStateTitle>
                    <CollectionEmptyStateUndertitle>Click below to add your first Author</CollectionEmptyStateUndertitle>
                    <CollectionEmptyStateAddButtonText>Add Author Now</CollectionEmptyStateAddButtonText>
                </Collection>
            </div>

        </div>
    );
});

export default AuthorSlide;