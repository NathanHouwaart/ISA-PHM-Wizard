import React from 'react';

import Card from '../components/TestSetup/TestSetupCard';
import Form from '../components/TestSetup/TestSetupForm';
import View from '../components/TestSetup/TestSetupView';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';

// Helper to ensure test setup has version tracking fields
const ensureVersionFields = (setup) => {
    if (!setup) return setup;
    return {
        ...setup,
        version: setup.version ?? 1,
        lastModified: setup.lastModified ?? Date.now()
    };
};

// Helper to increment version on update
const incrementVersion = (setup) => {
    return {
        ...setup,
        version: (setup.version ?? 0) + 1,
        lastModified: Date.now()
    };
};

export const useTestSetups = () => {

    const { testSetups, setTestSetups: setTestSetupsRaw } = useGlobalDataContext();
    
    // Wrap setTestSetups to auto-increment version on updates
    const setTestSetups = (updater) => {
        setTestSetupsRaw((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            
            // If next is an array, process each item
            if (Array.isArray(next)) {
                return next.map((setup, index) => {
                    const prevSetup = prev[index];
                    
                    // If setup is new (no matching id in prev), ensure version fields
                    if (!prev.find(p => p.id === setup.id)) {
                        return ensureVersionFields(setup);
                    }
                    
                    // If setup exists and content changed, increment version
                    const existing = prev.find(p => p.id === setup.id);
                    if (existing && JSON.stringify(existing) !== JSON.stringify(setup)) {
                        return incrementVersion(setup);
                    }
                    
                    // No change - return as is (already has version fields from migration)
                    return setup;
                });
            }
            
            return next;
        });
    };
    
    const getCard = () => {
        return Card;
    }

    const getForm = () => {
        return Form;
    }

    const getView = () => {
        return null;
    }

    return {
        items: testSetups,
        setItems: setTestSetups,
        getCard,
        getForm,
        getView
    }
}

export default useTestSetups;