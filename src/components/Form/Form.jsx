import React, { useState, forwardRef } from 'react'

import FormField from './FormField'
import InvestigationFormFields from '../../data/InvestigationFormFields.json'; // adjust the path as needed

const Form = forwardRef(({formPageInfo, className = ''}, ref) => {

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

    return (
        <div ref={ref} className={`space-y-8 pt-1 ${className}`}>
            {formPageInfo.fields.map((field, index) => (
                <FormField
                    key={index}
                    type={field.type}
                    label={field.label}
                    value={formData[field.id]}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
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