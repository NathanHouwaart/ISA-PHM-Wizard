// hooks/useCombinedRefs.js
import { useCallback, useRef } from 'react';

const useCombinedRefs = (...refs) => {
  const refsRef = useRef(refs);
  refsRef.current = refs;

  return useCallback((node) => {
    refsRef.current.forEach(ref => {
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
  }, []);
};

export default useCombinedRefs;
