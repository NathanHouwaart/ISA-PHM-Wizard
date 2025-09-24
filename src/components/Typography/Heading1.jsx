// components/Typography/Heading1.jsx
import React from 'react';
import { cn } from '../../utils/utils';

const Heading1 = ({ children, className }) => {
  return (
    <h1 className={cn(`text-3xl font-bold text-gray-800 mb-5 pb-3 text-center border-b border-gray-300`, className)}>
      {children}
    </h1>
  );
};

export default Heading1;