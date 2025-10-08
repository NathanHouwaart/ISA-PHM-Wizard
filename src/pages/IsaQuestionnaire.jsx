import React, { useEffect, useRef, useState } from 'react'; // Import useEffect

import "../styles.css";

// Hooks
import useCarouselNavigation from '../hooks/useCarouselNavigation';
import useDynamicHeightContainer from '../hooks/useDynamicHeightContainer';


import PageWrapper from '../layout/PageWrapper';
import { useLocation } from 'react-router-dom';

import { slides } from "../components/Slides/slides";
import SlideReloadOverlay from '../components/Slides/SlideReloadOverlay';
import { cn } from '../utils/utils';
import Heading1 from '../components/Typography/Heading1';
// ProjectSelector removed in favor of the single 'Change Project' button in the header
import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import useSubmitData from '../hooks/useSubmitData';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import TooltipButton from '../components/Widgets/TooltipButton';
import IconToolTipButton from '../components/Widgets/IconTooltipButton';
import { Layers } from 'lucide-react';
import InAppExplorer from '../components/Widgets/InAppExplorer';
import ProjectSessionsModal from '../components/Widgets/ProjectSessionsModal';
import Heading3 from '../components/Typography/Heading3';

export const IsaQuestionnaire = () => {
  const totalPages = slides.length;

  const {
    currentPage,
    handleForward,
    handlePrevious,
    goToPage,
    isLastPage,
    translateXValue,
  } = useCarouselNavigation(totalPages);

  const {
    containerHeight,
    childRefs,
    handleChildHeightChange,
  } = useDynamicHeightContainer(currentPage, 400);

  const { setScreenWidth, pageTabStates, explorerOpen, closeExplorer, resolveExplorerSelection, currentProjectId, projects } = useGlobalDataContext();
  const { submitData, isSubmitting, message, error, cancel, retry, clearError } = useSubmitData();

  // Overlay state management - all overlays follow the same conditional rendering pattern
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [isRemountingSlides, setIsRemountingSlides] = useState(false);
  const [slidesKey, setSlidesKey] = useState(() => currentProjectId ? `slides-${currentProjectId}-${Date.now()}` : 'slides-none');
  const hasInitializedProjectRef = useRef(false);
  const overlayTimeoutRef = useRef(null);
  const keyUpdateTimeoutRef = useRef(null);
  const MIN_OVERLAY_DURATION = 700;
  
  // Handler: Close project sessions modal
  const handleSessionsModalClose = () => {
    setShowSessionsModal(false);
  };
  
  // Handler: Close explorer (cancel = resolve with null)
  const handleExplorerClose = () => {
    resolveExplorerSelection(null);
  };

  // Handler: Confirm explorer selection
  const handleExplorerSelect = (files) => {
    resolveExplorerSelection(files);
  };

  // Always show the sessions modal when navigating to this route so the user can pick a project.
  // This makes the selection explicit on every visit (reload or client-side navigation).
  const location = useLocation();
  useEffect(() => {
    setShowSessionsModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Set screen width based on persisted tab state for the active page. If the
  // persisted tab for the current page is 'grid-view' we'll open a wider layout
  // immediately (fixes the reload-then-navigate case). Otherwise fall back to
  // the standard max-w-5xl.
  useEffect(() => {
    const activeTab = pageTabStates?.[currentPage];
    if (activeTab === 'grid-view') {
      setScreenWidth('max-w-[100rem]');
    } else {
      setScreenWidth('max-w-5xl');
    }
  }, [currentPage, pageTabStates, setScreenWidth]);

  useEffect(() => {
    if (!currentProjectId) {
      return;
    }

    if (!hasInitializedProjectRef.current) {
      hasInitializedProjectRef.current = true;
      return;
    }

    childRefs.current = [];
    setIsRemountingSlides(true);

    if (keyUpdateTimeoutRef.current) {
      clearTimeout(keyUpdateTimeoutRef.current);
    }
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
    }

    keyUpdateTimeoutRef.current = setTimeout(() => {
      setSlidesKey(`slides-${currentProjectId}-${Date.now()}`);
    }, 0);

    overlayTimeoutRef.current = setTimeout(() => {
      setIsRemountingSlides(false);
    }, MIN_OVERLAY_DURATION);

    return () => {
      if (keyUpdateTimeoutRef.current) {
        clearTimeout(keyUpdateTimeoutRef.current);
      }
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }
    };
  }, [currentProjectId, childRefs]);

  const handleSubmit = () => {
    // In a real application, you'd collect data from all forms here
    submitData().catch(() => {
      // errors are displayed in overlay message; no additional alert needed
    });
  };

  return (
    <PageWrapper>
      {/* All overlays follow consistent conditional rendering pattern with explicit handlers */}
      {isSubmitting && <LoadingOverlay message={message} onCancel={cancel} />}
      {error && <LoadingOverlay message={error.message || 'Submission failed'} isError onRetry={retry} onCancel={clearError} />}
      {showSessionsModal && <ProjectSessionsModal onClose={handleSessionsModalClose} />}
      {explorerOpen && <InAppExplorer onClose={handleExplorerClose} onSelect={handleExplorerSelect} />}

      <div className="relative">

        <div className="absolute top-0 right-0 z-50 flex items-center gap-2">
          {!showSessionsModal && (
            <>
              <Heading3 className="text-sm text-gray-600 font-medium max-w-[220px] truncate whitespace-nowrap mr-2">
                {projects.find(p => p.id === currentProjectId)?.name || 'No project selected'}
              </Heading3>
              <IconToolTipButton
                icon={Layers}
                tooltipText="Open project/session chooser"
                onClick={() => setShowSessionsModal(true)}
                className=""
                aria-label="Change Project"
              />
            </>
          )}
        </div>

        <Heading1> ISA Questionnaire Form </Heading1>
      </div>

      <div className="flex justify-center mb-5">
        {slides.map((slide, index) => (
          <TooltipButton
            key={index}
            tooltipText={`${slide.displayName}`}
            onClick={() => goToPage(index)}
            disabled={isRemountingSlides}
            className={cn(
              "h-2 p-1.5 w-12 mx-1 rounded-full transition-colors duration-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
              index === currentPage
                ? 'bg-blue-500'
                : index < currentPage
                  ? 'bg-green-400'
                  : 'bg-gray-300'
            )}
          />
        ))}
      </div>

      <div className="space-y-6">
        {/* Main content - mark as inert when any overlay is visible */}
        <div 
          aria-hidden={showSessionsModal || explorerOpen} 
          className={showSessionsModal || explorerOpen ? 'pointer-events-none select-none opacity-60' : ''}
        >
          <div
            className="relative overflow-hidden transition-all duration-300 ease-in-out"
            aria-busy={isRemountingSlides}
          >
            <div
              key={slidesKey}
              aria-hidden={isRemountingSlides}
              className={cn(
                "flex transition-transform duration-500 ease-in-out",
                isRemountingSlides ? 'pointer-events-none' : ''
              )}
              style={{ transform: `translateX(${translateXValue}%)` }}
            >
              {slides.map((slide, index) => {
                const SlideComponent = slide;
                // Only fully render the current slide and its immediate neighbors
                const shouldRender = Math.abs(index - currentPage) <= 1;

                return (
                  <div key={index} className='w-full overflow-hidden flex-shrink-0'>
                    <div style={{ height: containerHeight, transition: 'height 0.35s' }}>
                      {shouldRender ? (
                        <SlideComponent
                          ref={el => (childRefs.current[index] = el)}
                          onHeightChange={handleChildHeightChange}
                          currentPage={currentPage}
                          pageIndex={index}
                        />
                      ) : (
                        // Lightweight placeholder keeps layout but avoids mounting heavy components
                        <div ref={el => (childRefs.current[index] = el)} style={{ width: '100%', height: '100%' }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <SlideReloadOverlay isVisible={isRemountingSlides} animationMs={MIN_OVERLAY_DURATION - 100} />
          </div>
        </div>

        <div className="flex items-center justify-center space-x-4 mx-5">
          <TooltipButton
            onClick={handlePrevious}
            tooltipText="Go to previous page"
            disabled={isRemountingSlides}
            className={`text-center text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className='w-30'>&lt; Previous</span>
          </TooltipButton>

          <TooltipButton
            tooltipText="Submit the form"
            onClick={handleSubmit}
            className={cn(
              "py-2 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg",
              {
                "bg-gradient-to-r from-gray-500 to-gray-500 cursor-not-allowed pointer-events-none": !isLastPage(currentPage),
                "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-4 focus:ring-blue-200 hover:shadow-xl": isLastPage(currentPage),
              }
            )}
            disabled={!isLastPage(currentPage) || isSubmitting || isRemountingSlides}
          >
            <span className='w-md'>Submit Form</span>
          </TooltipButton>

          <TooltipButton
            onClick={handleForward}
            tooltipText="Go to next page"
            disabled={isRemountingSlides}
            className={`text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className='w-30'>Next &gt;</span>
          </TooltipButton>
        </div>
      </div>
    </PageWrapper>
  );
};

export default IsaQuestionnaire;
