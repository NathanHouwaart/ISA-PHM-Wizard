// components/Typography/Heading1.jsx
import React from 'react';

const Heading1 = ({ children }) => {
  return (
    <h1 className="text-3xl font-bold text-gray-800 mb-8 pb-4 text-center border-b border-gray-300">
      {children}
    </h1>
  );
};

export default Heading1;