// PageWrapper.jsx
import React from 'react';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';

const PageWrapper = ({ children }) => {

  const { screenWidth } = useGlobalDataContext();

  return (
    <div className=" bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className='min-h-[calc(100vh-68px)] p-10'>
      <div className={`transition-all duration-300 ease-in-out ${screenWidth}`}>
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-300">
          {children}
        </div>
      </div>
    </div>
    </div >
  );
};

export default PageWrapper;