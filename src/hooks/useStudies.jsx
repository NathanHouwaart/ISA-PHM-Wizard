import React from 'react';

import Card from '../components/Study/StudyCard';
import Form from '../components/Study/StudyForm';
import View from '../components/Study/StudyView';

export const useStudies = () => {
    
    const getCard = () => {
        return Card;
    }

    const getForm = () => {
        return Form;
    }

    const getView = () => {
        return View;
    }

    return {
        getCard,
        getForm,
        getView
    }
}

export default useStudies;