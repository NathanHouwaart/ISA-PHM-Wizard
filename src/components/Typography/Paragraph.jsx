import React from 'react';
import { cn } from '../../utils/utils';

/* Class names for styling */
const paragraphClassName          = "text-sm text-gray-700"
const SlidePageSubtitleClassName  = "text-center mb-7 pb-7 border-b border-gray-300 px-7";
const CardParagraphClassName      = "text-gray-600";

/* This component is used to render paragraphs in slides */
const Paragraph = ({ children, className, ...props }) => {
  return (
    <p className={cn(paragraphClassName, className)} {...props}>
        {children}
    </p>
  );
};

/* This component is used to render subtitles in slides
   It extends the Paragraph component with additional styling */
export const SlidePageSubtitle = ({ children, className, ...props }) => {
    return (
        <Paragraph className={cn(SlidePageSubtitleClassName, className)} {...props}>
            {children}
        </Paragraph>
    );
}


export const CardParagraph = ({ children, className, ...props }) => {
    return (
        <Paragraph className={cn(CardParagraphClassName, className)} {...props}>
            {children}
        </Paragraph>
    );
}

export default Paragraph;