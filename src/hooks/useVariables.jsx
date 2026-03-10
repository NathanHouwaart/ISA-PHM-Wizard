import { useMemo } from 'react';
import { useProjectActions, useProjectData } from '../contexts/GlobalDataContext';
import StudyVariableCard from '../components/StudyVariable/StudyVariableCard';
import StudyVariableForm from '../components/StudyVariable/StudyVariableForm';
import { 
    VARIABLE_TYPE_OPTIONS,
    OPERATING_CONDITION_TYPE,
    isFaultSpecification,
    isOperatingCondition
} from '../constants/variableTypes';
import generateId from '../utils/generateId';

export const useVariables = () => {
    const { studyVariables } = useProjectData();
    const { setStudyVariables } = useProjectActions();

    const addVariable = (overrideData = {}) => {
        const newVariable = {
            id: generateId(),
            name: 'New Variable',
            type: VARIABLE_TYPE_OPTIONS[0],
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

    const addFaultSpecification = () => {
        addItem({ type: VARIABLE_TYPE_OPTIONS[0] });
    };
    
    // Return a wrapped component that sets allowed types
    const FaultSpecForm = (props) => (
        <StudyVariableForm 
            {...props} 
            allowedTypes={VARIABLE_TYPE_OPTIONS.filter(t => t !== OPERATING_CONDITION_TYPE)} 
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

    const addOperatingCondition = () => {
        addItem({ type: OPERATING_CONDITION_TYPE });
    };

    // Return a wrapped component that locks the type
    const OperatingConditionForm = (props) => (
        <StudyVariableForm 
            {...props} 
            lockedType={OPERATING_CONDITION_TYPE}
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
