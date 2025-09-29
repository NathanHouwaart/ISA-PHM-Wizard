import React from 'react';

import Card from '../components/Contact/ContactCard';
import Form from '../components/Contact/ContactForm';
import View from '../components/Contact/ContactView';

import { useGlobalDataContext } from '../contexts/GlobalDataContext';

export const useContacts = () => {
    
    const { contacts, setContacts } = useGlobalDataContext(); // Get studies and setStudies from global context

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
        items: contacts,
        setItems: setContacts,
        getCard,
        getForm,
        getView
    }
}

export default useContacts;