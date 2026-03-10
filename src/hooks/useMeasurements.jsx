import { useProjectActions } from '../contexts/GlobalDataContext';
import StudyMeasurementMappingCard from '../components/StudyMeasurementMappingCard';
import useStudyRuns from './useStudyRuns';

export const useMeasurements = () => {
    
    const { setStudies } = useProjectActions(); // Keep setter for compatibility if needed
    const studyRuns = useStudyRuns();
    const components = {
        card: null,
        form: null,
        view: null,
        mappingCard: StudyMeasurementMappingCard
    };
    
    const addVariable = () => {
        return null;
    }

    const updateVariable = (_updatedVariable) => {
        return null;
    }

    const removeVariable = (_variableId) => {
        return null;
    }

    return {
        items: studyRuns,
        setItems : setStudies,
        addItem : addVariable,
        updateItem : updateVariable,
        removeItem : removeVariable,
        components,
    }
}

export default useMeasurements;
