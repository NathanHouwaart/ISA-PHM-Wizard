// Input.jsx
import React from 'react';
import { cn } from '../../utils/utils';

const baseClasses = "flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-250 bg-gray-50 focus:bg-white outline-none";

export const FormFieldLabel = ({className = '', children}) =>{
    return (
        <label className={cn(className)}>{children}</label>
    );
};

export const BaseInput = ({ className = '', ...props }) => {
    return (
        <input
            className={cn(baseClasses, className)}
            {...props}
        />
    );
};

export const BaseTextarea = ({ className = '', ...props }) => {
    return (
        <textarea
            className={cn(baseClasses, "resize-vertical", className)}
            {...props}
        />
    );
};

export const BaseSelect = ({ className = '', children, ...props }) => {
    return (
        <select
            className={cn(baseClasses, className)}
            {...props}
        >
            {children}
        </select>
    );
};


export const FormField2 = ({ children }) => {
  return (
    <div className="mb-4"> {/* Margin-bottom for spacing between form fields */}
      {children}
    </div>
  );
};