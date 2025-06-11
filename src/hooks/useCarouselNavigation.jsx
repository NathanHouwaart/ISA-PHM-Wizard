// hooks/useCarouselNavigation.js
import { useState, useCallback } from 'react';

const useCarouselNavigation = (totalSteps) => {
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed for array access

  const handleForward = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  const handlePrevious = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 0));
  }, []);

  const goToPage = useCallback((pageIndex) => {
    setCurrentPage(Math.min(Math.max(pageIndex, 0), totalSteps - 1));
  }, [totalSteps]);

  // Calculate the CSS transform value
  const translateXValue = currentPage * -100;

  return {
    currentPage,
    totalPages: totalSteps,
    translateXValue,
    handleForward,
    handlePrevious,
    goToPage,
  };
};

export default useCarouselNavigation;