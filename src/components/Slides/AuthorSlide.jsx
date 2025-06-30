import React, { forwardRef, useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit2, Trash2, Save, X, User, Mail, MapPin, Calendar } from 'lucide-react';
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

import authorFormFields from '../../data/AuthorFormFields.json'
import useAuthors from '../../hooks/useAuthors';

import Collection, {
    CollectionTitle,
    CollectionSubtitle,
    CollectionAddButtonText,
    CollectionEmptyStateTitle,
    CollectionEmptyStateSubtitle,
    CollectionEmptyStateAddButtonText,
} from '../Collection';
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';

export const AuthorSlide = forwardRef(({ onHeightChange}, ref) => {

    const resizeElementRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, resizeElementRef);

    return (
        <div ref={combinedRef}>

            <SlidePageTitle>
                {authorFormFields.pageTitle}
            </SlidePageTitle>
            
            <SlidePageSubtitle>
                {authorFormFields.pageSubtitle}
            </SlidePageSubtitle>

            <div className='bg-gray-50 p-4 border-gray-300 border rounded-lg pb-4'>
                <Collection
                    onHeightChange={() => { }}
                    itemHook={useAuthors} // This hook will need to pull 'studies' from the global context
                >
                    <CollectionTitle>Authors</CollectionTitle>
                    <CollectionSubtitle>Add, Remove And Edit Authors</CollectionSubtitle>
                    <CollectionAddButtonText>Add Author</CollectionAddButtonText>
                    <CollectionEmptyStateTitle>No Authors Found</CollectionEmptyStateTitle>
                    <CollectionEmptyStateSubtitle>Click below to add your first Author</CollectionEmptyStateSubtitle>
                    <CollectionEmptyStateAddButtonText>Add Author Now</CollectionEmptyStateAddButtonText>
                </Collection>
            </div>

        </div>
    );
});

export default AuthorSlide;