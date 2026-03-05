import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import ProcessingProtocolsMappingCard from '../components/ProcessingProtocolsMappingCard';
import generateId from '../utils/generateId';

export const useProcessingProtocols = () => {

    const { processingProtocols, setProcessingProtocols } = useGlobalDataContext();
    const components = {
        card: null,
        form: null,
        view: null,
        mappingCard: ProcessingProtocolsMappingCard
    };

    const addProcessingProtocol = () => {
        const newProtocol = {
            id: generateId(),
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

    return {
        items: processingProtocols || [],
        setItems: setProcessingProtocols,
        addItem: addProcessingProtocol,
        updateItem: updateProcessingProtocol,
        removeItem: removeProcessingProtocol,
        components,
    }
}

export default useProcessingProtocols;
