import React from 'react';

/**
 * ProgressOverlay Component
 * 
 * Displays a centered progress overlay with message and percentage bar.
 * Typically used to show loading/indexing progress over a card or panel.
 * 
 * @example
 * <ProgressOverlay progress={{ percent: 65, message: 'Processing files...' }} />
 * 
 * Props:
 * - progress: { percent: number, message: string } | null - Progress data (null hides overlay)
 * - className?: string - Additional CSS classes for the overlay container
 * - data-testid?: string - Test identifier
 */
const ProgressOverlay = ({ 
  progress = null, 
  className = '',
  'data-testid': dataTestId = 'progress-overlay'
}) => {
  if (!progress) return null;

  return (
    <div 
      className={`absolute inset-0 z-10 flex items-center justify-center p-4 rounded-lg ${className}`}
      data-testid={dataTestId}
      role="status"
      aria-live="polite"
      aria-label={`${progress.message} ${progress.percent}%`}
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-lg" aria-hidden="true" />
      
      {/* Progress content */}
      <div className="relative w-3/4 max-w-md">
        <div className="text-sm text-gray-700 mb-2 text-center" data-testid={`${dataTestId}-message`}>
          {progress.message}
        </div>
        
        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-200 rounded overflow-hidden" data-testid={`${dataTestId}-bar`}>
          <div 
            className="h-full bg-indigo-600 transition-all duration-300" 
            style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
            aria-hidden="true"
          />
        </div>
        
        <div className="mt-2 text-xs text-gray-600 text-right" data-testid={`${dataTestId}-percent`}>
          {progress.percent}%
        </div>
      </div>
    </div>
  );
};

export default ProgressOverlay;
