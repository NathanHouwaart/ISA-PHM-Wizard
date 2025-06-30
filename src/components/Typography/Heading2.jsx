// components/Typography/Heading1.jsx
import React from 'react';

import { cn } from '../../utils/utils';

const heading2ClassName       = "text-2xl font-semibold text-gray-800";
const SlidePageTitleClassName = "flex items-center justify-center mb-2";

const Heading2 = ({ children, className, ...props }) => {
  return (
    <h2 className={cn(heading2ClassName, className)} {...props}>
        {children}
    </h2>
  );
};

export const SlidePageTitle = ({ children, className, ...props }) => {
    return (
        <Heading2 className={cn(SlidePageTitleClassName, className)} {...props}>
            {children}
        </Heading2>
    );
}

export default Heading2;