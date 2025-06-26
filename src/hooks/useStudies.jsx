import React from 'react';

import Card from '../components/Study/StudyCard';
import Form from '../components/Study/StudyForm';
import View from '../components/Study/StudyView';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';


export const useStudies = () => {
    
    const { studies, setStudies } = useGlobalDataContext(); // Get studies and setStudies from global context

    const getCard = () => {
        return Card;
    }

    const getForm = () => {
        return Form;
    }

    const getView = () => {
        return null;
    }

    return {
        items: studies,
        setItems: setStudies,
        getCard,
        getForm,
        getView
    }
}

export default useStudies;