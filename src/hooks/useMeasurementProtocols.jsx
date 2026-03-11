import { useProjectActions, useProjectData } from '../contexts/GlobalDataContext';
import ProcessingProtocolsMappingCard from '../components/ProcessingProtocolsMappingCard';
import generateId from '../utils/generateId';

export const useMeasurementProtocols = () => {

    const { measurementProtocols } = useProjectData();
    const { setMeasurementProtocols } = useProjectActions();
    const components = {
        card: null,
        form: null,
        view: null,
        mappingCard: ProcessingProtocolsMappingCard
    };

    const addMeasurementProtocol = () => {
        const newProtocol = {
            id: generateId(),
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

    return {
        items: measurementProtocols || [],
        setItems: setMeasurementProtocols,
        addItem: addMeasurementProtocol,
        updateItem: updateMeasurementProtocol,
        removeItem: removeMeasurementProtocol,
        components,
    }
}

export default useMeasurementProtocols;
