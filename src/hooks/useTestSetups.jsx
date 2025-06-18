import React from 'react';

import Card from '../components/TestSetup/TestSetupCard';
import Form from '../components/TestSetup/TestSetupForm';
import View from '../components/TestSetup/TestSetupView';


export const useTestSetups = () => {
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

export default useTestSetups;