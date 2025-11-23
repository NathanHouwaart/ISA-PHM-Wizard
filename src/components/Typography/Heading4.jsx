import React from 'react';
import { cn } from '../../utils/utils';

const heading4ClassName = 'text-sm font-semibold text-gray-800';

const Heading4 = ({ children, className, ...props }) => {
  return (
    <h4 className={cn(heading4ClassName, className)} {...props}>
      {children}
    </h4>
  );
};

export default Heading4;
