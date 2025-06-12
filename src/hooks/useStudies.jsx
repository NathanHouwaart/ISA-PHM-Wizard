import React from 'react';

import StudyCard from '../components/Study/StudyCard';
import StudyForm from '../components/Study/StudyForm';
import StudyView from '../components/Study/StudyView';

export const useStudies = () => {
    
    const getCard = () => {
        return StudyCard;
    }

    const getForm = () => {
        return StudyForm;
    }

    const getView = () => {
        return StudyView;
    }

    return {
        getCard,
        getForm,
        getView
    }
}

export default useStudies;