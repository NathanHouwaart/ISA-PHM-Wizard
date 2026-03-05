import Card from '../components/Contact/ContactCard';
import Form from '../components/Contact/ContactForm';
import View from '../components/Contact/ContactView';

import { useGlobalDataContext } from '../contexts/GlobalDataContext';

export const useContacts = () => {
    
    const { contacts, setContacts } = useGlobalDataContext(); // Get studies and setStudies from global context
    const addItem = (contact) => {
        if (!contact) return;
        setContacts((prev) => [...(Array.isArray(prev) ? prev : []), contact]);
    };
    const updateItem = (updatedContact) => {
        if (!updatedContact?.id) return;
        setContacts((prev) => (Array.isArray(prev) ? prev : []).map((contact) => (
            contact?.id === updatedContact.id ? updatedContact : contact
        )));
    };
    const removeItem = (contactId) => {
        if (!contactId) return;
        setContacts((prev) => (Array.isArray(prev) ? prev : []).filter((contact) => contact?.id !== contactId));
    };
    const components = {
        card: Card,
        form: Form,
        view: View,
        mappingCard: Card
    };

    return {
        items: contacts,
        setItems: setContacts,
        addItem,
        updateItem,
        removeItem,
        components,
    }
}

export default useContacts;
