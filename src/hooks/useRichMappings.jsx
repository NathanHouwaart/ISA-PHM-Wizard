import { useMemo, useCallback } from 'react';

/**
 * Custom hook for managing rich mappings with multiple value types
 * Provides utilities to work with mappings that have complex value structures
 */
export const useRichMappings = (mappings, setMappings) => {
  
  // Transform legacy mapping format to rich format
  const transformToRichFormat = useCallback((mapping) => {
    if (mapping.values && typeof mapping.values === 'object') {
      return mapping; // Already in new format
    }
    
    // Convert old format to new format
    return {
      ...mapping,
      values: {
        raw: mapping.value || '',
        normalized: '',
        unit: '',
        // Add more value types as needed
        ...mapping.additionalValues
      }
    };
  }, []);

  // Get all mappings in rich format
  const richMappings = useMemo(() => {
    return mappings.map(transformToRichFormat);
  }, [mappings, transformToRichFormat]);

  // Find a specific mapping
  const findMapping = useCallback((studyId, variableId) => {
    const mapping = richMappings.find(m => 
      m.studyId === studyId && m.studyVariableId === variableId
    );
    return mapping ? transformToRichFormat(mapping) : null;
  }, [richMappings, transformToRichFormat]);

  // Get a specific value from a mapping
  const getMappingValue = useCallback((studyId, variableId, valueKey = 'raw') => {
    const mapping = findMapping(studyId, variableId);
    return mapping?.values[valueKey] || '';
  }, [findMapping]);

  // Update or create a mapping
  const updateMapping = useCallback((studyId, variableId, valueKey, newValue) => {
    console.log('updateMapping called with:', { studyId, variableId, valueKey, newValue });
    console.log('Current mappings:', mappings);
    
    const existingIndex = mappings.findIndex(m => 
      m.studyId === studyId && m.studyVariableId === variableId
    );

    console.log('Existing mapping index:', existingIndex);

    let updatedMappings;

    if (existingIndex >= 0) {
      // Update existing mapping
      updatedMappings = [...mappings];
      const existingMapping = transformToRichFormat(updatedMappings[existingIndex]);
      
      console.log('Updating existing mapping:', existingMapping);
      
      updatedMappings[existingIndex] = {
        ...existingMapping,
        values: {
          ...existingMapping.values,
          [valueKey]: newValue
        }
      };
    } else {
      // Create new mapping
      console.log('Creating new mapping');
      const newMapping = {
        studyId,
        studyVariableId: variableId,
        values: {
          raw: valueKey === 'raw' ? newValue : '',
          normalized: valueKey === 'normalized' ? newValue : '',
          unit: valueKey === 'unit' ? newValue : ''
        }
      };
      
      updatedMappings = [...mappings, newMapping];
    }

    console.log('Updated mappings:', updatedMappings);
    setMappings(updatedMappings);
  }, [mappings, setMappings, transformToRichFormat]);

  // Update multiple values at once for a mapping
  const updateMappingValues = useCallback((studyId, variableId, valuesObject) => {
    const existingIndex = mappings.findIndex(m => 
      m.studyId === studyId && m.studyVariableId === variableId
    );

    let updatedMappings;

    if (existingIndex >= 0) {
      // Update existing mapping
      updatedMappings = [...mappings];
      const existingMapping = transformToRichFormat(updatedMappings[existingIndex]);
      
      updatedMappings[existingIndex] = {
        ...existingMapping,
        values: {
          ...existingMapping.values,
          ...valuesObject
        }
      };
    } else {
      // Create new mapping
      const newMapping = {
        studyId,
        studyVariableId: variableId,
        values: {
          raw: '',
          normalized: '',
          unit: '',
          ...valuesObject
        }
      };
      
      updatedMappings = [...mappings, newMapping];
    }

    setMappings(updatedMappings);
  }, [mappings, setMappings, transformToRichFormat]);

  // Delete a mapping
  const deleteMapping = useCallback((studyId, variableId) => {
    const updatedMappings = mappings.filter(m => 
      !(m.studyId === studyId && m.studyVariableId === variableId)
    );
    setMappings(updatedMappings);
  }, [mappings, setMappings]);

  // Get all unique value keys used across all mappings
  const getAvailableValueKeys = useCallback(() => {
    const allKeys = new Set(['raw', 'normalized', 'unit']); // Default keys
    
    richMappings.forEach(mapping => {
      if (mapping.values) {
        Object.keys(mapping.values).forEach(key => allKeys.add(key));
      }
    });
    
    return Array.from(allKeys);
  }, [richMappings]);

  // Get mappings for a specific study
  const getMappingsForStudy = useCallback((studyId) => {
    return richMappings.filter(m => m.studyId === studyId);
  }, [richMappings]);

  // Get mappings for a specific variable
  const getMappingsForVariable = useCallback((variableId) => {
    return richMappings.filter(m => m.studyVariableId === variableId);
  }, [richMappings]);

  return {
    richMappings,
    findMapping,
    getMappingValue,
    updateMapping,
    updateMappingValues,
    deleteMapping,
    getAvailableValueKeys,
    getMappingsForStudy,
    getMappingsForVariable,
    transformToRichFormat
  };
};
