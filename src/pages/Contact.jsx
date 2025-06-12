import React, { useState, useEffect } from 'react'; // Import useEffect
import classNames from 'classnames';

import "../styles.css";

// Components
import Form from '../components/Form/Form';
import AuthorsPage from '../components/Author/Author';
import IntroductionPageContent from '../components/IntroductionPageContent';
import PublicationsPage from '../components/Publication'; // Will be updated to accept authors prop

// Hooks
import useCarouselNavigation from '../hooks/useCarouselNavigation';
import useDynamicHeightContainer from '../hooks/useDynamicHeightContainer';

// Data
import InvestigationFormFields from '../data/InvestigationFormFields.json';
import initialAuthorsData from '../data/existingAuthors.json'; // Import initial authors data here

export const Contact = () => {
  const totalPages = InvestigationFormFields.pages.length;

  // Lift authors state up to Contact.jsx
  const [authors, setAuthors] = useState(initialAuthorsData);

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
  } = useDynamicHeightContainer(currentPage, 250);

  // Functions to manage authors state
  const handleAddAuthor = (authorData) => {
    setAuthors(prevAuthors => [...prevAuthors, authorData]);
  };

  const handleEditAuthor = (authorData) => {
    setAuthors(prevAuthors =>
      prevAuthors.map(author =>
        author.id === authorData.id ? authorData : author
      )
    );
  };

  const handleRemoveAuthor = (authorId) => {
    if (window.confirm('Are you sure you want to remove this author?')) {
      setAuthors(prevAuthors => prevAuthors.filter(author => author.id !== authorId));
    }
  };

  const handleSubmit = () => {
    alert('Form submitted! Check console for data.');
    // In a real application, you'd collect data from all forms here
    console.log("Current Authors Data:", authors);
    // console.log("Form Data:", formDataFromFormPage); // Example if you were collecting form data
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-300">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 pb-4 text-center border-b border-gray-300">
            ISA Questionnaire Form
          </h1>

          <div className="flex justify-center">
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

          <div className="space-y-6">
            <div
              className="relative overflow-hidden transition-all duration-300 ease-in-out"
            >
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(${translateXValue}%)` }}
              >
                {InvestigationFormFields.pages.map((page, index) => (
                  <div
                    key={index}
                    className='w-full overflow-hidden flex-shrink-0'
                  >
                    <h2 className='text-2xl font-semibold text-gray-800 flex items-center justify-center mt-10 mb-2'>
                      {page.label}
                    </h2>
                    <p className='text-center text-sm font text-gray-700 mb-10 pb-10 border-b border-gray-300'>{page.prompt}</p>
                    <div style={{ height: containerHeight, transition: 'height 0.35s' }}>
                      {page.type === "introductionPage" && (
                        <IntroductionPageContent
                          ref={el => childRefs.current[index] = el}
                          pageInfo={page}
                          onHeightChange={handleChildHeightChange}
                        />
                      )}
                      {page.type === "form" && (
                        <Form
                          ref={el => childRefs.current[index] = el}
                          formPageInfo={page}
                          onHeightChange={handleChildHeightChange}
                        />
                      )}
                      {page.type === "publications" && (
                        <PublicationsPage
                          ref={el => childRefs.current[index] = el}
                          onHeightChange={handleChildHeightChange}
                          authors={authors}
                        />
                      )}
                      {page.type === "author" && (
                        <AuthorsPage
                          ref={el => childRefs.current[index] = el}
                          onHeightChange={handleChildHeightChange}
                          authors={authors} // Pass authors to AuthorsPage
                          onAddAuthor={handleAddAuthor} // Pass add handler
                          onEditAuthor={handleEditAuthor} // Pass edit handler
                          onRemoveAuthor={handleRemoveAuthor} // Pass remove handler
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mb-4 ">
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
                className={classNames(
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
        </div>
      </div>
    </div>
  );
};