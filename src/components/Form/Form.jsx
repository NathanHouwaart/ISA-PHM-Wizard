import React, { useState, forwardRef, useCallback, useEffect } from 'react'

import FormField from './FormField'
import InvestigationFormFields from '../../data/InvestigationFormFields2.json'; // adjust the path as needed
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import { useQuestionnaireForm } from '../../contexts/QuestionnaireFormContext';

const Form = forwardRef(({formPageInfo, className = '', onHeightChange}, ref) => {

    const {handleInputChange} = useQuestionnaireForm()
    
    // Get the internal ref from useResizeObserver
    const elementToObserveRef = useResizeObserver(onHeightChange);

    // Combine the forwarded ref with the resize observer's ref
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    useEffect(() => {
        console.log(elementToObserveRef)
      }, [elementToObserveRef]);

    return (
        <div ref={combinedRef} className={`space-y-3 pt-1 pb-1 ${className}`}>
            {InvestigationFormFields.map((field, index) => (
                <FormField
                    key={index}
                    type={field.type}
                    label={field.label}
                    onBlur={(e) => {
                        console.log("on Blur formfield")
                        if(e?.target?.value){
                            handleInputChange(field.path + "." + field.id, e.target.value)
                        }else if(typeof(e) === "string"){
                            handleInputChange(field.path + "." + field.id, e)
                        }else{
                            handleInputChange(field.path + "." + field.id, "")
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