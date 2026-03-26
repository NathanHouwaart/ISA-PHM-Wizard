import { useMemo } from 'react';
import { useProjectActions, useProjectData } from '../contexts/GlobalDataContext';
import StudyVariableCard from '../components/StudyVariable/StudyVariableCard';
import StudyVariableForm from '../components/StudyVariable/StudyVariableForm';
import { 
    VARIABLE_TYPE_OPTIONS,
    STUDY_VARIABLE_VALUE_MODE_SCALAR,
    OPERATING_CONDITION_TYPE,
    isFaultSpecification,
    isOperatingCondition
} from '../constants/variableTypes';
import {
    FAULT_SPECIFICATION_SUGGESTIONS,
    OPERATING_CONDITION_SUGGESTIONS
} from '../constants/suggestionCatalog';
import generateId from '../utils/generateId';

export const useVariables = () => {
    const { studyVariables } = useProjectData();
    const { setStudyVariables } = useProjectActions();

    const addVariable = (overrideData = {}) => {
        const newVariable = {
            id: generateId(),
            name: 'New Variable',
            type: VARIABLE_TYPE_OPTIONS[0],
            valueMode: STUDY_VARIABLE_VALUE_MODE_SCALAR,
            unit: '',
            description: '',
            ...overrideData
        };
        setStudyVariables(prev => [...prev, newVariable]);
    };

    const updateVariable = (updatedVariable) => {
        setStudyVariables(prev => {
            const index = prev.findIndex(variable => variable.id === updatedVariable.id);
            if (index === -1) return prev;
            const next = [...prev];
            next[index] = updatedVariable;
            return next;
        });
    };

    const removeVariable = (variableId) => {
        setStudyVariables(prev => prev.filter(variable => variable.id !== variableId));
    };

    const components = {
        card: StudyVariableCard,
        form: StudyVariableForm,
        view: null,
        mappingCard: StudyVariableCard
    };

    return {
        items: studyVariables,
        setItems: setStudyVariables,
        addItem: addVariable,
        updateItem: updateVariable,
        removeItem: removeVariable,
        components,
    };
};

export const useFaultSpecifications = () => {
    const result = useVariables();
    const { items, addItem } = result;

    const filteredItems = useMemo(() => items.filter(isFaultSpecification), [items]);

    const addFaultSpecification = (overrideData = {}) => {
        addItem({
            type: overrideData.type || VARIABLE_TYPE_OPTIONS[0],
            ...overrideData
        });
    };
    
    // Return a wrapped component that sets allowed types
    const FaultSpecForm = (props) => (
        <StudyVariableForm 
            {...props} 
            allowedTypes={VARIABLE_TYPE_OPTIONS.filter(t => t !== OPERATING_CONDITION_TYPE)} 
            suggestions={FAULT_SPECIFICATION_SUGGESTIONS}
            onAddSuggestionAsNew={addFaultSpecification}
        />
    );

    return {
        ...result,
        items: filteredItems,
        addItem: addFaultSpecification,
        components: {
            ...result.components,
            form: FaultSpecForm
        },
    };
};

export const useOperatingConditions = () => {
    const result = useVariables();
    const { items, addItem } = result;

    const filteredItems = useMemo(() => items.filter(isOperatingCondition), [items]);

    const addOperatingCondition = (overrideData = {}) => {
        addItem({
            ...overrideData,
            type: OPERATING_CONDITION_TYPE
        });
    };

    // Return a wrapped component that locks the type
    const OperatingConditionForm = (props) => (
        <StudyVariableForm 
            {...props} 
            lockedType={OPERATING_CONDITION_TYPE}
            suggestions={OPERATING_CONDITION_SUGGESTIONS}
            onAddSuggestionAsNew={addOperatingCondition}
        />
    );

    return {
        ...result,
        items: filteredItems,
        addItem: addOperatingCondition,
        components: {
            ...result.components,
            form: OperatingConditionForm
        },
    };
};

export default useVariables;
