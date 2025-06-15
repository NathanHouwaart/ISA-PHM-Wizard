// contexts/QuestionnaireFormContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';
import { produce } from 'immer'; // Ensure immer is installed and imported: npm install immer
import InvestigationFormFields from '../data/InvestigationFormFields.json'; // Verify path
import initialAuthorsData from '../data/existingAuthors.json';       // Import existing authors data
import initialPublicationsData from '../data/existingPublications.json'; // Import existing publications data

import InvestigationFormFields2 from '../data/InvestigationFormFields2.json'; // Verify path
import { useImmer } from 'use-immer';


const QuestionnaireFormContext = createContext(null);

export const useQuestionnaireForm = () => {
    const context = useContext(QuestionnaireFormContext);
    if (context === undefined) {
        throw new Error('useQuestionnaireForm must be used within a QuestionnaireFormProvider');
    }
    return context;
};


export const QuestionnaireFormProvider = ({ children }) => {

    // --- NEW: Initialize the formData structure based on your desired snippet and JSON paths ---
    const getInitialFormData = () => {
        
        const nestedData = {};

        InvestigationFormFields2.forEach(item => {
                const pathParts = item.path.split('.');
                const itemId = item.id;

                // Use reduce to navigate or create nested objects
                const targetObject = pathParts.reduce((acc, part, index) => {
                    if (index === pathParts.length - 1) {
                        // If the item's ID is different from the last path part,
                        // it means the last path part is a *container* for the item.
                        if (itemId !== part) {
                            acc[part] = acc[part] || {}; // Ensure the container exists
                            return acc[part]; // Return the container to add the field to it
                        }
                    }

                    acc[part] = acc[part] || {}; // Ensure the nested object exists
                    return acc[part]; // Move to the next level
                }, nestedData);

                // Add the field directly to the targetObject determined by the reduce
                targetObject[itemId] = ""
            });
        nestedData.Investigation.InvestigationIdentifier = "test"
        console.log("nested data:", nestedData)
        return nestedData;
    };

    // Helper function to get a value from the nested structure using a path
    const getNestedValue = (path) => {
        // Split the path string into an array of parts (e.g., "Investigation.Studies.Assays.AssayName.value" becomes ["Investigation", "Studies", "Assays", "AssayName", "value"])
        const pathParts = path.split('.');

        // Use the reduce method to safely traverse the object
        // acc (accumulator) starts as the initial object (obj)
        // part is the current segment of the path (e.g., "Investigation", then "Studies", etc.)
        return pathParts.reduce((acc, part) => {
            // Check if the current accumulator (acc) is not null or undefined,
            // and if it has the current 'part' as a property.
            // If both conditions are true, move to the next level (acc[part]).
            // Otherwise, return undefined (or null, depending on desired behavior)
            // to stop the traversal and indicate that the path doesn't exist.
            return (acc && acc[part] !== undefined) ? acc[part] : undefined;
        }, formData); // The initial value for the accumulator is the 'obj' provided to the function
    };

    const [formData, setFormData] = useImmer(getInitialFormData);

    // --- `handleInputChange` function for nested data, using Immer ---
    const handleInputChange = (path, value) => {
        setFormData(draft => {
            const pathParts = path.split('.');
            let current = draft;

            for (let i = 0; i < pathParts.length - 1; i++) {
                const part = pathParts[i];
                if (typeof current[part] !== 'object' || current[part] === null) {
                    current[part] = {};
                }
                current = current[part];
            }

            const lastPart = pathParts[pathParts.length - 1];
            current[lastPart] = value;
        });
    }


    // The value provided by the context
    const value = {
        formData,
        handleInputChange,
        getNestedValue
    };

    return (
        <QuestionnaireFormContext.Provider value={value}>
            {children}
        </QuestionnaireFormContext.Provider>
    );
};