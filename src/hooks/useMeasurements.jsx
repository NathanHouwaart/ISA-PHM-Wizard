import React from 'react';

import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import StudyMeasurementMappingCard from '../components/StudyMeasurementMappingCard';

export const useMeasurements = () => {
    
    const { studies, setStudies } = useGlobalDataContext(); // Get studies and setStudies from global context
    
    const addVariable = () => {
        return null;
    }

    const updateVariable = (updatedVariable) => {
        return null;
    }

    const removeVariable = (variableId) => {
        return null;
    }

    const cardComponent = () => {
        return StudyMeasurementMappingCard;
    }

    return {
        items: studies,
        setItems : setStudies,
        addItem : addVariable,
        updateItem : updateVariable,
        removeItem : removeVariable,
        cardComponent: cardComponent,
    }
}

export default useMeasurements;