import React from 'react';

// Tailwind-based full-screen loading overlay. Keeps a minimal API: only `message`.
const LoadingOverlay = ({
  message = 'Loading...',
  isError = false,
  onCancel = null,
  onRetry = null
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="bg-white/5 backdrop-blur-md rounded-lg p-6 flex flex-col items-center gap-4 max-w-xl w-full">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-white border-t-transparent animate-spin" />
          <div className="text-white text-base">{message}</div>
        </div>

        <div className="flex gap-3 mt-2">
          {isError ? (
            <>
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Retry
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
              >
                Close
              </button>
            </>
          ) : (
            onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
              >
                Cancel
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
