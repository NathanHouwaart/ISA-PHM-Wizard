import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

import { cn } from '../../utils/utils';

const SlideReloadOverlay = ({ isVisible, message = 'Reloading project content', className }) => {
  useEffect(() => {
    if (document.getElementById('slide-reload-progress-keyframes')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'slide-reload-progress-keyframes';
    style.textContent = `
      @keyframes slide-reload-progress {
        0% {
          transform: translateX(-120%);
        }
        100% {
          transform: translateX(120%);
        }
      }
    `;
    document.head.appendChild(style);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm text-blue-700',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium">{message}</p>
      <div className="relative mt-4 h-1.5 w-32 overflow-hidden rounded-full bg-blue-100" aria-hidden="true">
        <div className="absolute inset-y-0 w-1/2 min-w-[40%] rounded-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 [animation:slide-reload-progress_1.05s_ease-in-out_infinite]" />
      </div>
    </div>
  );
};

export default SlideReloadOverlay;
