// components/Typography/Heading1.jsx
import React from 'react';

import { cn } from '../../utils/utils';

const heading3ClassName             = "text-xl font-semibold text-gray-800";
const collectionCardTitleClassName  = "flex items-center justify-center mb-2";

const Heading3 = ({ children, className, ...props }) => {
  return (
    <h3 className={cn(heading3ClassName, className)} {...props}>
        {children}
    </h3>
  );
};

// export const SlidePageTitle = ({ children, className, ...props }) => {
//     return (
//         <Heading3 className={cn(SlidePageTitleClassName, className)} {...props}>
//             {children}
//         </Heading3>
//     );
// }

export default Heading3;