import React from 'react';

import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import { StudyVariableMappingCard } from '../components/StudyVariableMappingCard';
import { VARIABLE_TYPE_OPTIONS } from '../constants/variableTypes';

export const useVariables = () => {
    
    const { studyVariables, setStudyVariables, studyToStudyVariableMapping, setStudyToStudyVariableMapping } = useGlobalDataContext();

    const addVariable = () => {
        const newVariable = {
                    name: 'New Variable',
                    type: VARIABLE_TYPE_OPTIONS[0], // Default to first type
                    unit: '',
                    description: '',
                    id: crypto.randomUUID(), // Generate a unique ID
                };

        setStudyVariables(prev => [...prev, newVariable]);        
    }

    const updateVariable = (updatedVariable) => {
        setStudyVariables(prev => {
            const index = prev.findIndex(variable => variable.id === updatedVariable.id);
            if (index !== -1) {
                const newVariables = [...prev];
                newVariables[index] = updatedVariable;
                return newVariables;
            }
            return prev; // If not found, return unchanged
        });
    }

    const removeVariable = (variableId) => {
        console.log("Removing variable with ID:", variableId);
        setStudyVariables(prev => prev.filter(variable => variable.id !== variableId));
    }

    const cardComponent = () => {
        return StudyVariableMappingCard;
    }

    return {
        items: studyVariables,
        setItems : setStudyVariables,
        addItem : addVariable,
        updateItem : updateVariable,
        removeItem : removeVariable,
        cardComponent: cardComponent,
    }
}

export default useVariables;