import React from 'react';

import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import ProcessingProtocolsMappingCard from '../components/ProcessingProtocolsMappingCard';

export const useProcessingProtocols = () => {

    const { selectedTestSetupId, testSetups, setSelectedTestSetupId } = useGlobalDataContext(); // Get studies and setStudies from global context

    const selectedTestSetup = testSetups.find(setup => setup.id === selectedTestSetupId);

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
        return ProcessingProtocolsMappingCard;
    }

    return {
        items: selectedTestSetup?.sensors || [],
        setItems : setSelectedTestSetupId,
        addItem : addVariable,
        updateItem : updateVariable,
        removeItem : removeVariable,
        cardComponent: cardComponent,
    }
}

export default useProcessingProtocols;