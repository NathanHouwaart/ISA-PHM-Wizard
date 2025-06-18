// components/Typography/Paragraph.jsx
import React from 'react';
import { cn } from '../../utils/utils';

const classNames = "text-center text-md font text-gray-700"

const Paragraph = ({ className = "", children }) => {
  return (
    <p className={cn(
        className,
        classNames
    )} >
      {children}
    </p>
  );
};

export default Paragraph;