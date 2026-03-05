import Card from '../components/Study/StudyCard';
import Form from '../components/Study/StudyForm';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';


export const useStudies = () => {
    
    const { studies, setStudies } = useGlobalDataContext(); // Get studies and setStudies from global context
    const addItem = (study) => {
        if (!study) return;
        setStudies((prev) => [...(Array.isArray(prev) ? prev : []), study]);
    };
    const updateItem = (updatedStudy) => {
        if (!updatedStudy?.id) return;
        setStudies((prev) => (Array.isArray(prev) ? prev : []).map((study) => (
            study?.id === updatedStudy.id ? updatedStudy : study
        )));
    };
    const removeItem = (studyId) => {
        if (!studyId) return;
        setStudies((prev) => (Array.isArray(prev) ? prev : []).filter((study) => study?.id !== studyId));
    };
    const components = {
        card: Card,
        form: Form,
        view: null,
        mappingCard: Card
    };

    return {
        items: studies,
        setItems: setStudies,
        addItem,
        updateItem,
        removeItem,
        components,
    }
}

export default useStudies;
