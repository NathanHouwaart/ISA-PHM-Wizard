// hooks/useResizeObserver.js
import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Custom hook to observe the resize of a DOM element.
 *
 * @param {Function} onResize A callback function that receives the new height.
 * @returns {React.RefObject} A ref object to attach to the DOM element you want to observe.
 */
const useResizeObserver = (onResize) => {
  const elementRef = useRef(null); // Internal ref to the element being observed

  // Memoize the onResize callback to prevent unnecessary re-runs of useEffect
  // if the parent re-renders and passes a new function reference.
  const onHeightChangeCallback = useCallback(onResize, [onResize]); // Renamed to avoid confusion

  useEffect(() => {
    const currentElement = elementRef.current;

    if (!currentElement || !onHeightChangeCallback) {
      return; // Nothing to observe or no callback
    }

    const resizeObserver = new ResizeObserver(entries => {
      // It's crucial to use the currentElement's offsetHeight here,
      // as 'entries' might not always reflect the latest computed style accurately
      // if there are multiple layout passes.
      onHeightChangeCallback(currentElement.offsetHeight);
    });

    resizeObserver.observe(currentElement);

    // Initial measurement (important for when the component first mounts)
    onHeightChangeCallback(currentElement.offsetHeight);

    // Cleanup: Disconnect the observer when the component unmounts or deps change
    return () => {
      resizeObserver.disconnect();
    };
  }, [onHeightChangeCallback]); // Re-run effect if the onResize callback changes

  return elementRef; // Return the ref to be attached to the DOM element
};

export default useResizeObserver;