import React, { forwardRef, useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit2, Trash2, Save, X, User, Mail, MapPin, Calendar } from 'lucide-react';
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

import useContacts from '../../hooks/useContacts';

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

export const ContactSlide = forwardRef(({ onHeightChange}, ref) => {

    const resizeElementRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, resizeElementRef);

    return (
        <div ref={combinedRef}>

            <SlidePageTitle>
                Contacts
            </SlidePageTitle>
            
            <SlidePageSubtitle>
                Manage the contributors to the investigation, and assign their roles.
            </SlidePageSubtitle>

            <div className='bg-gray-50 p-4 border-gray-300 border rounded-lg pb-4'>
                <Collection
                    onHeightChange={() => { }}
                    itemHook={useContacts} // This hook will need to pull 'studies' from the global context
                >
                    <CollectionTitle>Contacts</CollectionTitle>
                    <CollectionSubtitle>Add, Remove And Edit Contacts</CollectionSubtitle>
                    <CollectionAddButtonText>Add Contact</CollectionAddButtonText>
                    <CollectionEmptyStateTitle>No Contacts Found</CollectionEmptyStateTitle>
                    <CollectionEmptyStateSubtitle>Click below to add your first Contact</CollectionEmptyStateSubtitle>
                    <CollectionEmptyStateAddButtonText>Add Contact Now</CollectionEmptyStateAddButtonText>
                </Collection>
            </div>

        </div>
    );
});

ContactSlide.displayName = "Contacts"; // Set display name for better debugging

export default ContactSlide;