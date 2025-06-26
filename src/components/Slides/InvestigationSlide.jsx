// src/pages/StudyPage.js
import React, { useEffect, useState, forwardRef } from 'react';
import { Switch } from '../ui/switch';

// Import the single global provider

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

import investigationFormFields from '../../data/InvestigationFormFields2.json'
import FormField from '../Form/FormField';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';

export const InvestigationSlide = forwardRef(({ onHeightChange }, ref) => {

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    const { dataMap } = useGlobalDataContext();
    const [investigation, setInvestigation] = dataMap['investigations']

    useEffect(() => {
        const initialFormState = investigationFormFields.fields.reduce((acc, field) => {
            acc[field.id] = ''; // Initialize each field with an empty string
            return acc;
        }, {});

        setInvestigation(initialFormState)
    }, [])

    function handleChange(e) {
        setInvestigation((prev) => ({
            ...prev,
            [e?.target?.name || e.target.id]: e?.target?.value || e.target.innerText    // Needed for LicensePicker, but disabled now, needs rework.
        }));
    }

    return (
        <div ref={combinedRef} >
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <h2 className='text-2xl font-semibold text-gray-800 flex items-center justify-center mt-7 mb-2'>
                  {investigationFormFields.pageTitle}
                </h2>
                <p className='text-center text-sm font text-gray-700 mb-7 pb-7 border-b border-gray-300'>{investigationFormFields.pageUnderTitle}</p>
                <div className='bg-gray-50 p-4 border-gray-300 border rounded-lg'>
                    {investigationFormFields.fields.map((item, index) => (
                        <FormField
                            key={index}
                            name={item.id}
                            label={item.label}
                            type={item.type}
                            placeholder={item.placeholder}
                            explanation={item.explanation}
                            example={item.example}
                            onChange={handleChange}
                            value={investigation[item.id]}
                        />
                    ))}
                    </div>
                </div>
            </div>
    );
});
