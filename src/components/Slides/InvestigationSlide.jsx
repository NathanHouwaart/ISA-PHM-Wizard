// src/pages/StudyPage.js
import React, { useEffect, useState, forwardRef } from 'react';
import { Switch } from '../ui/switch';

// Import the single global provider

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

import investigationFormFields from '../../data/InvestigationFormFields2.json'
import FormField from '../Form/FormField';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';

import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';


export const InvestigationSlide = forwardRef(({ onHeightChange }, ref) => {

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    const { dataMap } = useGlobalDataContext();
    const [investigation, setInvestigation] = dataMap['investigations']


    function handleChange(e) {
        setInvestigation((prev) => ({
            ...prev,
            [e?.target?.name || e.target.id]: e?.target?.value || e.target.innerText    // Needed for LicensePicker, but disabled now, needs rework.
        }));
    }

    return (
        <div ref={combinedRef} >
                
                <SlidePageTitle>
                  {investigationFormFields.pageTitle}
                </SlidePageTitle>
                
                <SlidePageSubtitle>
                    {investigationFormFields.pageSubtitle}
                </SlidePageSubtitle>
                
                <div className='bg-gray-50 p-4 space-y-3 pl-10 border-gray-300 border rounded-lg'>
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
    );
});

export default InvestigationSlide;
