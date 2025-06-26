import React from 'react';

import Card from '../components/Author/AuthorCard';
import Form from '../components/Author/AuthorForm';
import View from '../components/Author/AuthorView';

import { useGlobalDataContext } from '../contexts/GlobalDataContext';

export const useAuthors = () => {
    
    const { authors, setAuthors } = useGlobalDataContext(); // Get studies and setStudies from global context

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
        items: authors,
        setItems: setAuthors,
        getCard,
        getForm,
        getView
    }
}

export default useAuthors;