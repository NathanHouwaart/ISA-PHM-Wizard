import React from 'react';

import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import ProcessingProtocolsMappingCard from '../components/ProcessingProtocolsMappingCard';

export const useMeasurementProtocols = () => {

    const { measurementProtocols, setMeasurementProtocols } = useGlobalDataContext();

    const addMeasurementProtocol = () => {
        const newProtocol = {
            id: crypto.randomUUID(),
            name: `New Protocol ${measurementProtocols.length + 1}`,
            type: '',
            unit: '',
            description: ''
        };

        setMeasurementProtocols(prev => [...(prev || []), newProtocol]);
    }

    const updateMeasurementProtocol = (updatedVariable) => {
        setMeasurementProtocols(prev => {
            if (!Array.isArray(prev)) return [updatedVariable];
            const idx = prev.findIndex(v => v.id === updatedVariable.id);
            if (idx === -1) return prev;
            const copy = prev.slice();
            copy[idx] = updatedVariable;
            return copy;
        });
    }

    const removeMeasurementProtocol = (variableId) => {
        setMeasurementProtocols(prev => Array.isArray(prev) ? prev.filter(v => v.id !== variableId) : []);
    }

    const cardComponent = () => {
        return ProcessingProtocolsMappingCard;
    }

    return {
        items: measurementProtocols || [],
        setItems: setMeasurementProtocols,
        addItem: addMeasurementProtocol,
        updateItem: updateMeasurementProtocol,
        removeItem: removeMeasurementProtocol,
        cardComponent: cardComponent,
    }
}

export default useMeasurementProtocols;
