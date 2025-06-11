import React, { useState, forwardRef, useCallback, useEffect } from 'react'

import FormField from './FormField'
import InvestigationFormFields from '../../data/InvestigationFormFields.json'; // adjust the path as needed
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

const Form = forwardRef(({formPageInfo, className = '', onHeightChange}, ref) => {

    const [formData, setFormData] = useState(() => {
        return formPageInfo.fields.reduce((acc, field) => {
          acc[field.id] = '';
          return acc;
        }, {});
      });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Get the internal ref from useResizeObserver
    const elementToObserveRef = useResizeObserver(onHeightChange);

    // Combine the forwarded ref with the resize observer's ref
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    useEffect(() => {
        console.log(elementToObserveRef)
      }, [elementToObserveRef]);

    return (
        <div ref={combinedRef} className={`space-y-3 pt-1 pb-1 ${className}`}>
            {formPageInfo.fields.map((field, index) => (
                <FormField
                    key={index}
                    type={field.type}
                    label={field.label}
                    value={formData[field.id]}
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
                    onHeightChange={onHeightChange}
                />
            ))}
        </div>
    )
})

export default Form