import React, { useState, forwardRef, useCallback, useEffect } from 'react'

import FormField from './FormField'
import InvestigationFormFields from '../../data/InvestigationFormFields2.json'; // adjust the path as needed
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import { useQuestionnaireForm } from '../../contexts/QuestionnaireFormContext';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';

const Form = forwardRef(({formIdentifier, formPageInfo, className = '', onHeightChange}, ref) => {


    // const {handleInputChange} = useQuestionnaireForm()
    const { dataMap } = useGlobalDataContext();
    console.log(formIdentifier)
    console.log(dataMap)
    const [globalData, setGlobalData] = dataMap[formIdentifier] || [[], () => {}];


    const [formData, setFormData] = useState(() => {
        return formPageInfo.fields.reduce((acc, field) => {
            acc[field.id] = '';
            return acc;
        }, {});
        });

    const handleInputChange = (field, value) => {
        console.log("HANDLE")
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        setGlobalData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    useEffect(() => {
        console.log("globaldata: ", globalData)
    }, [globalData])

    // Get the internal ref from useResizeObserver
        
    // Combine the forwarded ref with the resize observer's ref
    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    return (
        <div ref={combinedRef} className={`space-y-3 pt-1 pb-1 ${className}`}>
            {InvestigationFormFields.map((field, index) => (
                <FormField
                    key={index}
                    type={field.type}
                    label={field.label}
                    onChange={(e) => {
                        if(e?.target?.value){
                            handleInputChange(field.id, e.target.value)
                        }else if(typeof(e) === "string"){
                            handleInputChange(field.id, e)
                        }else{
                            handleInputChange(field.id, "")
                        }
                    }}
                    explanation={field.explanation}
                    example={field.example}
                    placeholder={field.placeholder}
                    rows={field.rows || 3} // default to 3 rows for textarea
                />
            ))}
        </div>
    )
})

export default Form