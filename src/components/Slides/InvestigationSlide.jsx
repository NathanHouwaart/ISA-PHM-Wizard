// src/pages/StudyPage.js
import React, { forwardRef } from 'react';

import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';

import FormField from '../Form/FormField';

import { useGlobalDataContext } from '../../contexts/GlobalDataContext';

import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle } from '../Typography/Paragraph';


export const InvestigationSlide = forwardRef(({ onHeightChange }, ref) => {

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    const { dataMap } = useGlobalDataContext();
    const [investigation, setInvestigation] = dataMap['investigation']


    function handleChange(e) {
        setInvestigation((prev) => ({
            ...prev,
            [e?.target?.name || e.target.id]: e?.target?.value || e.target.innerText    // Needed for LicensePicker, but disabled now, needs rework.
        }));
    }

    return (
        <div ref={combinedRef} >
                
                <SlidePageTitle>
                  Project Information
                </SlidePageTitle>
                
                <SlidePageSubtitle>
                    Please provide the basic information about the project.
                </SlidePageSubtitle>
                
                <div className='bg-gray-50 p-4 space-y-3 pl-10 border-gray-300 border rounded-lg'>

                    <FormField
                        name={"investigationTitle"}
                        label={"Project Title"}
                        type={"text"}
                        placeholder={"Project Title"}
                        explanation={"A title for the project."}
                        example={"Diagnostics on a test-bench X"}
                        onChange={handleChange}
                        value={investigation.investigationTitle}
                    />

                    <FormField
                        name={"investigationDescription"}
                        label={"Project Description"}
                        type={"textarea"}
                        placeholder={"Description of the project"}
                        explanation={"A short text summarising the project."}
                        example={"Measuring fault responses of bearings on test bench X using sensor Y and Z to assess sensor effectiveness."}
                        onChange={handleChange}
                        value={investigation.investigationDescription}
                    />

                    <FormField
                        name={"license"}
                        label={"License"}
                        type={"license"}
                        placeholder={"Type to search licenses..."}
                        explanation={"The license that comes with your datasaet"}
                        example={"MIT"}
                        onChange={handleChange}
                        value={investigation.license}
                    />

                    <FormField
                        name={"submissionDate"}
                        label={"Project execution / data collection date"}
                        type={"date"}
                        explanation={"The date when you are creating this investigation metadata. This represents when you entered the information in this wizard."}
                        example={"01-10-2023"}
                        onChange={handleChange}
                        value={investigation.submissionDate}
                    />

                    <FormField
                        name={"publicReleaseDate"}
                        label={"Public Release Date"}
                        type={"date"}
                        explanation={"Date when the investigation data will be or is publicly released. If not applicable, please leave empty."}
                        example={"01-10-2023"}
                        onChange={handleChange}
                        value={investigation.publicReleaseDate}
                    />

                </div>
            </div>
    );
});

InvestigationSlide.displayName = "Investigation"; // Set display name for better debugging

export default InvestigationSlide;
