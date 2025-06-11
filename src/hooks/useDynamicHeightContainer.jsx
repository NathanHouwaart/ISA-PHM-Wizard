// hooks/useDynamicHeightContainer.js
import { useState, useEffect, useRef, useCallback } from 'react';
import useResizeObserver from './useResizeObserver'; // Assuming useResizeObserver is in the same 'hooks' directory

/**
 * Manages the dynamic height of a container based on its active child.
 *
 * @returns {{
 * containerHeight: string,
 * childRefs: React.MutableRefObject<Array<HTMLElement | null>>,
 * handleChildHeightChange: (height: number) => void,
 * updateContainerHeightManually: (index: number) => void // Function to manually trigger height update (e.g., on page change)
 * }}
 */
const useDynamicHeightContainer = (currentPage) => {
  const childRefs = useRef([]); // A ref array to hold references to each child element
  const [containerHeight, setContainerHeight] = useState('auto');

  // Callback for child components to report their height changes (e.g., from their internal ResizeObserver)
  const handleChildHeightChange = useCallback((height) => {
    // Only update if the height reported is from the CURRENTLY active child
    // This prevents off-screen components from dictating the height
    if (childRefs.current[currentPage] && childRefs.current[currentPage].offsetHeight === height) {
      setContainerHeight(height + 'px');
    }
  }, [currentPage]);

  // Effect to adjust height when currentPage changes (e.g., navigation)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (childRefs.current[currentPage]) {
        const newHeight = childRefs.current[currentPage].offsetHeight;
        setContainerHeight(newHeight + 'px');
      }
    }, 50); // Small delay to ensure rendering and measurement after page switch

    return () => clearTimeout(timeoutId);
  }, [currentPage]); // Dependency: re-run whenever currentPage changes

  // Expose a function to manually trigger a height update if needed
  const updateContainerHeightManually = useCallback((index = currentPage) => {
    if (childRefs.current[index]) {
      setContainerHeight(childRefs.current[index].offsetHeight + 'px');
    }
  }, [currentPage]);

  return {
    containerHeight,
    childRefs,
    handleChildHeightChange,
    updateContainerHeightManually,
  };
};

export default useDynamicHeightContainer;