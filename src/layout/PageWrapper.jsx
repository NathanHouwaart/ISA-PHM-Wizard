// PageWrapper.jsx
import React from 'react';

const PageWrapper = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8 flex items-center justify-center">
      <div className="w-full max-w-5xl">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-300">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageWrapper;