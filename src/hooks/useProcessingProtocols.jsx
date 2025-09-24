import React from 'react';

import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import ProcessingProtocolsMappingCard from '../components/ProcessingProtocolsMappingCard';

export const useProcessingProtocols = () => {

    const { processingProtocols, setProcessingProtocols } = useGlobalDataContext();

    const addProcessingProtocol = () => {
        const newProtocol = {
            id: crypto.randomUUID(),
            name: `New Protocol ${processingProtocols.length + 1}`,
            type: '',
            unit: '',
            description: ''
        };

        setProcessingProtocols(prev => [...(prev || []), newProtocol]);
    }

    const updateProcessingProtocol = (updatedVariable) => {
        setProcessingProtocols(prev => {
            if (!Array.isArray(prev)) return [updatedVariable];
            const idx = prev.findIndex(v => v.id === updatedVariable.id);
            if (idx === -1) return prev;
            const copy = prev.slice();
            copy[idx] = updatedVariable;
            return copy;
        });
    }

    const removeProcessingProtocol = (variableId) => {
        setProcessingProtocols(prev => Array.isArray(prev) ? prev.filter(v => v.id !== variableId) : []);
    }

    const cardComponent = () => {
        return ProcessingProtocolsMappingCard;
    }

    return {
        items: processingProtocols || [],
        setItems: setProcessingProtocols,
        addItem: addProcessingProtocol,
        updateItem: updateProcessingProtocol,
        removeItem: removeProcessingProtocol,
        cardComponent: cardComponent,
    }
}

export default useProcessingProtocols;