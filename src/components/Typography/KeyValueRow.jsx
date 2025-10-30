import React from 'react';

/**
 * KeyValueRow Component
 * 
 * Displays a key-value pair in a consistent grid layout.
 * Commonly used for displaying metadata or properties in a structured way.
 * 
 * @example
 * <KeyValueRow label="Dataset" value="My Dataset" />
 * <KeyValueRow label="Status" value={<span className="text-green-600">Active</span>} />
 * 
 * Props:
 * - label: string - The key/label text
 * - value: string | React.ReactNode - The value to display (can be string or JSX)
 * - loading?: boolean - Whether to show a loading spinner instead of value
 * - className?: string - Additional CSS classes for the container
 * - labelClassName?: string - Additional CSS classes for the label
 * - valueClassName?: string - Additional CSS classes for the value
 * - data-testid?: string - Test identifier
 */
const KeyValueRow = ({
  label,
  value,
  loading = false,
  className = '',
  labelClassName = '',
  valueClassName = '',
  'data-testid': dataTestId = 'key-value-row',
}) => {
  return (
    <div 
      className={`grid grid-cols-12 gap-x-5 items-center ${className}`}
      data-testid={dataTestId}
    >
      <div 
        className={`col-span-3 text-sm font-medium text-gray-600 ${labelClassName}`}
        data-testid={`${dataTestId}-label`}
      >
        {label}:
      </div>
      <div 
        className={`col-span-9 text-sm text-gray-700 ${valueClassName}`}
        data-testid={`${dataTestId}-value`}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2 text-sm text-indigo-600">
            <svg 
              className="animate-spin h-4 w-4" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span>Loading...</span>
            <span className="sr-only">Loading {label}</span>
          </span>
        ) : (
          value
        )}
      </div>
    </div>
  );
};

export default KeyValueRow;
