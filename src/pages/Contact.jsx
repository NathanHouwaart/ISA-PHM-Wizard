import React, { useState, useEffect, forwardRef, useRef, useCallback } from 'react';

import "../styles.css"

import SingleLineInput from '../components/Form/FormField';
import Form from '../components/Form/Form';

import InvestigationFormFields from '../data/InvestigationFormFields.json';
import Author from '../components/Author/Author';


export const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    birthDate: '',
    bio: '',
    newsletter: false,
    children: [{ name: '', age: '' }],
    investigation: ''
  });

  const [currentPage, setCurrentPage] = useState(0);
  const pageRefs = useRef([]);
  const [containerHeight, setContainerHeight] = useState('auto'); // State for the container's height
  const totalPages = InvestigationFormFields.pages.length;

  // Effect to measure content height and update container height
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Access the specific step's DOM node via stepRefs.current[index]
      console.log(pageRefs)
      if (pageRefs.current[currentPage]) {
        console.log("Setting height to:", pageRefs.current[currentPage].offsetHeight, "px")
        setContainerHeight(pageRefs.current[currentPage].offsetHeight + 'px');
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [currentPage]);

  const handleChildHeightChange = useCallback((height) => {
    // Only update if the height reported is from the CURRENTLY active step
    // This prevents off-screen components from dictating the height
    if (pageRefs.current[currentPage] ) {
       setContainerHeight(height + 'px');
    }
  }, [currentPage]); // Crucially, re-create if currentStep changes so it checks against the active step


  const handleSubmit = () => {
    console.log('Form Data:', formData);
    alert('Form submitted! Check console for data.');
  };

  const handleForwardClick = () => {
    if (currentPage >= totalPages - 1) return; // Prevent going beyond last page
    setCurrentPage(prev => prev + 1);
  }
  
  const handlePreviousClick = () => {
    if (currentPage <= 0) return; // Prevent going below page 1
    setCurrentPage(prev => prev - 1);
  }


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
                onClick={() => setCurrentPage(index)}
                
                className={`h-3 w-12 mx-1 rounded-full transition-colors duration-300 cursor-pointer ${
                  index === currentPage
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
              style={{ transform: `translateX(-${currentPage * 100}%)` }}
            >

          
            {/*label, value, placeholder, required, tooltip  */}
            { InvestigationFormFields.pages.map((page, index) => (
              <div key={index}
                className='w-full overflow-hidden flex-shrink-0 '>
                <h2 className='text-2xl font-semibold text-gray-800 flex items-center justify-center mt-10 mb-2'>
                  {page.label}
                </h2>
                <p className='text-center text-sm font text-gray-700 mb-10 pb-10 border-b border-gray-300'>{page.prompt}</p>
                <div 
                  style={{ height: containerHeight, transition: 'height 0.35s ease-in-out'}}
                >
                  {page.type == "form" && <Form ref={el => pageRefs.current[0] = el} formPageInfo={page}/> }
                  {page.type == "author" && <Author ref={el => pageRefs.current[1] = el} onHeightChange={handleChildHeightChange} />}
                </div>
              </div>
            ))}

            
            </div>
            </div>
            <div className="flex items-center justify-between mb-4 "> 
              <button
                type="button"
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 shadow-lg hover:shadow-xl"
                onClick={handlePreviousClick}
              >
                <span>&lt;</span>
                <span>Previous</span>
              </button>

              <button
              type="button"
              className="flex items-center space-x-2 min-w-1rem px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 shadow-lg hover:shadow-xl"
              onClick={handleForwardClick}
              >
              <span>Next</span>
              <span>&gt;</span>
            </button>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 shadow-lg hover:shadow-xl"
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
