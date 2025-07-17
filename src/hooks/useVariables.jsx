import React from 'react';

import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import { StudyVariableMappingCard } from '../components/StudyVariableMappingCard';

export const useVariables = () => {
    
    const { studyVariables, setStudyVariables, studyToStudyVariableMapping, setStudyToStudyVariableMapping } = useGlobalDataContext(); // Get studies and setStudies from global context
    
    const addVariable = () => {
        const newVariable = {
                    name: 'New Variable',
                    type: 'Qualitative fault specification',
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