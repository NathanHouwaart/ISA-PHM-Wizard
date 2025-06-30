import React, { forwardRef, useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit2, Trash2, Save, X, User, Mail, MapPin, Calendar } from 'lucide-react';
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

import publicationFormFields from '../../data/PublicationFormFields.json'
import usePublications from '../../hooks/usePublications';

import Collection, {
    CollectionTitle,
    CollectionSubtitle,
    CollectionAddButtonText,
    CollectionEmptyStateTitle,
    CollectionEmptyStateSubtitle,
    CollectionEmptyStateAddButtonText
} from '../Collection';
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';

export const PublicationSlide = forwardRef(({ onHeightChange}, ref) => {

    const resizeElementRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, resizeElementRef);

    return (
        <div ref={combinedRef}>
            
            <SlidePageTitle>
                {publicationFormFields.pageTitle}
            </SlidePageTitle>

            <SlidePageSubtitle>
                {publicationFormFields.pageSubtitle}
            </SlidePageSubtitle>

            <div className='bg-gray-50 p-4 border-gray-300 border rounded-lg pb-2'>
                <Collection
                    onHeightChange={() => { }}
                    itemHook={usePublications} // This hook will need to pull 'studies' from the global context
                >
                    <CollectionTitle>Publications</CollectionTitle>
                    <CollectionSubtitle>Add, Remove And Edit Publications</CollectionSubtitle>
                    <CollectionAddButtonText>Add Publication</CollectionAddButtonText>
                    <CollectionEmptyStateTitle>No Publication Found</CollectionEmptyStateTitle>
                    <CollectionEmptyStateSubtitle>Click below to add your first Publication</CollectionEmptyStateSubtitle>
                    <CollectionEmptyStateAddButtonText>Add Publication Now</CollectionEmptyStateAddButtonText>
                </Collection>
            </div>

        </div>
    );
});

export default PublicationSlide;