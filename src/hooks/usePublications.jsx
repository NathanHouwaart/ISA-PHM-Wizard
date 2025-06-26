import React from 'react';


import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import { PublicationCard } from '../components/Publication/PublicationCard';
import { PublicationForm } from '../components/Publication/PublicationForm';

export const usePublications = () => {
    
    const { publications, setPublications } = useGlobalDataContext(); // Get studies and setStudies from global context
    
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
        items: publications,
        setItems : setPublications,
        getCard,
        getForm,
        getView
    }
}

export default usePublications;