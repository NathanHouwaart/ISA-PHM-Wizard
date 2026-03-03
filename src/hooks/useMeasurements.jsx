import React from 'react';

import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import StudyMeasurementMappingCard from '../components/StudyMeasurementMappingCard';
import useStudyRuns from './useStudyRuns';

export const useMeasurements = () => {
    
    const { setStudies } = useGlobalDataContext(); // Keep setter for compatibility if needed
    const studyRuns = useStudyRuns();
    
    const addVariable = () => {
        return null;
    }

    const updateVariable = (_updatedVariable) => {
        return null;
    }

    const removeVariable = (_variableId) => {
        return null;
    }

    const cardComponent = () => {
        return StudyMeasurementMappingCard;
    }

    return {
        items: studyRuns,
        setItems : setStudies,
        addItem : addVariable,
        updateItem : updateVariable,
        removeItem : removeVariable,
        cardComponent: cardComponent,
    }
}

export default useMeasurements;
