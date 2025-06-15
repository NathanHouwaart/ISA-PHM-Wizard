// contexts/DynamicHeightContainerContext.js
import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import useResizeObserver from '../hooks/useResizeObserver'; // Assuming this hook is external

// Create the context
const DynamicHeightContainerContext = createContext(null);

// Custom hook to consume the context
export const useDynamicHeightContainerContext = () => {
  const context = useContext(DynamicHeightContainerContext);
  if (context === undefined) {
    throw new Error('useDynamicHeightContainerContext must be used within a DynamicHeightContainerProvider');
  }
  return context;
};

// Provider component
export const DynamicHeightContainerProvider = ({ currentPage, children }) => {
  const childRefs = useRef([]);
  const [containerHeight, setContainerHeight] = useState(250); // Initial height

  // This function will be called by children to report their height
  const handleChildHeightChange = useCallback(() => {
    // Determine the height of the current active child based on currentPage
    const currentChild = childRefs.current[currentPage];
    if (currentChild) {
      const height = currentChild.scrollHeight; // Or offsetHeight, depending on your needs
      setContainerHeight(height);
    }
  }, [currentPage]); // Re-create if currentPage changes

  // Use a useEffect to trigger height recalculation when current page changes
  useEffect(() => {
    // A small delay can help ensure components have rendered their full content
    const timeoutId = setTimeout(() => {
      handleChildHeightChange();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [currentPage, handleChildHeightChange]);

  // Provide the values to the components that consume this context
  const value = {
    containerHeight,
    handleChildHeightChange,
    childRefs, // Exposing childRefs directly can be convenient for dynamic ref assignment
  };

  return (
    <DynamicHeightContainerContext.Provider value={value}>
      {children}
    </DynamicHeightContainerContext.Provider>
  );
};