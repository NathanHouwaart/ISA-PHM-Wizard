import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Manages the dynamic height of a container based on its active child,
 * ensuring a minimum height.
 *
 * @param {number} currentPage The current active page index.
 * @param {number} [minHeight=200] The minimum height for the container in pixels. Defaults to 200.
 */
const useDynamicHeightContainer = (currentPage = 0, minHeight = 200) => { // MIN_HEIGHT is now a parameter
  const childRefs = useRef([]);
  const [containerHeight, setContainerHeight] = useState('auto');

  // Helper function to apply the minimum height logic
  const applyMinHeight = useCallback((height) => {
    // Ensure the height is never less than minHeight
    return Math.max(height, minHeight) + 'px';
  }, [minHeight]); // Dependency on the minHeight parameter

  // Callback for child components to report their height changes
  const handleChildHeightChange = useCallback((height) => {
    if (childRefs.current[currentPage] && childRefs.current[currentPage].offsetHeight === height) {
       setContainerHeight(applyMinHeight(height));
    }
  }, [currentPage, applyMinHeight]);

  // Effect to adjust height when currentPage changes (e.g., navigation)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (childRefs.current[currentPage]) {
        const newHeight = childRefs.current[currentPage].offsetHeight;
        setContainerHeight(applyMinHeight(newHeight));
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [currentPage, applyMinHeight]);

  // Expose a function to manually trigger a height update if needed
  const updateContainerHeightManually = useCallback((index = currentPage) => {
    if (childRefs.current[index]) {
      setContainerHeight(applyMinHeight(childRefs.current[index].offsetHeight));
    }
  }, [currentPage, applyMinHeight]);

  return {
    containerHeight,
    childRefs,
    handleChildHeightChange,
    updateContainerHeightManually,
  };
};

export default useDynamicHeightContainer;