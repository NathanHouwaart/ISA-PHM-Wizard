// hooks/useCombinedRefs.js
import { useRef, useCallback } from 'react';

const useCombinedRefs = (...refs) => {
  return useCallback((node) => {
    refs.forEach(ref => {
      if (ref === null) return; // Ignore null refs

      // Handle function refs
      if (typeof ref === 'function') {
        ref(node);
      }
      // Handle ref objects ({ current: ... })
      else if (ref && typeof ref === 'object') {
        // Ensure it's a ref object and not just a plain object
        if ('current' in ref) {
          ref.current = node;
        }
      }
    });
  }, [...refs]); // Re-create if any of the input refs change
};

export default useCombinedRefs;