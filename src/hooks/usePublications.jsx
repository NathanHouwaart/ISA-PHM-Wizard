import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import PublicationCard from '../components/Publication/PublicationCard';
import PublicationForm from '../components/Publication/PublicationForm';

export const usePublications = () => {
    
    const { publications, setPublications } = useGlobalDataContext(); // Get studies and setStudies from global context
    const addItem = (publication) => {
        if (!publication) return;
        setPublications((prev) => [...(Array.isArray(prev) ? prev : []), publication]);
    };
    const updateItem = (updatedPublication) => {
        if (!updatedPublication?.id) return;
        setPublications((prev) => (Array.isArray(prev) ? prev : []).map((publication) => (
            publication?.id === updatedPublication.id ? updatedPublication : publication
        )));
    };
    const removeItem = (publicationId) => {
        if (!publicationId) return;
        setPublications((prev) => (Array.isArray(prev) ? prev : []).filter((publication) => publication?.id !== publicationId));
    };
    const components = {
        card: PublicationCard,
        form: PublicationForm,
        view: null,
        mappingCard: PublicationCard
    };

    return {
        items: publications,
        setItems : setPublications,
        addItem,
        updateItem,
        removeItem,
        components,
    }
}

export default usePublications;
