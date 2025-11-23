import React from 'react';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import StudyVariableCard from '../components/StudyVariable/StudyVariableCard';
import StudyVariableForm from '../components/StudyVariable/StudyVariableForm';
import { VARIABLE_TYPE_OPTIONS } from '../constants/variableTypes';
import generateId from '../utils/generateId';

export const useVariables = () => {
    const { studyVariables, setStudyVariables } = useGlobalDataContext();

    const addVariable = () => {
        const newVariable = {
            id: generateId(),
            name: 'New Variable',
            type: VARIABLE_TYPE_OPTIONS[0],
            unit: '',
            description: ''
        };
        setStudyVariables(prev => [...prev, newVariable]);
    };

    const updateVariable = (updatedVariable) => {
        setStudyVariables(prev => {
            const index = prev.findIndex(variable => variable.id === updatedVariable.id);
            if (index === -1) return prev;
            const next = [...prev];
            next[index] = updatedVariable;
            return next;
        });
    };

    const removeVariable = (variableId) => {
        setStudyVariables(prev => prev.filter(variable => variable.id !== variableId));
    };

    const getCard = () => StudyVariableCard;
    const getForm = () => StudyVariableForm;
    const getView = () => null;

    return {
        items: studyVariables,
        setItems: setStudyVariables,
        addItem: addVariable,
        updateItem: updateVariable,
        removeItem: removeVariable,
        getCard,
        getForm,
        getView
    };
};

export default useVariables;