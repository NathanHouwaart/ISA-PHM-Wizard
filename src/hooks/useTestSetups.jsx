import React from 'react';

import Card from '../components/TestSetup/TestSetupCard';
import Form from '../components/TestSetup/TestSetupForm';
import View from '../components/TestSetup/TestSetupView';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';


export const useTestSetups = () => {

    const { testSetups, setTestSetups } = useGlobalDataContext(); // Get studies and setStudies from global context
    
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
        items: testSetups,
        setItems: setTestSetups,
        getCard,
        getForm,
        getView
    }
}

export default useTestSetups;