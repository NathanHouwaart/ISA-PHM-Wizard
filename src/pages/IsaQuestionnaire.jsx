import React, { useState, useEffect, Children } from 'react'; // Import useEffect

import "../styles.css";

// Hooks
import useCarouselNavigation from '../hooks/useCarouselNavigation';
import useDynamicHeightContainer from '../hooks/useDynamicHeightContainer';


import PageWrapper from '../layout/PageWrapper';

import { slides } from "../components/Slides/slides";
import { cn } from '../utils/utils';
import Heading1 from '../components/Typography/Heading1';

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

  const handleSubmit = () => {
    alert('Form submitted! Check console for data.');
    // In a real application, you'd collect data from all forms here
  };

  return (
    <PageWrapper>

      <Heading1> ISA Questionnaire Form </Heading1>

      <div className="flex justify-center mb-7">
        {Array.from({ length: totalPages }).map((_, index) => (
          <div
            key={index}
            onClick={() => goToPage(index)}
            className={`h-3 w-12 mx-1 rounded-full transition-colors duration-300 cursor-pointer ${index === currentPage
              ? 'bg-blue-500'
              : index < currentPage
                ? 'bg-green-400'
                : 'bg-gray-300'
              }`}
          />
        ))}
      </div>

      <div className="space-y-10">
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
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between  mb-4 ">
          <button
            type="button"
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 shadow-lg hover:shadow-xl"
            onClick={handlePrevious}
            disabled={currentPage === 0}
          >
            <span>&lt;</span>
            <span>Previous</span>
          </button>

          <button
            type="button"
            className="flex items-center space-x-2 min-w-1rem px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 shadow-lg hover:shadow-xl"
            onClick={handleForward}
            disabled={currentPage === totalPages - 1}
          >
            <span>Next</span>
            <span>&gt;</span>
          </button>
        </div>

        <div className="pt-6">
          <button
            type="button"
            onClick={handleSubmit}
            className={cn(
              "w-full py-4 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg",
              {
                "bg-gradient-to-r from-gray-500 to-gray-500 cursor-not-allowed": !isLastPage(currentPage),
                "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-4 focus:ring-blue-200 hover:shadow-xl": isLastPage(currentPage),
              }
            )}
            disabled={!isLastPage(currentPage)}
          >
            Submit Form
          </button>
        </div>
      </div>
    </PageWrapper>
  );
};