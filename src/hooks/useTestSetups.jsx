import React from 'react';

import Card from '../components/TestSetup/TestSetupCard';
import Form from '../components/TestSetup/TestSetupForm';
import View from '../components/TestSetup/TestSetupView';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import { hasContentChanged } from '../utils/testSetupUtils';

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
                return next.map((setup) => {
                    // If setup is new (no matching id in prev), ensure version fields
                    const existing = prev.find(p => p.id === setup.id);
                    
                    if (!existing) {
                        // New setup - ensure it has version fields
                        return ensureVersionFields(setup);
                    }
                    
                    // If setup exists and content changed (excluding version fields), increment version
                    if (hasContentChanged(existing, setup)) {
                        return incrementVersion(setup);
                    }
                    
                    // No content change - preserve existing version fields
                    return {
                        ...setup,
                        version: existing.version,
                        lastModified: existing.lastModified
                    };
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