import React, { useState, useEffect, Children } from 'react'; // Import useEffect

import "../styles.css";

// Hooks
import useCarouselNavigation from '../hooks/useCarouselNavigation';
import useDynamicHeightContainer from '../hooks/useDynamicHeightContainer';


import PageWrapper from '../layout/PageWrapper';

import { slides } from "../components/Slides/slides";
import { cn } from '../utils/utils';
import Heading1 from '../components/Typography/Heading1';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import TooltipButton from '../components/Widgets/TooltipButton';

export const IsaQuestionnaire = () => {
  const totalPages = slides.length;

  const {
    currentPage,
    handleForward,
    handlePrevious,
    goToPage,
    isLastPage,
    translateXValue,
  } = useCarouselNavigation(totalPages);

  const {
    containerHeight,
    childRefs,
    handleChildHeightChange,
  } = useDynamicHeightContainer(currentPage, 400);

  const {submitData} = useGlobalDataContext();

  const handleSubmit = () => {
    // In a real application, you'd collect data from all forms here
    submitData();
    alert('Form submitted! Check console for data. Download should start automatically.');
  };

  return (
    <PageWrapper>

      <Heading1> ISA Questionnaire Form </Heading1>

      <div className="flex justify-center mb-5">
        {slides.map((slide, index) => (
          <TooltipButton
            key={index}
            tooltipText={`${slide.displayName} slide`}
            onClick={() => goToPage(index)}
            className={cn(
              "h-2 p-1.5 w-12 mx-1 rounded-full transition-colors duration-300 cursor-pointer",
              index === currentPage
                ? 'bg-blue-500'
                : index < currentPage
                  ? 'bg-green-400'
                  : 'bg-gray-300'
            )}
          />
        ))}
      </div>

      <div className="space-y-6">
        <div
          className="relative overflow-hidden transition-all duration-300 ease-in-out"
        >
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(${translateXValue}%)` }}
          >
            {slides.map((slide, index) => {
              const SlideComponent = slide;
              return (
                <div key={index} className='w-full overflow-hidden flex-shrink-0'>
                  <div style={{ height: containerHeight, transition: 'height 0.35s' }}>
                    <SlideComponent
                      ref={el => childRefs.current[index] = el}
                      onHeightChange={handleChildHeightChange}
                      currentPage={currentPage}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center space-x-4 mx-5">
          <TooltipButton
            onClick={handlePrevious}
            tooltipText="Go to previous page"
            className={`text-center text-white font-semibold `}
          >
            <span className='w-30'>&lt; Previous</span>
          </TooltipButton>
        

           <TooltipButton
            tooltipText="Submit the form"
            onClick={handleSubmit}
            className={cn(
              "py-2 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg",
              {
                "bg-gradient-to-r from-gray-500 to-gray-500 cursor-not-allowed pointer-events-none": !isLastPage(currentPage),
                "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-4 focus:ring-blue-200 hover:shadow-xl": isLastPage(currentPage),
              }
            )}
            disabled={!isLastPage(currentPage)}
          >
            <span className='w-md'>Submit Form</span>
          </TooltipButton>

        <TooltipButton
            onClick={handleForward}
            tooltipText="Go to next page"
            className={`text-white font-semibold `}
          >
            <span className='w-30'>Next &gt;</span>
          </TooltipButton>
        </div>
      </div>
    </PageWrapper>
  );
};