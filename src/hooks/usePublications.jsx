import React from 'react';

import { PublicationCard, PublicationForm } from '../components/Publication';

export const usePublications = () => {
    
    const getCard = () => {
        return PublicationCard;
    }

    const getForm = () => {
        return PublicationForm;
    }

    const getView = () => {
        return null;
    }

    return {
        getCard,
        getForm,
        getView
    }
}

export default usePublications;